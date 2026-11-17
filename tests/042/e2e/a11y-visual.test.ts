import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { contrast, enter, hideFrame } from '../../010/helpers/e2e.ts'

// Spec 042 for everyone: axe at WCAG 2.2 AA over "What I'm looking for" on the
// home and each role page, in both themes at the brief's two sizes; the dimmed
// tracks' contrast; and each state in mocks/README.md as a snapshot in the
// pinned container with no pixel tolerance (M1, M2, M3, M5). Baselines come
// from pnpm test:visual tests/042 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1440, height: 900 }],
] as const
const THEMES = ['light', 'dark'] as const

async function open(page: Page, address: string): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** An element's color and the opaque color behind it, layered as the browser paints them. */
const pairOf = (page: Page, selector: string): Promise<{ color: string; back: string }> =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = (node: typeof element) => node.ownerDocument.defaultView?.getComputedStyle(node)
      const parse = (value: string) => {
        const parts = (value.match(/[\d.]+/g) ?? []).map(Number)
        return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts.length > 3 ? (parts[3] ?? 1) : 1 }
      }
      const white = { r: 255, g: 255, b: 255, a: 1 }
      const layers: { r: number; g: number; b: number; a: number }[] = []
      for (let node: typeof element | null = element; node; node = node.parentElement) {
        const color = parse(style(node)?.backgroundColor ?? '')
        if (color.a > 0) layers.push(color)
        if (color.a === 1) break
      }
      let base = layers.length > 0 && layers.at(-1)?.a === 1 ? (layers.pop() ?? white) : white
      while (layers.length > 0) {
        const top = layers.pop() ?? base
        base = {
          r: top.r * top.a + base.r * (1 - top.a),
          g: top.g * top.a + base.g * (1 - top.a),
          b: top.b * top.a + base.b * (1 - top.a),
          a: 1,
        }
      }
      return { color: style(element)?.color ?? '', back: `rgb(${[base.r, base.g, base.b].map(Math.round).join(', ')})` }
    })

for (const theme of THEMES) {
  for (const [size, viewport] of SIZES) {
    for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
      test(`S6.2 SC-004 FR-014 ${address}’s section has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        const results = await new AxeBuilder({ page }).include('#looking-for').withTags(TAGS).analyze()
        expect(
          results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`)),
        ).toEqual([])
      })
    }
  }

  test(`S1.5 S6.2 FR-006 the section’s words, the lit track’s and the dimmed tracks’ meet 4.5:1, ${theme}`, async ({ page }) => {
    await enter(page, { viewport: { width: 1440, height: 900 }, theme })
    await open(page, '/fullstack')
    for (const selector of [
      '#looking-for .ds-eyebrow',
      '#looking-for-lede',
      '#looking-for-role dt',
      '#looking-for-role dd',
      '#looking-for-fullstack .fit__track-name',
      '#looking-for-fullstack .fit__this',
      '#looking-for-fullstack .fit__track-text',
      '#looking-for-mobile .fit__track-name a',
      '#looking-for-mobile .fit__track-text',
      '#looking-for-ai .fit__track-text',
    ]) {
      const { color, back } = await pairOf(page, selector)
      expect(contrast(color, back), `${selector}: ${color} on ${back}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  for (const [size, viewport] of SIZES) {
    for (const [id, address, label] of [
      ['M1', '/', 'home'],
      ['M2', '/fullstack', 'fullstack'],
    ] as const) {
      test(`S6.6 ${id} the section on ${address} matches its baseline, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        await hideFrame(page)
        await expect(page.locator('#looking-for')).toHaveScreenshot(`${id}-section-${label}-${size}-${theme}.png`)
      })
    }
  }

  // P3 is a posting for an AI role, P3R the named role "Staff Android engineer".
  for (const state of ['p3', 'p3r']) {
    test(`S6.6 S5.1 M5 prep’s card in the gallery’s ${state.toUpperCase()} matches its baseline, ${theme}`, async ({ page }) => {
      await enter(page, { viewport: { width: 1440, height: 900 }, theme })
      await open(page, '/design-system')
      await hideFrame(page)
      await expect(page.locator(`#prep-${state} [data-prep-wants]`)).toHaveScreenshot(`M5-prep-card-${state}-${theme}.png`)
    })
  }
}

for (const address of ['/mobile', '/ai']) {
  test(`S6.6 S1.5 M3 ${address}’s tracks, its own lit first, match their baseline, desktop light`, async ({ page }) => {
    await enter(page, { viewport: { width: 1440, height: 900 }, theme: 'light' })
    await open(page, address)
    await hideFrame(page)
    await expect(page.locator('#looking-for .fit__tracks')).toHaveScreenshot(`M3-tracks${address.replace('/', '-')}-desktop-light.png`)
  })
}
