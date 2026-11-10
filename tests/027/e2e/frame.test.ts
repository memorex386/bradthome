import { expect, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, NARROW, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 027 in the browser: the sticky header, its band colors and section
// marks, a jump's underline, the previews' and menu's motion, the phone's
// role switch, the footer, and what the frame must never do (D209, D210).
// Playwright asks for reduced motion by default; the motion tests ask for
// no-preference.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const WIDE = { width: 1440, height: 900 } as const
const SECTIONS = [
  ['hopper', 'Hopper'],
  ['experience', 'Experience'],
  ['side', 'On the side'],
  ['contact', 'Contact'],
] as const
const BAND_INK = 'rgb(232, 234, 237)'
const BAND = { light: 'rgb(14, 17, 22)', dark: 'rgb(7, 8, 11)' } as const
const REPO = 'https://github.com/memorex386/bradthome'
// The one module before this slice (spec 026's build), and Brad's Gate 1 allowance for the header's script.
const MODULE_BEFORE = 8510
const ALLOWANCE = 1280

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** Scrolls the page at once and lets the observers and styles settle. */
async function at(page: Page, y: number): Promise<void> {
  await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
  await page.evaluate('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 350))))')
}

/** Scrolls so a section's top sits at a share of the screen's height. */
async function sectionAt(page: Page, id: string, share: number): Promise<void> {
  const y = (await page.evaluate(
    `document.getElementById('${id}').getBoundingClientRect().top + scrollY - innerHeight * ${share}`,
  )) as number
  await at(page, Math.max(0, Math.round(y)))
}

interface HeaderState {
  top: number
  box: number
  stuck: boolean
  band: boolean
  opacity: number
  bar: number
  name: string
  marked: string[]
}

const header = (page: Page): Promise<HeaderState> =>
  page.evaluate(`(() => {
    const h = document.querySelector('header.ds-header')
    const before = getComputedStyle(h, '::before')
    const box = h.getBoundingClientRect()
    const scale = before.scale === 'none' ? 1 : Number(before.scale.split(' ')[1] ?? before.scale)
    return {
      top: box.top,
      box: box.height,
      stuck: h.hasAttribute('data-stuck'),
      band: h.hasAttribute('data-band'),
      opacity: Number(before.opacity),
      bar: Math.round(box.height * scale * 10) / 10,
      name: getComputedStyle(h.querySelector('.ds-header__name')).scale,
      marked: [...h.querySelectorAll('a[aria-current]')].map((a) => a.getAttribute('aria-current') + ' ' + a.textContent.trim()),
    }
  })()`) as Promise<HeaderState>

const headerAnimations = (page: Page): Promise<{ name: string; scroll: boolean }[]> =>
  page.evaluate(
    `document.getAnimations().filter((a) => a.effect?.target?.closest?.('header.ds-header')).map((a) => ({ name: a.animationName ?? a.transitionProperty, scroll: a.timeline?.constructor.name === 'ScrollTimeline' }))`,
  ) as Promise<{ name: string; scroll: boolean }[]>

test.describe('the header stays with the reader (T4, MA-6)', () => {
  test('S1.1 FR-001 on every page, at every size and depth, the header sits at the top', async ({ page }) => {
    for (const viewport of [DESKTOP, WIDE, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of PAGES) {
        await open(page, address)
        for (const y of [0, 1200, 4000, 99_999]) {
          await at(page, y)
          expect((await header(page)).top, `${address} ${viewport.width} ${y}`).toBe(0)
        }
      }
    }
  })

  test('S1.2 S1.3 S1.4 SC-001 with motion allowed the scroll drives the bar from 72 to 60 px, its fade and the name over 0–64 px', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const names = (await headerAnimations(page)).filter((a) => a.scroll).map((a) => a.name)
    expect(names.sort()).toEqual(['ds-header-bar', 'ds-header-name', 'ds-header-row'])
    await at(page, 0)
    let state = await header(page)
    expect([state.box, state.bar, state.opacity, state.name, state.stuck]).toEqual([72, 72, 0, '1', false])
    await at(page, 8)
    state = await header(page)
    expect(state.opacity).toBeCloseTo(0.125, 2)
    expect(state.bar).toBeCloseTo(70.5, 0)
    await at(page, 64)
    state = await header(page)
    expect([state.box, state.bar, state.opacity, state.name, state.stuck]).toEqual([72, 60, 1, '0.94', true])
    await at(page, 2000)
    expect((await header(page)).bar).toBe(60)
  })

  test('S1.3 MA-6 under reduced motion the bar switches at 8 px at once, nothing scrubs, and the name keeps its size', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    expect(await headerAnimations(page)).toEqual([])
    await at(page, 0)
    expect(await header(page)).toMatchObject({ opacity: 0, bar: 72, stuck: false })
    await at(page, 12)
    expect(await header(page)).toMatchObject({ opacity: 1, bar: 60, stuck: true, name: 'none', box: 72 })
    expect(await page.evaluate(`getComputedStyle(document.querySelector('header.ds-header'), '::before').transitionDuration`)).toBe('0s')
  })

  test('S1.4 S8.3 SC-004 FR-007 loading and scrolling the page shifts nothing, with motion allowed and reduced', async ({ page }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    for (const motion of ['no-preference', 'reduce'] as const) {
      for (const viewport of [DESKTOP, PHONE]) {
        await enter(page, { viewport, theme: 'light' }, motion)
        await open(page, '/')
        await page.waitForTimeout(1900)
        for (const y of [4, 8, 30, 64, 400, 1500, 3000]) await at(page, y)
        expect(await page.evaluate('window.__shift'), `${motion} ${viewport.width}`).toBe(0)
      }
    }
  })

  test('S1.5 a deep link loads with the header condensed and its section marked', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/#experience')
      await at(page, await page.evaluate('scrollY'))
      const state = await header(page)
      expect(state.stuck).toBe(true)
      expect(state.marked).toContain('location Experience')
    }
  })

  test('S1.6 FR-002 with no script the header stays at the top on its bar, with no section marked', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/')
    await page.evaluate('scrollTo(0, 3000)').catch(() => undefined)
    await page.mouse.wheel(0, 3000)
    await page.waitForTimeout(400)
    const state = await header(page)
    expect(state.top).toBe(0)
    expect(state.opacity).toBe(1)
    expect(state.marked).toEqual([])
    await context.close()
  })
})

test.describe('the header over the band (MA-7)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`S2.1 S2.3 the header takes the band's colors while Hopper is under it, and returns after, ${theme}`, async ({ page }) => {
      for (const viewport of [DESKTOP, PHONE]) {
        await enter(page, { viewport, theme })
        await open(page, '/')
        await sectionAt(page, 'hopper', -0.5)
        let state = await header(page)
        expect(state.band, `${viewport.width}`).toBe(true)
        const ink = (await page.evaluate(`getComputedStyle(document.querySelector('.ds-header__name')).color`)) as string
        expect(ink).toBe(BAND_INK)
        expect(contrast(ink, BAND[theme])).toBeGreaterThanOrEqual(4.5)
        await sectionAt(page, 'experience', 0)
        state = await header(page)
        expect(state.band, `${viewport.width}`).toBe(false)
        expect(await page.evaluate(`getComputedStyle(document.querySelector('.ds-header__name')).color`)).not.toBe(BAND_INK)
      }
    })
  }

  test('S2.2 the colors change over 240 ms with motion allowed and at once under reduced motion', async ({ page }) => {
    for (const [motion, duration] of [
      ['no-preference', '0.24s'],
      ['reduce', '0s'],
    ] as const) {
      await enter(page, { viewport: DESKTOP, theme: 'light' }, motion)
      await open(page, '/')
      const durations = (await page.evaluate(
        `getComputedStyle(document.querySelector('header.ds-header .ds-header__name')).transitionDuration`,
      )) as string
      expect(durations.split(', ')[0], motion).toBe(duration)
    }
  })
})

test.describe('the header marks the section being read (MA-8)', () => {
  test('S3.1 S3.4 SC-002 FR-001 each section is marked in turn, in the bar and the menu, none above Hopper, and Contact at the end', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of ['/', '/ai']) {
        await open(page, address)
        await at(page, 0)
        expect((await header(page)).marked, `${address} top`).toEqual([])
        for (const [id, label] of SECTIONS.slice(0, 3)) {
          await sectionAt(page, id, 0.3)
          expect((await header(page)).marked, `${address} ${viewport.width} ${id}`).toEqual([`location ${label}`, `location ${label}`])
        }
        await at(page, 99_999)
        expect((await header(page)).marked, `${address} end`).toEqual(['location Contact', 'location Contact'])
        await sectionAt(page, 'hopper', 0.45)
        expect((await header(page)).marked, `${address} back above Hopper`).toEqual([])
      }
    }
  })

  test('S3.2 on a desktop a 2 px rule sits under the marked link, as wide as it, sliding in 320 ms only with motion allowed', async ({
    page,
  }) => {
    for (const [motion, duration] of [
      ['no-preference', '0.32s'],
      ['reduce', '0s'],
    ] as const) {
      await enter(page, { viewport: DESKTOP, theme: 'light' }, motion)
      await open(page, '/')
      for (const [id, label] of SECTIONS.slice(0, 3)) {
        await sectionAt(page, id, 0.3)
        await page.waitForTimeout(motion === 'reduce' ? 0 : 400)
        const [rule, link] = (await page.evaluate(`(() => {
          const r = document.querySelector('.ds-header__rule').getBoundingClientRect()
          const l = [...document.querySelectorAll('.ds-header__sections a')].find((a) => a.textContent.trim() === ${JSON.stringify(label)}).getBoundingClientRect()
          return [{ x: r.x, w: r.width, h: r.height, y: r.y }, { x: l.x, w: l.width, bottom: l.bottom }]
        })()`)) as [{ x: number; w: number; h: number; y: number }, { x: number; w: number; bottom: number }]
        expect(rule.h, id).toBe(2)
        expect(Math.abs(rule.x - link.x), id).toBeLessThanOrEqual(1)
        expect(Math.abs(rule.w - link.w), id).toBeLessThanOrEqual(1)
        expect(rule.y, id).toBeGreaterThanOrEqual(link.bottom)
      }
      const transition = (await page.evaluate(`getComputedStyle(document.querySelector('.ds-header__rule')).transitionDuration`)) as string
      expect(transition.split(', ')[0], motion).toBe(duration)
    }
  })

  test('S3.3 with the phone menu open, the marked section is underlined', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await sectionAt(page, 'experience', 0.3)
    await page.locator('.ds-header__menu > summary').click()
    const link = page.locator('.ds-header__menu-panel a', { hasText: 'Experience' })
    await expect(link).toHaveAttribute('aria-current', 'location')
    expect(await link.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline')
  })
})

test.describe('a jump says where it landed (MA-16)', () => {
  test('S4.1 FR-003 with motion allowed a header link scrolls smoothly, lands below the header, and underlines the heading over 1,100 ms', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1700)
    expect(await page.evaluate(`getComputedStyle(document.documentElement).scrollBehavior`)).toBe('smooth')
    await page.locator('.ds-header__sections a', { hasText: 'Experience' }).click()
    await page.waitForTimeout(80)
    const underway = (await page.evaluate('scrollY')) as number
    const jump = (await page.evaluate(
      `document.getAnimations().filter((a) => a.animationName === 'ds-jump').map((a) => { const t = a.effect.getTiming(); return { target: a.effect.target.id, pseudo: a.effect.pseudoElement, delay: t.delay, duration: t.duration } })`,
    )) as unknown[]
    expect(jump).toEqual([{ target: 'experience-heading', pseudo: '::after', delay: 350, duration: 1100 }])
    await expect
      .poll(() => page.evaluate(`Math.round(document.getElementById('experience').getBoundingClientRect().top)`), { timeout: 3000 })
      .toBe(60)
    expect(underway).toBeLessThan((await page.evaluate('scrollY')) as number)
  })

  test('S4.2 S8.6 under reduced motion the jump is instant, lands below the header, and nothing underlines', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    for (const [id, label] of SECTIONS) {
      await page.locator('.ds-header__sections a', { hasText: label }).click()
      const top = (await page.evaluate(`document.getElementById('${id}').getBoundingClientRect().top`)) as number
      if (id !== 'contact') expect(Math.round(top), id).toBe(60)
      else expect(top, id).toBeGreaterThanOrEqual(60)
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.animationName === 'ds-jump').length`)).toBe(0)
    }
  })

  test('S8.6 a receipt row followed from its marker is never behind the header', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      await page.locator('a.ds-marker[href="#receipt-bookshout-2"]').click()
      const top = (await page.evaluate(`document.getElementById('receipt-bookshout-2').getBoundingClientRect().top`)) as number
      expect(top, `${viewport.width}`).toBeGreaterThanOrEqual(72)
    }
  })
})

test.describe('overlays open from where they were asked for (MA-18, MA-21)', () => {
  const transitions = (page: Page, selector: string): Promise<{ property: string; duration: number }[]> =>
    page.evaluate(
      `document.getAnimations().filter((a) => a.effect?.target?.matches?.(${JSON.stringify(selector)}) && a.transitionProperty).map((a) => ({ property: a.transitionProperty, duration: a.effect.getTiming().duration }))`,
    ) as Promise<{ property: string; duration: number }[]>

  test('S5.1 FR-004 with motion allowed a preview opens over 200 ms from .96 and 4 px below, and closes over 120 ms', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1700)
    const github = page.locator('.ds-header__end a[data-preview]', { hasText: 'GitHub' })
    const id = (await github.getAttribute('data-preview')) ?? ''
    await github.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const opening = await transitions(page, `#${id}`)
    expect(opening.map((t) => t.property).sort()).toEqual(expect.arrayContaining(['opacity', 'scale', 'translate']))
    for (const t of opening.filter((t) => ['opacity', 'scale', 'translate'].includes(t.property))) expect(t.duration, t.property).toBe(200)
    expect(await page.locator(`#${id}`).evaluate((card) => getComputedStyle(card).transformOrigin)).toBe('0px 0px')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    const closing = await transitions(page, `#${id}`)
    for (const t of closing.filter((t) => ['opacity', 'scale', 'translate'].includes(t.property))) expect(t.duration, t.property).toBe(120)
    expect(closing.length).toBeGreaterThan(0)
  })

  test('S5.1 under reduced motion a preview opens and closes at once', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const github = page.locator('.ds-header__end a[data-preview]', { hasText: 'GitHub' })
    const id = (await github.getAttribute('data-preview')) ?? ''
    await github.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator(`#${id}`)).toBeVisible()
    expect(await transitions(page, `#${id}`)).toEqual([])
    expect(await page.locator(`#${id}`).evaluate((card) => [getComputedStyle(card).opacity, getComputedStyle(card).scale])).toEqual([
      '1',
      'none',
    ])
  })

  test('S5.2 FR-004 the phone menu drops 6 px over 200 ms with motion allowed, and appears at once under reduced motion', async ({
    page,
  }) => {
    for (const [motion, expected] of [
      ['no-preference', [{ name: 'ds-menu-drop', duration: 200 }]],
      ['reduce', []],
    ] as const) {
      await enter(page, { viewport: PHONE, theme: 'light' }, motion)
      await open(page, '/')
      await page.locator('.ds-header__menu > summary').click()
      const drops = await page.evaluate(
        `document.getAnimations().filter((a) => a.animationName === 'ds-menu-drop').map((a) => ({ name: a.animationName, duration: a.effect.getTiming().duration, from: a.effect.getKeyframes()[0].translate }))`,
      )
      expect(drops, motion).toEqual(expected.map((e) => ({ ...e, from: '0px -6px' })))
    }
  })

  test('S5.3 the gallery’s held-open preview cards sit at rest with motion allowed', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/design-system')
    const still = (await page.evaluate(
      `[...document.querySelectorAll('.lp-card--still')].map((c) => [getComputedStyle(c).opacity, getComputedStyle(c).scale, getComputedStyle(c).translate])`,
    )) as string[][]
    expect(still.length).toBeGreaterThan(0)
    for (const card of still) expect(card).toEqual(['1', 'none', 'none'])
  })
})

test.describe('the phone role switch (T5)', () => {
  test('S6.1 SC-003 FR-005 at 390 and 320 the switch is one line, scrolling sideways if it must, and the page never does', async ({
    page,
  }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of PAGES) {
        await open(page, address)
        const line = (await page.evaluate(`(() => {
          const nav = document.querySelector('.ds-roles--quiet')
          const tops = [nav.querySelector('.ds-roles__label'), ...nav.querySelectorAll('.ds-roles__item')].map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2))
          return { tops, overflow: getComputedStyle(nav).overflowX, page: document.documentElement.scrollWidth - innerWidth }
        })()`)) as { tops: number[]; overflow: string; page: number }
        expect(new Set(line.tops).size, `${address} ${viewport.width}`).toBe(1)
        expect(line.overflow).toBe('auto')
        expect(line.page, `${address} ${viewport.width}`).toBe(0)
      }
    }
  })

  test('S6.2 each role is at least 44 by 24 px, and its focus ring isn’t clipped', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/mobile')
    const items = page.locator('.ds-roles--quiet .ds-roles__item')
    for (let i = 0; i < (await items.count()); i += 1) {
      const box = await items.nth(i).boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
      await items.nth(i).focus()
      const fits = (await items.nth(i).evaluate((a) => {
        const style = getComputedStyle(a)
        const ring = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset))
        const nav = a.closest('.ds-roles--quiet')?.getBoundingClientRect()
        const box = a.getBoundingClientRect()
        return nav !== undefined && box.top - ring >= nav.top - 0.5 && box.bottom + ring <= nav.bottom + 0.5
      })) as boolean
      expect(fits, `role ${i}`).toBe(true)
    }
  })

  test('S6.3 with no script, a role page’s current role carries its own fill', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: PHONE, colorScheme: 'light' })
    const page = await context.newPage()
    await page.goto('/fullstack')
    const current = page.locator('.ds-roles--quiet [aria-current="page"]')
    await expect(current).toHaveText('Full-stack')
    expect(await current.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe('rgb(234, 240, 254)')
    await context.close()
  })
})

test.describe('the footer (T6)', () => {
  test('S7.1 S7.2 FR-006 the home and role pages’ footer says how the site is built and links the repo, with its other links kept', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: PHONE, theme })
      for (const address of PAGES) {
        await open(page, address)
        const footer = page.locator('footer.ds-footer')
        await expect(footer).toContainText('Built in the open: specs, tests and decisions on GitHub')
        await expect(footer).not.toContainText('The redesign, in progress.')
        const repo = footer.getByRole('link', { name: 'specs, tests and decisions on GitHub' })
        await expect(repo).toHaveAttribute('href', REPO)
        await expect(footer.getByRole('link', { name: 'How the chat is tested' })).toHaveAttribute('href', '/evals')
        await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
        for (const link of await footer.getByRole('link').all()) expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24)
        const [ink, bg] = (await repo.evaluate((a) => [getComputedStyle(a).color, getComputedStyle(document.body).backgroundColor])) as [
          string,
          string,
        ]
        expect(contrast(ink, bg), `${address} ${theme}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

test.describe('what the frame never does (S8)', () => {
  test('S8.4 SC-004 FR-002 the frame adds no scroll listener; the header’s state comes from three IntersectionObservers', async ({
    page,
  }) => {
    await page.addInitScript(`(() => {
      window.__scroll = []
      const add = EventTarget.prototype.addEventListener
      EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (type === 'scroll' || type === 'scrollend' || type === 'wheel') window.__scroll.push(type)
        return add.call(this, type, ...rest)
      }
      window.__observers = 0
      const Observer = window.IntersectionObserver
      window.IntersectionObserver = class extends Observer { constructor(...args) { super(...args); window.__observers += 1 } }
    })()`)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    for (const y of [0, 500, 3000, 99_999]) await at(page, y)
    // Spec 016's previews keep one passive listener per preview link, which Brad left as it is
    // at spec 027's Gate 1 (scoped to the frame); anything more would be the frame's.
    const previewLinks = (await page.evaluate(`document.querySelectorAll('a[data-preview]').length`)) as number
    expect(await page.evaluate('window.__scroll')).toEqual(Array.from({ length: previewLinks }, () => 'scroll'))
    expect(await page.evaluate('window.__observers')).toBe(3)
    expect(await page.evaluate('window.onscroll')).toBeNull()
  })

  test('S8.5 SC-005 FR-008 each page loads only the one module, grown by at most 1,280 bytes', async ({ page }) => {
    for (const address of [...PAGES, '/design-system']) {
      await open(page, address)
      expect(await onlyPreviewScript(page), address).toBe(true)
    }
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE)
  })
})
