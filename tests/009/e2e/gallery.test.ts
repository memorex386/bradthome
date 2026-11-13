import { expect, type Locator, type Page, test } from '@playwright/test'
import { DESKTOP, enterGallery, focused, GALLERY, NARROW, openGallery, PHONE, RGB, styleOf } from '../helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// The gallery in a browser (S1.3, S1.4, S2.1–S2.6, S3.1–S3.5, S4.1, S4.2,
// S4.5, FR-011, SC-004), against the built site served as Hosting serves it.

// Spec 038's parts as the browser computes them, light theme: the sparkle at rest in dim, the soft disc and the
// landed claim's tint in accent-soft, a linked stat's rule, and in the band its own dim, accent, disc and tint.
const PROOF = {
  dim: 'rgb(133, 139, 150)',
  soft: 'rgb(234, 240, 254)',
  rule: 'rgb(227, 227, 221)',
  clear: 'rgba(0, 0, 0, 0)',
  bandDim: 'rgb(110, 117, 129)',
  bandAccent: 'rgb(142, 168, 255)',
  bandDisc: 'rgba(142, 168, 255, 0.14)',
  bandTint: 'rgba(142, 168, 255, 0.16)',
} as const

/** A sparkle's look: its mark's color, the disc behind it, the ring around the disc, and its tooltip's opacity. */
const lookOf = (page: Page, selector: string): Promise<{ color: string; disc: string; ring: string; tip: string }> =>
  page
    .locator(selector)
    .first()
    .evaluate((ask) => {
      const view = ask.ownerDocument.defaultView
      const disc = view.getComputedStyle(ask, '::before')
      return {
        color: view.getComputedStyle(ask).color,
        disc: disc.backgroundColor,
        ring: disc.outlineStyle === 'none' ? 'none' : `${disc.outlineWidth} ${disc.outlineStyle} ${disc.outlineColor}`,
        tip: view.getComputedStyle(ask, '::after').opacity,
      }
    })

/** Whether each part sits wholly below the one before it. */
async function stacked(...parts: Locator[]): Promise<boolean> {
  const boxes = await Promise.all(parts.map((part) => part.boundingBox()))
  return boxes.every((box, i) => {
    const above = i === 0 ? undefined : boxes[i - 1]
    return box !== null && (i === 0 || (above !== null && above !== undefined && box.y >= above.y + above.height - 0.5))
  })
}

/** The focused element's ring, read where its part draws it: a sparkle rings its disc, a linked stat's link the stat. */
const ringOf = (page: Page): Promise<{ outline: string; width: number; color: string; band: boolean }> =>
  page.evaluate(`(() => {
    const element = document.activeElement
    const ask = element.matches('.ds-claim-ask')
    const style = ask ? getComputedStyle(element, '::before') : getComputedStyle(element.closest('.ds-stat--link') ?? element)
    return { outline: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), color: style.outlineColor, band: ask && element.closest('.ds-band') !== null }
  })()`) as Promise<{ outline: string; width: number; color: string; band: boolean }>

test.describe('the themes and fonts', () => {
  test('S1.3 the page follows the device, and the gallery switch overrides it in either direction', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      expect(await styleOf(page, 'body', 'background-color'), theme).toBe(RGB[theme].bg)
      expect(await styleOf(page, 'body', 'color'), theme).toBe(RGB[theme].ink)
      const other = theme === 'light' ? 'dark' : 'light'
      await page.locator(`label:has(#theme-${other})`).click()
      expect(await styleOf(page, 'body', 'background-color'), `${theme} device, ${other} chosen`).toBe(RGB[other].bg)
      await page.locator('label:has(#theme-device)').click()
      expect(await styleOf(page, 'body', 'background-color'), `${theme} device, device chosen`).toBe(RGB[theme].bg)
    }
  })

  test('S1.4 FR-002 the three fonts load from the site itself, and nothing goes to another host', async ({ page, baseURL }) => {
    const hosts = new Set<string>()
    page.on('request', (request) => hosts.add(new URL(request.url()).host))
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const loaded = (await page.evaluate('[...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/^"|"$/g, ""))')) as string[]
    for (const family of ['Inter Tight-', 'Inter-', 'JetBrains Mono-']) {
      expect(loaded.some((name) => name.startsWith(family)), `${family} in ${loaded.join(', ')}`).toBe(true)
    }
    expect([...hosts]).toEqual([new URL(baseURL ?? '').host])
  })
})

test.describe('the components', () => {
  test("S2.1 FR-003 on a desktop the header shows Brad's name, the sections, the profiles and the résumé", async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const header = page.locator('header.ds-header')
    await expect(header.getByRole('link', { name: 'Brad Thome' })).toHaveAttribute('href', '/')
    await expect(header.getByRole('navigation', { name: 'Sections' })).toBeVisible()
    const elsewhere = header.getByRole('navigation', { name: 'Elsewhere' })
    await expect(elsewhere.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/memorex386')
    await expect(elsewhere.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/brad-thome/')
    await expect(header.getByRole('link', { name: 'Résumé PDF' })).toBeVisible()
    await expect(header.getByLabel('Menu', { exact: true }).first()).toBeHidden()
  })

  // Amended by spec 036 (D227): on a phone GitHub, LinkedIn and the résumé stay in the bar beside the menu, which holds the sections.
  test('S2.1 FR-003 M1 on a phone the header keeps one row, with the profiles beside its menu, which opens to the sections', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      const header = page.locator('header.ds-header')
      await expect(header.getByRole('navigation', { name: 'Sections' })).toBeHidden()
      const name = await header.getByRole('link', { name: 'Brad Thome' }).boundingBox()
      const menu = header.locator('summary[aria-label="Menu"]')
      const button = await menu.boundingBox()
      expect(name && button && Math.abs(name.y + name.height / 2 - (button.y + button.height / 2)), `${viewport.width}`).toBeLessThan(4)
      await menu.click()
      const panel = header.getByRole('navigation', { name: 'Menu' })
      await expect(panel.getByRole('link', { name: 'Tokens' })).toBeVisible()
      await expect(panel.getByRole('link', { name: 'GitHub' })).toHaveCount(0)
      const elsewhere = header.getByRole('navigation', { name: 'Elsewhere' })
      for (const name of ['GitHub', 'LinkedIn']) {
        const icon = await elsewhere.getByRole('link', { name, exact: true }).boundingBox()
        expect(icon && button && Math.abs(icon.y + icon.height / 2 - (button.y + button.height / 2)), `${viewport.width} ${name}`).toBeLessThan(4)
      }
      expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${viewport.width}`).toBe(true)
    }
  })

  test('S2.2 FR-003 the footer reads Brad Thome · Dallas–Fort Worth, the name linking home', async ({ page }) => {
    await openGallery(page)
    const footer = page.locator('footer.ds-footer')
    await expect(footer).toContainText('Brad Thome · Dallas–Fort Worth')
    await expect(footer.getByRole('link', { name: 'Brad Thome' })).toHaveAttribute('href', '/')
  })

  // Amended by spec 038 (D229, D230): the gallery also shows the proof on the card, a linked stat, the sources, a claim
  // and its sparkle, with the sparkle's, the stat's and a source's hover and focus held.
  test('S2.3 FR-004 C1–C6 every component is shown, each in its default, hover and focus states', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    for (const selector of [
      '.ds-button--primary',
      '.ds-button--secondary',
      '.ds-button--accent',
      '.ds-button--icon',
      '.ds-link',
      '.ds-link--quiet',
      '.ds-nav-link',
      '.ds-chip',
      '.ds-chip--tag',
      '.ds-roles',
      '.ds-card',
      '.ds-card--highlight',
      '.ds-card--soft',
      '.ds-card--feature',
      'a.ds-card',
      '.ds-eyebrow',
      '.ds-eyebrow--accent',
      '.ds-stat',
      '.ds-stat--link',
      '.ds-sources',
      '.ds-claim',
      '.ds-claim-ask',
    ]) {
      expect(await page.locator(`main ${selector}`).count(), selector).toBeGreaterThan(0)
    }
    for (const selector of [
      '.ds-button--primary',
      '.ds-button--secondary',
      '.ds-link',
      'a.ds-card',
      '.ds-roles__item',
      '.ds-ask',
      '.ds-claim-ask',
      '.ds-stat--link',
      '.ds-source',
    ]) {
      expect(await page.locator(`main ${selector}.is-hover`).count(), `${selector} hover`).toBeGreaterThan(0)
      expect(await page.locator(`main ${selector}.is-focus`).count(), `${selector} focus`).toBeGreaterThan(0)
    }
    // A hover example takes the real hover's look: the primary button turns the accent color.
    expect(await styleOf(page, 'main .ds-button--primary.is-hover', 'background-color')).toBe(RGB.light.accent)
    await page.locator('main .ds-button--primary:not(.is-hover):not(.is-focus)').first().hover()
    expect(await styleOf(page, 'main .ds-button--primary:not(.is-hover):not(.is-focus)', 'background-color')).toBe(RGB.light.accent)
  })

  test('S2.4 FR-005 C4 the role switch is a navigation region of links, with the current role marked and filled', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const roles = page.getByRole('navigation', { name: 'Hiring for', exact: true })
    await expect(roles.getByRole('link')).toHaveCount(4)
    const current = roles.locator('[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveText('Any role')
    expect(await styleOf(page, '.ds-roles [aria-current="page"]', 'background-color')).toBe(RGB.light.ink)
    expect(await roles.locator('button').count()).toBe(0)
  })

  test('S2.5 C7 the band stays dark in both themes, with its own colors', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      expect(await styleOf(page, '.ds-band', 'background-color'), theme).toBe(RGB[theme].band)
      expect(await styleOf(page, '.ds-band .ds-eyebrow', 'color'), theme).toBe('rgb(142, 168, 255)')
      expect(await styleOf(page, '.ds-band .ds-card__text', 'color'), theme).toBe('rgb(163, 171, 183)')
    }
  })

  test('S2.6 FR-007 A1 Ask about Brad is a link to the contact section (spec 017, D153), fixed in the corner on a desktop and in the flow on a phone', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const asks = page.getByRole('link', { name: 'Ask about Brad' })
    expect(await asks.count()).toBeGreaterThanOrEqual(4)
    for (const ask of await asks.all()) await expect(ask).toHaveAttribute('href', '#contact')
    const floating = page.locator('.ds-ask--floating')
    await expect(floating).toHaveCount(1)
    expect(await styleOf(page, '.ds-ask--floating', 'position')).toBe('fixed')
    const box = await floating.boundingBox()
    expect(box && DESKTOP.width - (box.x + box.width)).toBeLessThan(80)
    expect(box && DESKTOP.height - (box.y + box.height)).toBeLessThan(60)
    await page.mouse.wheel(0, 2000)
    expect(await floating.boundingBox()).toEqual(box)
    await page.setViewportSize(PHONE)
    expect(await styleOf(page, '.ds-ask--floating', 'position')).toBe('static')
  })
})

// Amended by spec 026 (D208): a card's receipts sit in one drawer beside its tags, not in a note beside each claim.
// Amended by spec 038 (D229, D230): the drawers and the numbered markers are retired. A card shows its proof at rest: a
// stat links its source, its other sources list under the claims, and each claim keeps its anchor and ends with the
// sparkle. So S3.1–S3.5 check those parts, in the gallery's "Proof on the card" and its band.
test.describe('the proof on the card', () => {
  test('S3.1 FR-006 on a desktop a card’s sources sit under its claims and before its tags, and a linked stat’s host under its label', async ({
    page,
  }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const card = page.locator('#proof .g-claims')
    expect(
      await stacked(card.locator('.ds-stats'), card.locator('.ds-claims'), card.locator('.ds-sources'), card.locator('.ds-chips')),
    ).toBe(true)
    const stat = card.locator('.ds-stat--link')
    expect(await stacked(stat.locator('dd').first(), stat.locator('dt'), stat.locator('.ds-stat__source'))).toBe(true)
    // The link's box covers the stat, so a tap anywhere on it opens the source.
    await stat.scrollIntoViewIfNeeded()
    const hits = await stat.evaluate((element) => {
      const { left, top, width, height } = element.getBoundingClientRect()
      const points: [number, number][] = [
        [10, 10],
        [width - 10, 10],
        [width / 2, height / 2],
        [10, height - 10],
        [width - 10, height - 10],
      ]
      return points.map(([x, y]) => element.ownerDocument.elementFromPoint(left + x, top + y)?.closest('a')?.className ?? 'nothing')
    })
    expect(hits).toEqual(Array.from({ length: 5 }, () => 'ds-stat__link'))
  })

  test('S3.2 FR-006 on a phone the proof keeps that order, each sparkle stays on its claim’s last word’s line, and nothing scrolls sideways', async ({
    page,
  }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      const card = page.locator('#proof .g-claims')
      expect(await stacked(card.locator('.ds-claims'), card.locator('.ds-sources'), card.locator('.ds-chips')), `${viewport.width}`).toBe(
        true,
      )
      const stat = card.locator('.ds-stat--link')
      expect(await stacked(stat.locator('dd').first(), stat.locator('dt'), stat.locator('.ds-stat__source')), `${viewport.width}`).toBe(
        true,
      )
      // The sparkle keeps to its claim's last word, so the two share a line and it never wraps alone.
      const gaps = await page.locator('main .ds-claim__end').evaluateAll((ends) =>
        ends.map((end) => {
          const last = [...end.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim() !== '')
          const word = end.ownerDocument.createRange()
          word.selectNodeContents(last)
          const text = word.getBoundingClientRect()
          const mark = end.querySelector('.ds-icon').getBoundingClientRect()
          return Math.abs(text.top + text.height / 2 - (mark.top + mark.height / 2))
        }),
      )
      expect(gaps.length, `${viewport.width}`).toBeGreaterThan(0)
      for (const gap of gaps) expect(gap, `${viewport.width}`).toBeLessThan(8)
      expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${viewport.width}`).toBe(true)
    }
  })

  test('S3.3 FR-006 a card’s proof shows at rest, with nothing to open: a linked stat holds its host, and "Sources" names a list of labeled links', async ({
    page,
  }) => {
    await enterGallery(page, { viewport: PHONE, theme: 'light' })
    await openGallery(page)
    await expect(page.locator('#proof details, #proof-band details')).toHaveCount(0)
    const card = page.locator('#proof .g-claims')
    const stat = card.locator('.ds-stat--link')
    await expect(stat).toHaveCount(1)
    await expect(stat.locator('dt')).toHaveText('A stat with a public source')
    const link = stat.locator('a.ds-stat__link')
    await expect(link).toBeVisible()
    await expect(link).toHaveText('github.com')
    await expect(link).toHaveAttribute('href', 'https://github.com/memorex386/bradthome')
    await expect(link.locator('.ds-stat__out')).toHaveCount(1)
    await expect(card.locator('.ds-stat:not(.ds-stat--link) a')).toHaveCount(0)
    // The list is named by its "Sources" label, and each source holds its label and its host. One leaving the site
    // carries the outside-link mark; one on this site goes by its path, with none.
    const sources = card.getByRole('list', { name: 'Sources' }).getByRole('link')
    await expect(sources).toHaveCount(2)
    const [outside, own] = [sources.nth(0), sources.nth(1)]
    for (const each of [outside, own]) await expect(each).toBeVisible()
    await expect(outside.locator('.ds-source__label')).toHaveText('A source on another site')
    await expect(outside.locator('.ds-source__host')).toHaveText('github.com')
    await expect(outside).toHaveAttribute('href', 'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md')
    await expect(outside.locator('.ds-source__out')).toHaveCount(1)
    await expect(own.locator('.ds-source__label')).toHaveText('A source on this site')
    await expect(own.locator('.ds-source__host')).toHaveText('bradthome.com')
    await expect(own).toHaveAttribute('href', '/design-system')
    await expect(own.locator('.ds-source__out')).toHaveCount(0)
    // Hover and focus, held: the stat's rule and a source's edge take the accent, and focus rings each.
    expect(await styleOf(page, '#proof .g-claims .ds-stat--link', 'box-shadow')).toBe(`${PROOF.rule} 0px 0px 0px 1px inset`)
    expect(await styleOf(page, '#proof .ds-stat--link.is-hover', 'box-shadow')).toBe(`${RGB.light.accent} 0px 0px 0px 1px inset`)
    expect(await styleOf(page, '#proof .ds-stat--link.is-hover .ds-stat__link', 'text-decoration-line')).toBe('underline')
    expect(await styleOf(page, '#proof .g-claims .ds-source', 'border-top-color')).toBe(PROOF.rule)
    expect(await styleOf(page, '#proof .ds-source.is-hover', 'border-top-color')).toBe(RGB.light.accent)
    for (const selector of ['#proof .ds-stat--link.is-focus', '#proof .ds-source.is-focus']) {
      expect(await styleOf(page, selector, 'outline-style'), selector).toBe('solid')
      expect(await styleOf(page, selector, 'outline-color'), selector).toBe(RGB.light.accent)
    }
  })

  test('S3.4 FR-006 a link to a claim brings it about 40% down the screen and tints it while it’s the target', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      expect(await styleOf(page, '#g-claim-1', 'background-color'), `${viewport.width} at rest`).toBe(PROOF.clear)
      await page.evaluate(`location.hash = 'g-claim-1'`)
      const claim = page.locator('#g-claim-1')
      await expect(claim, `${viewport.width}`).toBeInViewport()
      const share = await claim.evaluate((element) => element.getBoundingClientRect().top / element.ownerDocument.defaultView.innerHeight)
      expect(share, `${viewport.width}`).toBeGreaterThan(0.3)
      expect(share, `${viewport.width}`).toBeLessThan(0.5)
      expect(await styleOf(page, '#g-claim-1', 'background-color'), `${viewport.width}`).toBe(PROOF.soft)
      expect(await styleOf(page, '#g-claim-2', 'background-color'), `${viewport.width}`).toBe(PROOF.clear)
    }
    // The held state tints the same, and a claim landed on in the band takes the band's tint.
    expect(await styleOf(page, '#proof .ds-claim.is-target', 'background-color')).toBe(PROOF.soft)
    await page.evaluate(`location.hash = 'g-claim-band'`)
    await expect(page.locator('#g-claim-band')).toBeInViewport()
    expect(await styleOf(page, '#g-claim-band', 'background-color')).toBe(PROOF.bandTint)
  })

  test('S3.5 FR-006 a sparkle is named for its claim and asks its words; dim at rest, it takes the accent on a disc with its tooltip on hover and focus, ringed on focus', async ({
    page,
  }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    for (const id of ['g-claim-1', 'g-claim-2', 'g-claim-band']) {
      const claim = page.locator(`#${id}`)
      const ask = claim.locator('a.ds-claim-ask')
      await expect(ask, id).toHaveCount(1)
      await expect(ask, id).toHaveAttribute('href', '#contact')
      await expect(ask, id).toHaveAttribute('data-tip', 'Ask about this')
      await expect(ask, id).toHaveAccessibleName(/^Ask about this: \S/)
      // The sparkle has no words of its own, so the claim reads as its words alone, which its question quotes.
      const words = ((await claim.textContent()) ?? '').replace(/\s+/g, ' ').trim()
      await expect(ask, id).toHaveAttribute('data-chat-ask', `Tell me more about this: “${words}”`)
    }
    await expect(page.locator('#g-claim-1 .ds-claim-ask')).toHaveAccessibleName('Ask about this: A first claim')
    const held = { color: RGB.light.accent, disc: PROOF.soft }
    expect(await lookOf(page, '#g-claim-1 .ds-claim-ask')).toEqual({ color: PROOF.dim, disc: PROOF.clear, ring: 'none', tip: '0' })
    expect(await lookOf(page, '#proof .ds-claim-ask.is-hover')).toEqual({ ...held, ring: 'none', tip: '1' })
    expect(await lookOf(page, '#proof .ds-claim-ask.is-focus')).toEqual({ ...held, ring: `2px solid ${RGB.light.accent}`, tip: '1' })
    // In the band, the band's own dim at rest, and its accent on hover and focus.
    expect(await lookOf(page, '#g-claim-band .ds-claim-ask')).toEqual({ color: PROOF.bandDim, disc: PROOF.clear, ring: 'none', tip: '0' })
    expect(await lookOf(page, '#proof-band .ds-claim-ask.is-hover')).toEqual({
      color: PROOF.bandAccent,
      disc: PROOF.bandDisc,
      ring: 'none',
      tip: '1',
    })
    expect(await lookOf(page, '#proof-band .ds-claim-ask.is-focus')).toEqual({
      color: PROOF.bandAccent,
      disc: PROOF.bandDisc,
      ring: `2px solid ${PROOF.bandAccent}`,
      tip: '1',
    })
    // A real keyboard focus and a real hover look as the held ones do.
    await page.locator('#g-claim-1 .ds-claim-ask').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#g-claim-2 .ds-claim-ask')).toBeFocused()
    expect(await lookOf(page, '#g-claim-2 .ds-claim-ask')).toEqual({ ...held, ring: `2px solid ${RGB.light.accent}`, tip: '1' })
    await page.locator('#g-claim-1 .ds-claim-ask').hover()
    expect(await lookOf(page, '#g-claim-1 .ds-claim-ask')).toEqual({ ...held, ring: 'none', tip: '1' })
  })
})

test.describe('the keyboard, motion and the page', () => {
  // Amended by spec 038 (D229): the gallery's "Receipts" section is "Proof", as its nav says.
  test('S4.1 F1–F3 Tab goes to the skip link, then the header in order, each with a ring', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const expected = [
      'Skip to the gallery',
      'Brad Thome',
      'Tokens',
      'Components',
      'Proof',
      'Previews',
      'Contact',
      'Chrome',
      'GitHub',
      'LinkedIn',
      'Résumé PDF',
    ]
    for (const label of expected) {
      await page.keyboard.press('Tab')
      const now = await focused(page)
      expect(now?.label, label).toBe(label)
      expect(now?.outline, label).toBe('solid')
    }
    await expect(page.getByRole('link', { name: 'Skip to the gallery' })).toHaveAttribute('href', '#main')
  })

  // Amended by spec 038 (D229, D230): a sparkle rings its disc and a linked stat's link rings the whole stat, so the ring
  // is read where each draws it. In the band a sparkle's ring is the band's accent, as its color is there.
  test('S4.1 FR-011 SC-004 every element Tab reaches shows a 2-pixel ring in the accent color', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      const missing: string[] = []
      const reached = new Set<string>()
      let stops = 0
      for (let i = 0; i < 200; i++) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        if (now === null) break
        stops += 1
        const ring = await ringOf(page)
        const accent = ring.band ? PROOF.bandAccent : RGB[theme].accent
        reached.add(`${ring.band ? 'band ' : ''}${(await page.evaluate('document.activeElement.className')) as string}`)
        if (ring.outline !== 'solid' || ring.width < 2 || ring.color !== accent)
          missing.push(`${now.tag} "${now.label}": ${ring.outline} ${ring.width}px ${ring.color}`)
        if (
          await page.evaluate(
            'document.activeElement?.closest("footer") !== null && document.activeElement?.closest("footer") !== undefined',
          )
        )
          break
      }
      expect(stops, theme).toBeGreaterThan(40)
      // The proof's sparkles, the band's among them, its linked stats and its sources were among the stops.
      expect([...reached], theme).toEqual(expect.arrayContaining(['ds-claim-ask', 'band ds-claim-ask', 'ds-stat__link', 'ds-source']))
      expect(missing, theme).toEqual([])
    }
  })

  // Amended by spec 038 (D229, D230): the receipts' summaries and markers are gone. A source is a 44 px control, a linked
  // stat is its link's target, and a sparkle's target is 44 px square, where a marker's was 24.
  test('FR-011 buttons, role links, sources and linked stats are at least 44 pixels tall, a sparkle’s target 44 square, and a stat’s link 24', async ({
    page,
  }) => {
    await enterGallery(page, { viewport: PHONE, theme: 'light' })
    await openGallery(page)
    const short = (await page.evaluate(`(() => {
      const found = []
      for (const element of document.querySelectorAll('.ds-button, .ds-roles__item, .ds-source, .ds-stat--link')) {
        const box = element.getBoundingClientRect()
        if (box.height > 0 && box.height < 44) found.push(element.className + ': ' + box.height)
      }
      const asks = document.querySelectorAll('a.ds-claim-ask')
      if (asks.length === 0) found.push('no sparkle')
      for (const element of asks) {
        const box = element.getBoundingClientRect()
        if (box.height < 44 || box.width < 44) found.push(element.className + ': ' + box.width + '×' + box.height)
      }
      for (const element of document.querySelectorAll('a.ds-stat__link')) {
        const box = element.getBoundingClientRect()
        if (box.height < 24) found.push(element.className + ': ' + box.height)
      }
      return found
    })()`)) as string[]
    expect(short).toEqual([])
  })

  test('S4.2 FR-012 with reduced motion nothing has a transition; without it, hover fades in at most 240 ms and nothing loops', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' }, 'reduce')
    await openGallery(page)
    const moving = '[...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).transitionDuration.split(",").some((d) => Number.parseFloat(d) > 0)).length'
    expect(await page.evaluate(moving)).toBe(0)
    expect(await page.evaluate('document.getAnimations().length')).toBe(0)
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await openGallery(page)
    expect(await page.evaluate(moving)).toBeGreaterThan(0)
    // Spec 028's MA-17: the copied check draws over 300 ms, a draw, not a hover fade (D211).
    const longest = (await page.evaluate(
      'Math.max(...[...document.querySelectorAll("body *")].filter((el) => !el.matches(".ds-email__icons path")).flatMap((el) => getComputedStyle(el).transitionDuration.split(",").map((d) => Number.parseFloat(d) * (d.trim().endsWith("ms") ? 1 : 1000))))',
    )) as number
    expect(longest).toBeLessThanOrEqual(240)
    await page.locator('main .ds-button--primary').first().hover()
    const loops = await page.evaluate('document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations === Infinity).length')
    expect(loops).toBe(0)
  })

  test('S4.5 FR-013 the gallery runs no script but the previews script, requests no other host, has no inline style and logs no error', async ({ page, baseURL }) => {
    const errors: string[] = []
    const hosts = new Set<string>()
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => hosts.add(new URL(request.url()).host))
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: PHONE, theme })
      await openGallery(page)
      expect(await onlyPreviewScript(page), theme).toBe(true)
      expect(await page.locator('[style]').count(), theme).toBe(0)
    }
    expect([...hosts]).toEqual([new URL(baseURL ?? '').host])
    expect(errors).toEqual([])
  })

  test('S5.2 FR-009 the gallery carries noindex', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  })
})
