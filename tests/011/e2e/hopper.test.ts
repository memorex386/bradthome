import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'

// Spec 011's Hopper story in the browser: its order, its words against the
// claims, its receipts, the keyboard, contrast and layout shift. Playwright's
// config asks for reduced motion by default.

interface Claim {
  subject: string
  topic?: string
  text: string
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
/** The claims' paragraphs, less their markers. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('#hopper [data-claim]')].map((p) => { const copy = p.cloneNode(true); copy.querySelector('.ds-marker')?.remove(); return copy.textContent.replace(/\\s+/g, ' ').trim() })`,
  ) as Promise<string[]>

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
    expect(await cards.evaluateAll((items) => items.map((item) => item.querySelectorAll('[data-claim]').length))).toEqual([3, 3, 1, 1, 2])
    for (const [index, title] of TOPICS.entries()) {
      const card = cards.nth(index)
      const tags = card.getByRole('list', { name: `${title}, tags` })
      await expect(tags).toBeVisible()
      const order = await card.evaluate((item) => {
        const claims = item.querySelector('.ds-claims')
        const tags = item.querySelector('.ds-chips')
        return claims && tags ? claims.compareDocumentPosition(tags) & 4 : 0
      })
      expect(order, title).toBe(4)
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

  test('S1.4 SC-004 FR-006 the section has no motion of its own, no script, and the page shifts nothing as it loads', async ({ page }) => {
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
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.effect.target.closest('#hopper')).length`)).toBe(0)
      const moving = await page.evaluate(
        `[...document.querySelectorAll('#hopper *')].filter((el) => !el.closest('.ds-receipt, .ds-marker, .ds-link') && getComputedStyle(el).animationName !== 'none').length`,
      )
      expect(moving).toBe(0)
      expect(await page.locator('script').count()).toBe(0)
      expect(await page.locator('#hopper [style]').count()).toBe(0)
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
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#hopper p')].filter((p) => !p.closest('.ds-receipt') && !p.matches('.ds-eyebrow')).length`,
    )) as number
    expect(paragraphs).toBe(SHOWN.length)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const [id, claim] of Object.entries(CLAIMS)) if (claim.subject !== 'hopper') expect(body, id).not.toContain(claim.text)
  })

  test('S2.3 each card shows its tags', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator('#hopper .hopper__topics > li').first().locator('.ds-chip')).toHaveText([
      'Purchase UI',
      'Payment integration',
      'Terraform',
      'GCP',
      'Redis',
    ])
    await expect(page.locator('#hopper .ds-chip')).toHaveCount(5 + 4 + 2 + 3 + 4)
  })
})

test.describe('the receipts', () => {
  test('S3.1 S3.2 FR-005 every claim ends with an outlined marker, 1 to 12, and has an ask-me note with the same number', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const markers = page.locator('#hopper [data-claim] > a.ds-marker')
    await expect(markers).toHaveCount(12)
    for (let n = 1; n <= 12; n++) {
      const marker = markers.nth(n - 1)
      await expect(marker).toHaveText(String(n))
      await expect(marker).toHaveAccessibleName(`Receipt ${n}, ask Brad`)
      await expect(marker).toHaveClass(/ds-marker--ask/)
      const target = (await marker.getAttribute('href')) ?? ''
      const note = page.locator(`${target}`)
      const receipt = page.locator('#hopper details.ds-receipt').filter({ has: note })
      await expect(receipt).toHaveClass(/ds-receipt--ask/)
      await expect(receipt.locator('summary')).toContainText(`Receipt ${n}:`)
      await expect(receipt.locator('.ds-receipt__kind')).toHaveText('Ask me')
      await expect(note.locator('p')).toHaveText('No public link yet.')
      // The note is closed, so its link is in the page but not yet in the accessibility tree.
      await expect(note.locator('a')).toHaveText('Ask Brad about it')
      await expect(note.locator('a')).toHaveAttribute('href', 'mailto:brad@bradthome.com')
    }
    await expect(page.locator('#hopper details.ds-receipt')).toHaveCount(12)
    await expect(page.locator('#hopper details[open]')).toHaveCount(0)
  })

  test('S3.4 K1 K3 on a desktop each note sits in the margin beside its claim, and on a phone under it', async ({ page }) => {
    for (const [viewport, beside] of [
      [DESKTOP, true],
      [PHONE, false],
    ] as const) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-claim')].map((c) => { const t = c.querySelector('[data-claim]').getBoundingClientRect(); const n = c.querySelector('.ds-receipt').getBoundingClientRect(); return { tr: t.right, tt: t.top, tb: t.bottom, nl: n.left, nt: n.top } })`,
      )) as { tr: number; tt: number; tb: number; nl: number; nt: number }[]
      expect(boxes).toHaveLength(12)
      for (const box of boxes) {
        if (beside) {
          expect(box.nl).toBeGreaterThan(box.tr)
          expect(Math.abs(box.nt - box.tt)).toBeLessThan(2)
        } else expect(box.nt).toBeGreaterThanOrEqual(box.tb)
      }
    }
  })

  test('S3.5 R1 R2 a note opens by its marker, a click on its summary, Enter or Space, and closes again', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const receipt = page.locator('#receipt-hopper-disruption-assistance-1')
      await page.getByRole('link', { name: 'Receipt 3, ask Brad' }).click()
      await expect(receipt).toHaveAttribute('open', '')
      await expect(receipt.getByRole('link', { name: 'Ask Brad about it' })).toBeInViewport()
      const summary = receipt.locator('summary')
      await summary.click()
      await expect(receipt).not.toHaveAttribute('open')
      await summary.click()
      await expect(receipt).toHaveAttribute('open', '')
      await summary.focus()
      await page.keyboard.press('Enter')
      await expect(receipt).not.toHaveAttribute('open')
      await page.keyboard.press('Space')
      await expect(receipt).toHaveAttribute('open', '')
    }
  })
})

test.describe('the keyboard and contrast', () => {
  test('S4.1 FR-007 F1 F2 from the hero, Tab goes marker, then note, claim by claim, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.getByRole('link', { name: 'Read the résumé' }).focus()
      for (let n = 1; n <= 12; n++) {
        for (const kind of ['marker', 'summary'] as const) {
          await page.keyboard.press('Tab')
          const now = await focused(page)
          if (kind === 'marker') expect(now?.label, `${theme} ${n}`).toBe(`Receipt ${n}, ask Brad`)
          else {
            expect(now?.tag, `${theme} ${n}`).toBe('summary')
            expect(now?.label, `${theme} ${n}`).toContain(`Receipt ${n}:`)
          }
          expect(now?.outline).toBe('solid')
          expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
          expect(now?.color).toBe(RGB[theme].accent)
          expect(contrast(now?.color ?? '', RGB[theme].band)).toBeGreaterThanOrEqual(3)
          expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
        }
      }
      await page.getByRole('link', { name: 'Receipt 1, ask Brad' }).click()
      await page.locator('#receipt-hopper-role-and-dates-1 summary').focus()
      await page.keyboard.press('Tab')
      expect((await focused(page))?.label).toBe('Ask Brad about it')
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

  test('S4.4 FR-007 every text in the section meets 4.5:1, on the band and on an open note, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.evaluate(`document.querySelectorAll('#hopper details').forEach((d) => { d.open = true })`)
      const onBand = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-eyebrow, #hopper h2, #hopper h3, #hopper .ds-card__kicker, #hopper [data-claim], #hopper .ds-chip')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      for (const color of new Set(onBand))
        expect(contrast(color, RGB[theme].band), `${theme} ${color} on the band`).toBeGreaterThanOrEqual(4.5)
      const onNote = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-receipt')].flatMap((r) => { const bg = getComputedStyle(r).backgroundColor; return [...r.querySelectorAll('.ds-receipt__title, .ds-receipt__kind, .ds-receipt__body p, .ds-receipt__body a')].map((el) => [getComputedStyle(el).color, bg]) })`,
      )) as [string, string][]
      expect(onNote.length).toBe(48)
      for (const [color, bg] of onNote) expect(contrast(color, bg), `${theme} ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
