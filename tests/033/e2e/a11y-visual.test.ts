import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, hideFrame, HOME, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { RECEIPT_TITLES } from '../../../apps/site/src/components/home/side.ts'
import { CARD, repoCounts, steadyRecords } from '../helpers/e2e.ts'

// Spec 033's card for everyone: axe at WCAG 2.2 AA with the target-size rule
// on, its contrast, the keyboard's path and ring, no motion and no layout
// shift (S5.1–S5.3, S5.5), and its snapshots in the pinned container with no
// pixel tolerance, the counts and date held steady (S5.4). Baselines come
// from pnpm test:visual tests/033 --update. Since spec 038 (D229, D230) the
// card has no drawer to open: its sources and its claims' sparkles show at
// rest.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const ON_CARD = ['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4']
/** The card's listed sources' labels, in order (spec 038's FR-003). */
const LISTED = [
  'The design system',
  'Each feature starts as a spec Brad approves',
  "A release's written record",
  'The latest eval run, case by case',
]

/** The focused sparkle's ring, which it draws around its disc, its ::before, rather than its own box (spec 038, D230). */
const discRing = (page: Page): Promise<{ outline: string; width: number; color: string }> =>
  page.locator(':focus').evaluate((element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element, '::before')
    return { outline: style?.outlineStyle ?? '', width: Number.parseFloat(style?.outlineWidth ?? '0'), color: style?.outlineColor ?? '' }
  })

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    // Amended by spec 038 (D229): the drawer is gone, so the card has one state, its sources and sparkles at rest.
    test(`S5.1 SC-005 FR-008 the card, its sources and sparkles at rest, has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({
      page,
    }) => {
      await enter(page, { viewport, theme })
      await openHome(page)
      await expect(page.locator(`${CARD} .ds-sources`)).toHaveCount(1)
      await expect(page.locator(`${CARD} .ds-claim-ask`)).toHaveCount(ON_CARD.length)
      const results = await new AxeBuilder({ page }).include(CARD).withTags(TAGS).analyze()
      expect(results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))).toEqual([])
      expect(
        results.passes
          .map((rule) => rule.id)
          .concat(
            results.inapplicable.map((rule) => rule.id),
            results.incomplete.map((rule) => rule.id),
          ),
      ).toContain('target-size')
    })

    // Amended by spec 038 (D229): the card shows its sources at rest, so M1 is the card's one state; M2, the open
    // drawer, is gone with the drawer.
    test(`S5.4 M1 the card, its sources and sparkles at rest, matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await openHome(page)
      await hideFrame(page)
      await steadyRecords(page)
      await page.locator(CARD).scrollIntoViewIfNeeded()
      await page.mouse.move(0, 0)
      await expect(page.locator(CARD)).toHaveScreenshot(`card-${size}-${theme}.png`)
    })
  }

  // Amended by spec 038 (D229): the sources' label, labels and hosts take the drawer's words' place.
  test(`S5.2 FR-008 the counts, their labels and the date line meet 4.5:1, with the card's other words, ${theme}`, async ({ page }) => {
    for (const [, viewport] of SIZES) {
      await enter(page, { viewport, theme })
      await openHome(page)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = ['h3', '.ds-card__kicker', '.side__count-value', '.side__count-label', '.side__counted', '.side__counted time', '[data-claim] p', '.side__links > a', '.ds-sources__label', '.ds-source__label', '.ds-source__host'].map((s) => '${CARD} ' + s).join(', ')
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(15)
      expect(pairs.filter(([, , what]) => /ds-source/.test(what))).toHaveLength(1 + 2 * LISTED.length)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Amended by spec 038 (D229, D230): the markers and the drawer's summary are gone. Tab goes from the counts through
  // each claim's sparkle, which draws its 2-pixel accent ring around its disc, then each listed source, then the link.
  test(`S5.3 FR-008 Tab goes through the counts, the sparkles, the sources and the link, each with the 2-pixel accent ring, ${theme}`, async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme })
    await openHome(page)
    const counts = repoCounts()
    await page.locator('#side-sudoku-world .side__links > a').last().focus()
    const expected = [
      { label: `${counts.decisions} decisions`, disc: false },
      { label: `${counts.specs} specs`, disc: false },
      { label: `${counts.releases} releases`, disc: false },
      ...ON_CARD.map((id) => ({ label: `Ask about this: ${RECEIPT_TITLES[id] ?? ''}`, disc: true })),
      ...LISTED.map((label) => ({ label, disc: false })),
      { label: 'Read the source on GitHub', disc: false },
    ]
    for (const step of expected) {
      await page.keyboard.press('Tab')
      const now = await focused(page)
      expect(now?.tag, `${theme} ${step.label}`).toBe('a')
      expect(squashed(now?.label), theme).toContain(step.label)
      const ring = step.disc ? await discRing(page) : now
      expect(ring?.outline, `${theme} ${step.label}`).toBe('solid')
      expect(ring?.width ?? 0).toBeGreaterThanOrEqual(2)
      expect(ring?.color).toBe(RGB[theme].accent)
      expect(contrast(ring?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
    }
  })
}

const squashed = (text: string | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim()

test('S5.5 SC-005 FR-008 the card has no motion of its own, and the page shifts nothing as it loads and scrolls to it', async ({ page }) => {
  for (const [, viewport] of SIZES) {
    await page.goto('about:blank')
    await enter(page, { viewport, theme: 'light' }, 'no-preference')
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await page.goto(HOME)
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await page.waitForTimeout(3000)
    expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
    // Spec 028's reveal settles each card once, and is done by now (D211); the card adds nothing of its own.
    expect(await page.evaluate(`document.getAnimations().filter((a) => a.effect.target.closest('${CARD}')).length`)).toBe(0)
    expect(await page.locator(`${CARD} [style]:not([data-rv], [data-rv] *)`).count()).toBe(0)
  }
})
