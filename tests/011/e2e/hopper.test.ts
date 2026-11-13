import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import { RECEIPT_TITLES } from '../../../apps/site/src/components/home/hopper.ts'
import { RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { claimsIn, landing, openOnClaim, RETIRED, ringOf } from '../helpers/e2e.ts'

// Spec 011's Hopper story in the browser: its order, its words against the
// claims, each claim's anchor and sparkle and the Capital One card's sources
// (spec 038), the keyboard, contrast and layout shift. Playwright's config
// asks for reduced motion by default.

interface Claim {
  subject: string
  topic?: string
  text: string
  evidence: string[]
}

const CLAIMS = parse(readFileSync(path.resolve(import.meta.dirname, '../../../apps/site/content/claims.yaml'), 'utf8')) as Record<
  string,
  Claim
>
const HOPPER = Object.entries(CLAIMS).filter(([, claim]) => claim.subject === 'hopper')
const SHOWN = HOPPER.filter(([, claim]) => claim.topic !== 'Stack')

const TOPICS = [
  'Capital One Travel: Disruption Assistance',
  'The partner platform',
  'Fintech AI',
  'Human-approved agent workflow',
  'RemoteUI and WebViews',
]

const SECTION = '#hopper'
/** The claims' paragraphs. Amended by spec 038 (D230): a claim's sparkle holds no words, so a claim reads as its text alone. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(`[...document.querySelectorAll('#hopper [data-claim]')].map((p) => p.textContent.replace(/\\s+/g, ' ').trim())`) as Promise<
    string[]
  >

/** The band's accent, which a sparkle in the band takes on focus, in both themes (spec 038). */
const BAND_ACCENT = 'rgb(142, 168, 255)'
/** The Capital One card's tint: the band's accent at 8% over the band (S1.2). */
const tinted = (band: string): string => {
  const [r = 0, g = 0, b = 0] = (band.match(/\d+/g) ?? []).map(Number)
  return `rgb(${[r, g, b].map((value, index) => Math.round(value + (([142, 168, 255][index] ?? 0) - value) * 0.08)).join(', ')})`
}

test.describe('what the section shows', () => {
  test('S1.1 FR-001 K1 on a desktop the eyebrow, heading, role and five topics read in order under the hero', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const section = page.locator(SECTION)
    await expect(section).toHaveClass(/ds-band/)
    expect(await page.evaluate(`document.querySelector('.hero').compareDocumentPosition(document.querySelector('#hopper')) & 4`)).toBe(4)
    const eyebrow = section.locator('.ds-eyebrow')
    await expect(eyebrow).toHaveText('Experience · Hopper · Apr 2022 – Oct 2026')
    await expect(eyebrow).toHaveCSS('text-transform', 'uppercase')
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Fintech products for Hopper and its partners')
    await expect(section.locator('.hopper__head [data-claim]')).toHaveCount(2)
    expect((await claimTexts(page)).slice(0, 2)).toEqual(['Senior Software Engineer, remote.', 'Founding engineer on the Fintech AI team.'])
    const list = section.getByRole('list', { name: 'The work, by topic' })
    await expect(list.locator(':scope > li')).toHaveCount(5)
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(TOPICS)
  })

  test("S1.2 each card shows its claims, then its tags as a list named for the topic, and the first is tinted, as the board's first card is", async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const cards = page.locator('#hopper .hopper__topics > li')
    // Amended by spec 034 (D219): the Capital One and Mobile cards hold four claims each.
    expect(await cards.evaluateAll((items) => items.map((item) => item.querySelectorAll('[data-claim]').length))).toEqual([4, 3, 1, 1, 4])
    for (const [index, title] of TOPICS.entries()) {
      const card = cards.nth(index)
      const tags = card.getByRole('list', { name: `${title}, tags` })
      await expect(tags).toBeVisible()
      // Amended by spec 038 (D229): the tags follow the card directly, after its sources where it lists any (the
      // Capital One card's), or after its claims, and end the card.
      const parts = await card.evaluate((item) => [...item.children].map((child) => child.classList[0]))
      expect(parts, title).toEqual(['ds-card__kicker', 'ds-subheading', 'ds-claims', ...(index === 0 ? ['ds-sources'] : []), 'ds-chips'])
    }
    await expect(cards.first()).toHaveClass(/ds-card--highlight/)
    await expect(cards.first()).toHaveCSS('background-color', 'rgba(142, 168, 255, 0.08)')
    await expect(cards.nth(1)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })

  test('S1.3 K3 K4 on a phone, and at 320, the parts stack in the same order and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
      await expect(page.locator('#hopper').getByRole('heading', { level: 3 })).toHaveText(TOPICS)
      const tops = await page.locator('#hopper [data-claim]').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
    }
  })

  test('S1.4 SC-004 FR-006 the section has no motion of its own, no script but the previews script, and the page shifts nothing as it loads', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      // A fresh document each time: a second goto to the same #hopper URL would only scroll.
      await page.goto('about:blank')
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await page.addInitScript(
        `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
      )
      await page.goto(`${HOME}#hopper`)
      await page.waitForTimeout(3000)
      expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
      // Spec 027's MA-16 underlines a deep link's heading once; that's the frame's motion, not the section's (D209).
      // Spec 028's reveal plays once as a deep link lands, and is done by now; its blocks carry their timing as
      // --rv-* custom properties, set at run time, never in the markup (D211).
      expect(
        await page.evaluate(
          `document.getAnimations().filter((a) => a.animationName !== 'ds-jump' && a.effect.target.closest('#hopper')).length`,
        ),
      ).toBe(0)
      // Amended by spec 038 (D229): the markers and drawers are gone, and the sparkles never pop (S6.1), so only the
      // frame's links and the reveal's blocks are left out.
      const moving = await page.evaluate(
        `[...document.querySelectorAll('#hopper *')].filter((el) => !el.closest('.ds-link, [data-rv]') && getComputedStyle(el).animationName !== 'none').length`,
      )
      expect(moving).toBe(0)
      expect(await onlyPreviewScript(page)).toBe(true)
      expect(await page.locator('#hopper [style]:not([data-rv], [data-rv] *)').count()).toBe(0)
    }
  })
})

test.describe('the words', () => {
  test('S2.1 S2.2 SC-001 SC-002 every paragraph is a Hopper claim as written, each shows once, and no other subject shows', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const texts = await claimTexts(page)
    expect(texts).toEqual(SHOWN.map(([, claim]) => claim.text))
    const ids = await page.locator('#hopper [data-claim]').evaluateAll((items) => items.map((item) => item.getAttribute('data-claim')))
    expect(ids).toEqual(SHOWN.map(([id]) => id))
    // Amended by spec 038 (D229): the Capital One card's "Sources" label is the one paragraph that isn't a claim or the eyebrow.
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#hopper p')].filter((p) => !p.matches('.ds-eyebrow, .ds-sources__label')).length`,
    )) as number
    expect(paragraphs).toBe(SHOWN.length)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const [id, claim] of Object.entries(CLAIMS)) if (claim.subject !== 'hopper') expect(body, id).not.toContain(claim.text)
  })

  test('S2.3 each card shows its tags', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    // Amended by spec 034 (D219): the Capital One card's tags follow its LinkedIn wording, and the Mobile card names Compose and SwiftUI.
    await expect(page.locator('#hopper .hopper__topics > li').first().locator('.ds-chip')).toHaveText([
      'React',
      'Payment flow',
      'Terraform',
      'GCP',
      'Redis',
      'Feature flags',
    ])
    await expect(page.locator('#hopper .ds-chip')).toHaveCount(6 + 4 + 2 + 3 + 6)
  })
})

// Amended by spec 038 (D229, D230): the numbered markers and spec 026's drawers are gone. Each claim carries the anchor
// its receipt had and ends with the sparkle that asks about it, and the Capital One card lists its two sources.
test.describe('the claims and their proof', () => {
  test('S3.1 S3.2 FR-005 every claim carries its anchor and ends with one sparkle, named by its title, whose question quotes it and which goes to Contact, and nothing is numbered or says “Ask me”', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const claims = await claimsIn(page, SECTION)
    expect(claims.map((claim) => claim.claim)).toEqual(SHOWN.map(([id]) => id))
    for (const [id, claim] of SHOWN) {
      expect(
        claims.find((entry) => entry.claim === id),
        id,
      ).toEqual({
        id: `receipt-${id}`,
        claim: id,
        text: claim.text,
        asks: 1,
        ends: true,
        // Spec 017 (D153): with no script, the sparkle goes to the contact section.
        href: '#contact',
        question: questionOf(claim.text),
        tip: 'Ask about this',
        name: `Ask about this: ${RECEIPT_TITLES[id]}`,
        words: '',
      })
      await expect(page.locator(`#receipt-${id} .ds-claim-ask`)).toHaveAccessibleName(`Ask about this: ${RECEIPT_TITLES[id]}`)
    }
    await expect(page.locator('#receipt-hopper-disruption-assistance-4 .ds-claim-ask')).toHaveAccessibleName(
      'Ask about this: The offer card, as a customer saw it',
    )
    // Each anchor is its claim's alone, and each question is its own.
    const anchors = await page.locator(`${SECTION} [id^="receipt-"]`).evaluateAll((items) => items.map((item) => item.matches('.ds-claim')))
    expect(anchors).toEqual(SHOWN.map(() => true))
    expect(new Set(claims.map((claim) => claim.question)).size).toBe(SHOWN.length)
    await expect(page.locator(`${SECTION} .ds-marker, ${SECTION} .ds-receipts, ${SECTION} details`)).toHaveCount(0)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const words of RETIRED) expect(body).not.toContain(words)
  })

  test('S3.3 FR-005 the offer card’s two links, the Hopper story’s only ones, show under the Capital One card’s claims as its sources, each by its label and host', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator(`${SECTION} .ds-sources`)).toHaveCount(1)
    const card = page.locator('#hopper .hopper__topics > li').first()
    await expect(card.locator('.ds-sources__label')).toHaveText('Sources')
    const links = card.getByRole('list', { name: 'Sources' }).locator('a.ds-source')
    await expect(links.locator('.ds-source__label')).toHaveText([
      'The offer card, in a 2024 travel-blog post',
      'Hopper Technology Solutions, March 2026',
    ])
    await expect(links.locator('.ds-source__host')).toHaveText(['yourmileagemayvary.com', 'hts.hopper.com'])
    expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(
      CLAIMS['hopper-disruption-assistance-4']?.evidence,
    )
    // Both leave the site, so each carries the outside-link mark.
    await expect(links.locator('.ds-source__out')).toHaveCount(2)
  })

  // Amended by spec 038 (D229): there's no drawer to place; a card's sources, where it lists any, then its tags follow its claims.
  test('S3.4 K1 K3 each card’s sources, then its tags, follow its claims, on a desktop and a phone', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .hopper__topic')].map((c) => { const last = [...c.querySelectorAll('[data-claim]')].at(-1).getBoundingClientRect(); const sources = c.querySelector('.ds-sources')?.getBoundingClientRect(); const tags = c.querySelector('.ds-chips').getBoundingClientRect(); return { lb: last.bottom, st: sources ? sources.top : null, sb: sources ? sources.bottom : null, tt: tags.top } })`,
      )) as { lb: number; st: number | null; sb: number | null; tt: number }[]
      expect(boxes.map((box) => box.st !== null)).toEqual([true, false, false, false, false])
      for (const box of boxes) {
        if (box.st !== null) expect(box.st, `${viewport.width}`).toBeGreaterThanOrEqual(box.lb)
        expect(box.tt, `${viewport.width}`).toBeGreaterThanOrEqual(box.sb ?? box.lb)
      }
    }
  })

  // Amended by spec 038 (D229): the drawers are gone, so nothing opens or closes. A link to a claim, as a source in a
  // chat answer is, lands on the claim, which tints while it's the target.
  test('S3.5 R1 R2 a link to a claim’s anchor lands on it, in view and tinted, on a desktop and a phone', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.goto('about:blank')
      await enter(page, { viewport, theme: 'light' })
      await openOnClaim(page, 'hopper-disruption-assistance-1')
      await expect(page.locator('#receipt-hopper-disruption-assistance-1')).toBeInViewport()
      expect(await landing(page, 'hopper-disruption-assistance-1')).toMatchObject({ target: true, background: 'rgba(142, 168, 255, 0.16)' })
    }
  })
})

test.describe('the keyboard and contrast', () => {
  // Amended by spec 038 (D229, D230): Tab goes through each claim's sparkle, and through the Capital One card's two
  // sources after its claims. A sparkle draws its ring around its disc, in the band's accent; a source's is the page's.
  test('S4.1 FR-007 F1 F2 from the hero, Tab goes through each claim’s sparkle and the Capital One card’s sources, each with a 2-pixel ring at 3:1', async ({
    page,
  }) => {
    const sparkles = SHOWN.map(([id]) => ({ label: `Ask about this: ${RECEIPT_TITLES[id]}`, on: 'disc' }))
    const sources = ['The offer card, in a 2024 travel-blog post', 'Hopper Technology Solutions, March 2026'].map((label) => ({
      label,
      on: 'self',
    }))
    const order = [...sparkles.slice(0, 6), ...sources, ...sparkles.slice(6)]
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      // Spec 017 (D152): Brad's address follows the résumé link in the hero, and
      // spec 022's "Ask about Brad" follows it (D189), so Tab starts there.
      await page.locator('.hero [data-chat-open]').focus()
      for (const [i, step] of order.entries()) {
        await page.keyboard.press('Tab')
        const now = await ringOf(page)
        expect(now?.tag, `${theme} ${i}`).toBe('a')
        expect(now?.label, `${theme} ${i}`).toContain(step.label)
        expect(now?.on, `${theme} ${i}`).toBe(step.on)
        expect(now?.outline).toBe('solid')
        expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
        expect(contrast(now?.color ?? '', RGB[theme].band)).toBeGreaterThanOrEqual(3)
        if (step.on === 'disc') {
          expect(now?.color).toBe(BAND_ACCENT)
          expect(contrast(now?.color ?? '', tinted(RGB[theme].band))).toBeGreaterThanOrEqual(3)
        } else {
          expect(now?.color).toBe(RGB[theme].accent)
          expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
        }
      }
      // Spec 038 (D229) retires the drawers, so there's no drawer's own links to Tab through after its control.
    }
  })

  test("S4.2 FR-001 the hero's button and the header's link reach the section, its heading in view", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator('.ds-header').getByRole('link', { name: 'Hopper' })).toHaveAttribute('href', '#hopper')
    await page.getByRole('link', { name: 'See the work at Hopper' }).click()
    await expect(page).toHaveURL(/#hopper$/)
    await expect(page.locator('#hopper').getByRole('heading', { name: 'Fintech products for Hopper and its partners' })).toBeInViewport()
  })

  // Amended by spec 038 (D229): the drawers are gone; the Capital One card's sources sit on its tint, on the band.
  test('S4.4 FR-007 every text in the section meets 4.5:1 on the band, its sources on the Capital One card’s tint, in both themes', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const onBand = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-eyebrow, #hopper h2, #hopper h3, #hopper .ds-card__kicker, #hopper [data-claim], #hopper .ds-chip')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      for (const color of new Set(onBand))
        expect(contrast(color, RGB[theme].band), `${theme} ${color} on the band`).toBeGreaterThanOrEqual(4.5)
      const sources = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-sources__label, #hopper .ds-source__label, #hopper .ds-source__host')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      // The label, and each source's label and host.
      expect(sources.length).toBe(1 + 2 + 2)
      for (const color of new Set(sources)) {
        expect(contrast(color, RGB[theme].band), `${theme} ${color} on the band`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(color, tinted(RGB[theme].band)), `${theme} ${color} on the card's tint`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
