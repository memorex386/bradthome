import { expect, type Page, test } from '@playwright/test'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, freezeAt, NARROW, PHONE, timings } from '../../010/helpers/e2e.ts'

// Spec 025 in the browser: the Brisk sequence read from document.getAnimations(),
// the proof tiles, T2's positions, hover, the deep-link settle and the switch
// under the hero. Playwright asks for reduced motion by default; the motion
// tests ask for no-preference.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const WIDE = { width: 1440, height: 900 } as const
const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The running animations with their easing, for S1.1–S1.5. */
async function table(
  page: Page,
): Promise<{ target: string; name: string; delay: number; duration: number; easing: string; pseudo: string | null }[]> {
  return page.evaluate(`document.getAnimations().map((a) => ({
    target: a.effect.target.className, name: a.animationName, pseudo: a.effect.pseudoElement,
    delay: Math.round(a.effect.getTiming().delay), duration: Math.round(Number(a.effect.getTiming().duration)), easing: a.effect.getKeyframes()[0].easing,
  }))`) as never
}

const running = (page: Page): Promise<number> =>
  page.evaluate('document.getAnimations().filter((a) => a.playState === "running").length') as Promise<number>

test.describe('the Brisk sequence (MA-1–MA-4)', () => {
  test('S1.1 S1.2 S1.3 S1.4 S1.5 SC-001 FR-001 each animation matches the motion table within 10 ms and the last ends at 1,600 ms', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    const all = await table(page)
    const find = (cls: string, name: string, pseudo: string | null = null) => {
      const found = all.filter((a) => a.target.split(' ').includes(cls) && a.name === name && a.pseudo === pseudo)
      expect(found.length, `${cls} ${name}`).toBeGreaterThan(0)
      return found
    }
    const near = (actual: number, expected: number, what: string) =>
      expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(10)
    for (const [index, start] of [0, 300, 600].entries()) {
      for (const [name, easing] of [
        ['hero-word-rise', SPRING],
        ['hero-word-ink', EASE],
      ] as const) {
        const [word] = find(`hero__word--${index + 1}`, name)
        near(word?.delay ?? -1, start, name)
        near(word?.duration ?? -1, 520, name)
        expect(word?.easing, name).toBe(easing)
      }
    }
    const dots = all.filter((a) => a.name === 'hero-dot').map((a) => a.delay)
    expect(dots).toHaveLength(3)
    for (const [i, start] of [286, 586, 886].entries()) near(dots[i] ?? -1, start, `dot ${i + 1}`)
    for (const [group, start] of [
      [1, 140],
      [2, 440],
      [3, 740],
    ] as const) {
      for (const [name, pseudo] of [
        ['hero-row', null],
        ['hero-sheen', '::before'],
      ] as const) {
        for (const row of find(`hero__row--${group}`, name, pseudo)) {
          near(row.delay, start, `${name} ${group}`)
          near(row.duration, 700, `${name} ${group}`)
        }
      }
    }
    for (const [cls, start] of [
      ['hero__line--1', 760],
      ['hero__line--2', 880],
      ['hero__actions', 1000],
      ['hero__proof', 1060],
      ['hero__roles', 1060],
    ] as const) {
      const [rise] = find(cls, 'hero-rise')
      near(rise?.delay ?? -1, start, cls)
      near(rise?.duration ?? -1, 540, cls)
    }
    const end = Math.max(...all.map((a) => a.delay + a.duration))
    near(end, 1600, 'the last end')
    expect(end).toBeLessThanOrEqual(1600)
    await page.waitForTimeout(1800)
    expect(await running(page)).toBe(0)
    for (const timing of await timings(page)) expect(timing.iterations).toBe(1)
  })

  test('S1.6 FR-002 in the first frame every part is opaque, unblurred and visible, and every word meets 4.5:1', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme }, 'no-preference')
      await page.goto('/')
      expect(await freezeAt(page, 0), theme).toBeGreaterThan(0)
      const parts =
        (await page.evaluate(`[...document.querySelectorAll('.hero__word, .hero__dot, .hero__line, .hero__actions a, .hero__roles a, .hero__tile, .hero__row')].map((el) => {
        const s = getComputedStyle(el); return { text: el.textContent.trim().slice(0, 16), opacity: s.opacity, filter: s.filter, visibility: s.visibility } })`)) as {
          text: string
        }[]
      expect(parts.length).toBeGreaterThan(18)
      for (const part of parts) expect(part, `${theme} ${part.text}`).toMatchObject({ opacity: '1', filter: 'none', visibility: 'visible' })
      const colors = (await page.evaluate(
        `[...document.querySelectorAll('.hero__word')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      for (const color of colors) expect(contrast(color, RGB[theme].bg), `${theme} ${color}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('S1.7 with reduced motion nothing animates or transitions, and the hero is at rest on the home and a role page', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await open(page, '/')
      expect(await page.evaluate('document.getAnimations().length'), theme).toBe(0)
      const moving = await page.evaluate(
        `[...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' || s.transitionDuration.split(',').some((d) => Number.parseFloat(d) > 0) }).length`,
      )
      expect(moving, theme).toBe(0)
      expect(await page.evaluate(`[...document.querySelectorAll('.hero__word')].map((el) => getComputedStyle(el).color)`)).toEqual([
        RGB[theme].ink,
        RGB[theme].ink,
        RGB[theme].ink,
      ])
      await open(page, '/ai')
      await expect(page.locator('.hero__word--3')).toHaveCSS('color', RGB[theme].accent)
      await expect(page.locator('.hero__row--lit')).toHaveCount(1)
    }
  })

  test('S1.8 SC-005 the sequence shifts nothing on any page: layout shifts add up to 0', async ({ page }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    for (const viewport of [DESKTOP, PHONE]) {
      for (const address of PAGES) {
        await enter(page, { viewport, theme: 'light' }, 'no-preference')
        await page.goto(address)
        await page.waitForTimeout(1900)
        expect(await page.evaluate('window.__shift'), `${address} ${viewport.width}`).toBe(0)
      }
    }
  })
})

test.describe('the proof tiles (T1)', () => {
  test('S2.1 S2.3 the Highlights list holds three tiles linking their Hopper topics, on every page', async ({ page }) => {
    for (const address of PAGES) {
      await open(page, address)
      const list = page.getByRole('list', { name: 'Highlights' })
      await expect(list.getByRole('link')).toHaveText([
        "5more partners adopted the reusable capability from Capital One Travel's purchase flow",
        '10+partner products, including Frontier and Spirit',
        "Foundingengineer on Hopper's Fintech AI team",
      ])
      const hrefs = await list.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
      expect(hrefs, address).toEqual(['#hopper-disruption-assistance', '#hopper-disruption-assistance', '#hopper-fintech-ai'])
      for (const href of new Set(hrefs)) await expect(page.locator(href ?? ''), `${address} ${href}`).toHaveCount(1)
    }
    await open(page, '/')
    await page.getByRole('link', { name: /^Founding/ }).click()
    await expect(page).toHaveURL(/#hopper-fintech-ai$/)
    await expect(page.locator('#hopper-fintech-ai')).toBeInViewport()
  })

  test('S2.4 one row of three on a desktop, stacked rows on a phone, and nothing scrolls sideways', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const wide = await page.locator('.hero__tile').evaluateAll((tiles) => tiles.map((t) => Math.round(t.getBoundingClientRect().top)))
    expect(new Set(wide).size).toBe(1)
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const boxes = await page.locator('.hero__tile').evaluateAll((tiles) => tiles.map((t) => t.getBoundingClientRect().toJSON()))
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].top, `${viewport.width}`).toBeGreaterThanOrEqual(boxes[i - 1].bottom)
      const figure = await page.locator('.hero__figure').first().boundingBox()
      const label = await page.locator('.hero__tile-label').first().boundingBox()
      expect(label?.x ?? 0, 'the figure sits beside its label').toBeGreaterThan((figure?.x ?? 0) + (figure?.width ?? 0))
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
    }
  })

  test('S2.5 each tile is 44 px tall or more, its label meets 4.5:1 and its figure 3:1, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: PHONE, theme })
      await open(page, '/')
      for (const tile of await page.locator('.hero__tile').all()) expect((await tile.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
      const colors = (await page.evaluate(`[...document.querySelectorAll('.hero__tile')].map((el) => [
        getComputedStyle(el).backgroundColor,
        getComputedStyle(el.querySelector('.hero__tile-label')).color,
        getComputedStyle(el.querySelector('.hero__figure')).color,
      ])`)) as string[][]
      for (const [bg, label, figure] of colors) {
        expect(contrast(label ?? '', bg ?? ''), theme).toBeGreaterThanOrEqual(4.5)
        expect(contrast(figure ?? '', bg ?? ''), theme).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

test.describe('the tighter first screen (T2)', () => {
  test('S3.2 SC-002 the tiles end inside the first screen and the Hopper band shows at 1440 × 900, on every page, in both themes', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      for (const address of PAGES) {
        for (const [viewport, limit] of [
          [DESKTOP, 800],
          [PHONE, 844],
        ] as const) {
          await enter(page, { viewport, theme })
          await open(page, address)
          const bottom = (await page.evaluate(`document.querySelector('.hero__proof').getBoundingClientRect().bottom + scrollY`)) as number
          expect(bottom, `${theme} ${address} ${viewport.width}`).toBeLessThanOrEqual(limit)
        }
        await enter(page, { viewport: WIDE, theme })
        await open(page, address)
        const band = (await page.evaluate(`document.querySelector('#hopper').getBoundingClientRect().top + scrollY`)) as number
        expect(band, `${theme} ${address} 1440`).toBeLessThan(900)
      }
    }
  })
})

test.describe('the hero answers the pointer (MA-5, MA-19)', () => {
  test('S4.1 FR-006 a word lights its rows, and a row lights its word, moving in 3 px', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(1700)
    await page.locator('.hero__word--2').hover()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero__word--2')).toHaveCSS('color', RGB.light.accent)
    for (const row of await page.locator('.hero__row--2').all()) {
      await expect(row).toHaveCSS('border-color', RGB.light.accent)
      await expect(row).toHaveCSS('translate', '-3px')
    }
    await expect(page.locator('.hero__row--1').first()).not.toHaveCSS('border-color', RGB.light.accent)
    await page.locator('.hero__row--3').hover()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero__word--3')).toHaveCSS('color', RGB.light.accent)
    await expect(page.locator('.hero__word--2')).toHaveCSS('color', RGB.light.ink)
  })

  test('S4.2 the Hopper button and a tile lift 1 px on hover, the arrow moves 3 px, and a press scales to 0.98', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(1700)
    const button = page.locator('.hero__actions .ds-button')
    await button.hover()
    await page.waitForTimeout(300)
    await expect(button).toHaveCSS('translate', '0px -1px')
    await expect(button.locator('svg')).toHaveCSS('translate', '3px')
    await page.mouse.down()
    await page.waitForTimeout(250)
    await expect(button).toHaveCSS('scale', '0.98')
    await page.mouse.up()
    const tile = page.locator('.hero__tile').first()
    await tile.hover()
    await page.waitForTimeout(300)
    await expect(tile).toHaveCSS('translate', '0px -1px')
    await expect(tile).toHaveCSS('border-color', RGB.light.accent)
  })

  test('S4.3 with reduced motion hover changes color at once and moves nothing', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await page.locator('.hero__word--1').hover()
    await expect(page.locator('.hero__word--1')).toHaveCSS('color', RGB.light.accent)
    await expect(page.locator('.hero__row--1').first()).toHaveCSS('translate', 'none')
    await page.locator('.hero__actions .ds-button').hover()
    await expect(page.locator('.hero__actions .ds-button')).toHaveCSS('translate', 'none')
  })
})

test.describe('a deep link lands on a settled page (T8)', () => {
  test('S5.1 SC-003 a page loaded with a hash has no animation running 300 ms after the module runs', async ({ page }) => {
    for (const address of ['/#hopper', '/#experience', '/#contact', '/mobile#hopper']) {
      await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
      await page.goto(address, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(300)
      expect(await running(page), address).toBe(0)
      expect(
        await page.evaluate(`document.querySelector('.hero').getAnimations({ subtree: true }).every((a) => a.playState === 'finished')`),
        address,
      ).toBe(true)
    }
  })

  test('S5.2 a page reloaded scrolled down, with no hash, finishes the hero once it has loaded', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(1700)
    await page.evaluate('scrollTo(0, 1600)')
    await page.reload({ waitUntil: 'load' })
    await expect.poll(() => page.evaluate('scrollY')).toBeGreaterThan(0)
    await page.waitForTimeout(100)
    expect(await running(page)).toBe(0)
  })

  test('S5.3 going back from /#hopper to the top replays nothing in the hero', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/#hopper')
    await page.waitForTimeout(300)
    await page.evaluate('history.pushState(null, "", "/"); scrollTo(0, 0)')
    await page.goto('/#experience')
    await page.goBack()
    await page.evaluate('scrollTo(0, 0)')
    await page.waitForTimeout(100)
    expect(await running(page)).toBe(0)
  })

  test('S5.4 S7.3 with no script the hero, tiles and switch are complete, and every link in them has a target', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: DESKTOP })
    const page = await context.newPage()
    for (const address of PAGES) {
      await page.goto(address)
      await expect(page.locator('.hero__word')).toHaveCount(3)
      await expect(page.locator('.hero__tile')).toHaveCount(3)
      await expect(page.locator('.hero__roles a')).toHaveCount(3)
      for (const href of await page.locator('.hero a').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
        if (href.startsWith('#')) expect(await page.locator(href).count(), `${address} ${href}`).toBe(1)
        else expect(href, address).toMatch(/^(\/|mailto:)/)
      }
    }
    await context.close()
  })
})

test.describe('the switch under the hero (T10)', () => {
  test('S6.1 SC-004 the page opens on the header and the hero, and the switch sits under the tiles, under the buttons', async ({
    page,
  }) => {
    for (const address of PAGES) {
      await open(page, address)
      const order = await page.evaluate(
        `[...document.body.children].filter((e) => !['SCRIPT', 'DIALOG', 'A'].includes(e.tagName)).map((e) => e.tagName.toLowerCase())`,
      )
      expect((order as string[]).slice(0, 2), address).toEqual(['header', 'main'])
      const nav = page.getByRole('navigation', { name: 'Tailor this page' })
      await expect(nav, address).toHaveCount(1)
      await expect(nav.getByRole('link')).toHaveText(['Mobile', 'Full-stack', 'Applied AI'])
      await expect(nav).toContainText('Tailor this page:')
      const actions = await page.locator('.hero__actions').boundingBox()
      const roles = await page.locator('.hero__roles').boundingBox()
      const tiles = await page.locator('.hero__proof').boundingBox()
      expect(tiles?.y ?? 0).toBeGreaterThanOrEqual((actions?.y ?? 0) + (actions?.height ?? 0))
      expect(roles?.y ?? 0).toBeGreaterThanOrEqual((tiles?.y ?? 0) + (tiles?.height ?? 0))
    }
  })

  test('S6.2 S6.5 a role page marks its own link, the home marks none, and the links move between pages', async ({ page }) => {
    await open(page, '/')
    const nav = page.getByRole('navigation', { name: 'Tailor this page' })
    await expect(nav.locator('[aria-current]')).toHaveCount(0)
    await nav.getByRole('link', { name: 'Applied AI' }).click()
    await expect(page).toHaveURL(/\/ai$/)
    await expect(nav.getByRole('link', { name: 'Applied AI' })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.hero .ds-eyebrow')).toContainText('Senior engineer · Applied AI')
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await open(page, '/mobile')
    const [current, other] = (await page.evaluate(
      `['Mobile', 'Full-stack'].map((name) => getComputedStyle([...document.querySelectorAll('.hero__roles a')].find((a) => a.textContent.trim() === name)).fontWeight)`,
    )) as string[]
    expect(Number(current)).toBeGreaterThan(Number(other))
    // S6.2: the line is muted but for the current role, which takes the accent.
    await expect(nav.getByRole('link', { name: 'Full-stack' })).toHaveCSS('color', 'rgb(91, 98, 112)')
    await expect(nav.getByRole('link', { name: 'Mobile' })).toHaveCSS('color', RGB.light.accent)
  })

  test('S6.3 no page shows the mono address', async ({ page }) => {
    for (const address of [...PAGES, '/design-system']) {
      await open(page, address)
      expect(await page.locator('.ds-roles__url').count(), address).toBe(0)
      expect(
        await page.locator('.ds-roles').evaluateAll((navs) => navs.filter((nav) => /bradthome\.com/.test(nav.textContent ?? '')).length),
        address,
      ).toBe(0)
    }
  })

  test("S6.4 Tab moves from the last tile through the switch's links, each 44 px tall with a 2 px accent ring", async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await open(page, '/')
      await page.locator('.hero__tile').last().focus()
      for (const label of ['Mobile', 'Full-stack', 'Applied AI']) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        expect(now?.label, `${theme} ${label}`).toBe(label)
        expect(now?.outline).toBe('solid')
        expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
        expect(now?.color).toBe(RGB[theme].accent)
      }
      for (const link of await page.locator('.hero__roles a').all())
        expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('S6.6 on a phone the switch wraps if it must and the page never scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      for (const address of PAGES) {
        await enter(page, { viewport, theme: 'light' })
        await open(page, address)
        expect(
          await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
          `${address} ${viewport.width}`,
        ).toBe(true)
      }
    }
  })
})

test('SC-006 the one module grows by at most 512 bytes for the settle step', async ({ page }) => {
  await open(page, '/')
  const src = await page.locator('script[src]').first().getAttribute('src')
  const size = (await (await page.request.get(src ?? '')).body()).length
  // The module on main before this slice, v2.2.0's build: 8,326 bytes.
  expect(size - 8326).toBeLessThanOrEqual(512)
})
