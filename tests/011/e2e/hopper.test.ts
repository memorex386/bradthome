import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

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
    // Amended by spec 034 (D219): the Capital One and Mobile cards hold four claims each.
    expect(await cards.evaluateAll((items) => items.map((item) => item.querySelectorAll('[data-claim]').length))).toEqual([4, 3, 1, 1, 4])
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
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.animationName !== 'ds-jump' && a.effect.target.closest('#hopper')).length`)).toBe(0)
      const moving = await page.evaluate(
        `[...document.querySelectorAll('#hopper *')].filter((el) => !el.closest('.ds-receipts, .ds-marker, .ds-link, [data-rv]') && getComputedStyle(el).animationName !== 'none').length`,
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
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#hopper p')].filter((p) => !p.closest('.ds-receipts') && !p.matches('.ds-eyebrow')).length`,
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

// Amended by spec 026 (D208): each card gathers its receipts in one drawer beside its tags.
test.describe('the receipts', () => {
  // Amended by spec 034 (D219): 15 markers, and the offer card's, number 6, is filled proof linking its two sources.
  test('S3.1 S3.2 FR-005 every claim ends with a marker, 1 to 15, linking a row with the same number in its card’s drawer, every one an ask-me row but the offer card’s', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const markers = page.locator('#hopper [data-claim] > a.ds-marker')
    await expect(markers).toHaveCount(15)
    for (let n = 1; n <= 15; n++) {
      const marker = markers.nth(n - 1)
      await expect(marker).toHaveText(String(n))
      if (n === 6) {
        await expect(marker).toHaveAccessibleName('Receipt 6, proof')
        await expect(marker).not.toHaveClass(/ds-marker--ask/)
        const proof = page.locator((await marker.getAttribute('href')) ?? '')
        await expect(proof).toHaveClass(/ds-receipts__row--proof/)
        await expect(proof.locator('.ds-receipts__title')).toContainText('The offer card, as a customer saw it')
        await expect(proof.locator('.ds-receipts__source')).toHaveText(['yourmileagemayvary.com', 'hts.hopper.com'])
        continue
      }
      await expect(marker).toHaveAccessibleName(`Receipt ${n}, ask Brad`)
      await expect(marker).toHaveClass(/ds-marker--ask/)
      const row = page.locator((await marker.getAttribute('href')) ?? '')
      await expect(row).toHaveClass(/ds-receipts__row--ask/)
      await expect(row).toContainText(`Receipt ${n}:`)
      await expect(row.locator('.ds-receipts__kind')).toHaveText('Ask me')
      // Spec 017 (D153): the drawer's ask link goes to the contact section.
      const drawer = page.locator('#hopper .ds-receipts__drawer').filter({ has: row })
      await expect(drawer.locator('.ds-receipts__foot a')).toHaveText(/^Ask Brad about (it|these)$/)
      await expect(drawer.locator('.ds-receipts__foot a')).toHaveAttribute('href', '#contact')
    }
    await expect(page.locator('#hopper .ds-receipts__drawer')).toHaveCount(6)
    await expect(page.locator('#hopper details[open]')).toHaveCount(0)
  })

  test('S3.4 K1 K3 each card’s drawer follows its claims, beside its tags on a desktop', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .hopper__head, #hopper .hopper__topic')].map((c) => { const claims = [...c.querySelectorAll('[data-claim]')]; const last = claims.at(-1).getBoundingClientRect(); const s = c.querySelector('.ds-receipts__summary').getBoundingClientRect(); const tag = [...c.querySelectorAll('.ds-chip')].at(-1)?.getBoundingClientRect(); return { lb: last.bottom, st: s.top, sl: s.left, tr: tag ? tag.right : null } })`,
      )) as { lb: number; st: number; sl: number; tr: number | null }[]
      expect(boxes).toHaveLength(6)
      for (const box of boxes) {
        expect(box.st, `${viewport.width}`).toBeGreaterThanOrEqual(box.lb)
        if (viewport === DESKTOP && box.tr !== null) expect(box.sl, `${viewport.width}`).toBeGreaterThan(box.tr)
      }
    }
  })

  test('S3.5 R1 R2 a drawer opens by its marker, a click on its control, Enter or Space, and closes again', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const drawer = page.locator('.hopper__topic:has(#hopper-disruption-assistance) .ds-receipts__drawer')
      await page.getByRole('link', { name: 'Receipt 3, ask Brad' }).click()
      await expect(drawer).toHaveAttribute('open', '')
      await expect(page.locator('#receipt-hopper-disruption-assistance-1')).toBeInViewport()
      const summary = drawer.locator('summary')
      await summary.click()
      await expect(drawer).not.toHaveAttribute('open')
      await summary.click()
      await expect(drawer).toHaveAttribute('open', '')
      await summary.focus()
      await page.keyboard.press('Enter')
      await expect(drawer).not.toHaveAttribute('open')
      await page.keyboard.press('Space')
      await expect(drawer).toHaveAttribute('open', '')
    }
  })
})

test.describe('the keyboard and contrast', () => {
  // Amended by spec 026 (D208): Tab goes through a card's markers, then its Receipts control.
  test('S4.1 FR-007 F1 F2 from the hero, Tab goes through each card’s markers, then its drawer’s control, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    // Amended by spec 034 (D219): 15 markers, and number 6, the offer card's, is proof.
    const order: (number | 'summary')[] = [1, 2, 'summary', 3, 4, 5, 6, 'summary', 7, 8, 9, 'summary', 10, 'summary', 11, 'summary', 12, 13, 14, 15, 'summary']
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      // Spec 017 (D152): Brad's address follows the résumé link in the hero, and
      // spec 022's "Ask about Brad" follows it (D189), so Tab starts there.
      await page.locator('.hero [data-chat-open]').focus()
      for (const [i, step] of order.entries()) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        if (step === 'summary') {
          expect(now?.tag, `${theme} ${i}`).toBe('summary')
          expect(now?.label, `${theme} ${i}`).toContain('Receipts')
        } else expect(now?.label, `${theme} ${i}`).toBe(`Receipt ${step}, ${step === 6 ? 'proof' : 'ask Brad'}`)
        expect(now?.outline).toBe('solid')
        expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
        expect(now?.color).toBe(RGB[theme].accent)
        expect(contrast(now?.color ?? '', RGB[theme].band)).toBeGreaterThanOrEqual(3)
        expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
      }
      await page.getByRole('link', { name: 'Receipt 1, ask Brad' }).click()
      await page.locator('.hopper__head .ds-receipts__summary').focus()
      // Amended by spec 030 (D213): each row's "Ask me" is a link to the chat, before the drawer's own.
      for (const label of ['Ask me about receipt 1', 'Ask me about receipt 2', 'Ask Brad about these']) {
        await page.keyboard.press('Tab')
        expect((await focused(page))?.label).toBe(label)
      }
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

  // Amended by spec 026 (D208): the drawers sit on the band, so their text is checked against it.
  test('S4.4 FR-007 every text in the section meets 4.5:1, on the band and in an open drawer, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.evaluate(`document.querySelectorAll('#hopper details').forEach((d) => { d.open = true })`)
      const onBand = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-eyebrow, #hopper h2, #hopper h3, #hopper .ds-card__kicker, #hopper [data-claim], #hopper .ds-chip')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      for (const color of new Set(onBand))
        expect(contrast(color, RGB[theme].band), `${theme} ${color} on the band`).toBeGreaterThanOrEqual(4.5)
      const inDrawer = (await page.evaluate(
        `[...document.querySelectorAll('#hopper .ds-receipts__label, #hopper .ds-receipts__sum, #hopper .ds-receipts__title, #hopper .ds-receipts__kind, #hopper .ds-receipts__source, #hopper .ds-receipts__foot a')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      // Amended by spec 034 (D219): 15 titles, 14 "Ask me" links and the offer card's two sources.
      expect(inDrawer.length).toBe(6 + 6 + 15 + 14 + 2 + 6)
      for (const color of new Set(inDrawer)) expect(contrast(color, RGB[theme].band), `${theme} ${color} on the band`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
