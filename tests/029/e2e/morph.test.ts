import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, firefox, type Page, test } from '@playwright/test'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 029 in the browser: the role switch's morph (MA-15), where it plays,
// and the plain page load everyone else gets (D212). Playwright asks for
// reduced motion by default; the morph's tests ask for no-preference.

// The one module before this slice (spec 028's build), and Brad's Gate 1 allowance for the morph.
const MODULE_BEFORE = 10568
const ALLOWANCE = 768
const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'
const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

interface Part {
  pseudo: string
  name: string
  delay: number
  duration: number
  easing: string
  first: string
  last: string
}

interface Morph {
  vt: boolean | undefined
  parts: Part[]
  heroAtReady: number
  layers: Record<string, string>
  sizes: Record<string, string>
}

// Recorded on every page the test opens: whether a transition ran, and its
// animations, the hero's running ones and the header's and button's layers as
// it became ready.
const RECORD = `addEventListener('pagereveal', (event) => {
  window.__vt = !!event.viewTransition
  event.viewTransition?.ready.then(() => {
    window.__parts = document.getAnimations().filter((a) => String(a.effect?.pseudoElement).startsWith('::view-transition')).map((a) => {
      const timing = a.effect.getTiming()
      const frames = a.effect.getKeyframes()
      return { pseudo: a.effect.pseudoElement, name: a.animationName, delay: Math.round(timing.delay), duration: Math.round(Number(timing.duration)), easing: frames[0]?.easing ?? '', first: frames[0]?.transform ?? '', last: frames[frames.length - 1]?.transform ?? '' }
    })
    window.__heroAtReady = document.querySelector('.hero').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
    window.__layers = Object.fromEntries(['site-header', 'chat-ask', 'role-pill', 'role-name-1', 'role-name-2', 'role-name-3'].map((n) => [n, getComputedStyle(document.documentElement, '::view-transition-group(' + n + ')').zIndex]))
    window.__sizes = Object.fromEntries(['old', 'new'].flatMap((side) => ['hero-note', 'role-name-1'].map((n) => {
      const style = getComputedStyle(document.documentElement, '::view-transition-' + side + '(' + n + ')')
      return [side + ' ' + n, style.insetInlineStart + ' ' + style.insetInlineEnd]
    })))
  })
  event.viewTransition?.finished.then(() => { window.__done = true })
})`

// Predicates as functions: a string predicate is evaluated, which the site's CSP refuses.
const revealed = (): boolean => (globalThis as Record<string, unknown>).__vt !== undefined
const morphed = (): boolean => (globalThis as Record<string, unknown>).__done === true

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** Taps a role in the switch, and returns what the role page recorded once it settled. */
async function tap(page: Page, href: string): Promise<Morph> {
  // Let the old page's hero settle first, as a visitor reading it would.
  await page.evaluate(`document.querySelector('.hero').getAnimations({ subtree: true }).forEach((a) => a.finish())`)
  await page.locator(`.hero__roles a[href="${href}"]`).click()
  await page.waitForURL(`**${href}`)
  await page.waitForFunction(revealed)
  if (await page.evaluate('window.__vt')) await page.waitForFunction(morphed)
  return page.evaluate(
    `({ vt: window.__vt, parts: window.__parts ?? [], heroAtReady: window.__heroAtReady ?? -1, layers: window.__layers ?? {}, sizes: window.__sizes ?? {} })`,
  ) as Promise<Morph>
}

const part = (morph: Morph, pseudo: string, name?: string): Part | undefined =>
  morph.parts.find((p) => p.pseudo === pseudo && (name === undefined || p.name === name))

const heroRunning = (page: Page): Promise<number> =>
  page.evaluate(
    `document.querySelector('.hero').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length`,
  ) as Promise<number>

test.describe('switching roles is one motion (story 1)', () => {
  test('S1.1 S1.3 S1.4 S1.5 SC-001 FR-001 role to role: the mark slides, the text crossfades, the hero relights and the topics move', async ({
    page,
  }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/mobile')
    const morph = await tap(page, '/ai')
    expect(morph.vt).toBe(true)

    const pill = part(morph, '::view-transition-group(role-pill)')
    expect(pill).toMatchObject({ delay: 0, duration: 360, easing: SPRING })
    expect(pill?.first).not.toBe(pill?.last)

    for (const name of ['hero-eyebrow', 'hero-note']) {
      expect(part(morph, `::view-transition-old(${name})`), name).toMatchObject({
        name: 'ds-morph-out',
        delay: 0,
        duration: 110,
        easing: EASE_OUT,
      })
      expect(part(morph, `::view-transition-new(${name})`), name).toMatchObject({
        name: 'ds-morph-in',
        delay: 110,
        duration: 200,
        easing: EASE_OUT,
      })
    }

    const words = ['hero-word-1', 'hero-word-2', 'hero-word-3', ...[1, 2, 3, 4, 5].map((n) => `hero-row-${n}`)]
    for (const name of [...words, 'role-name-1', 'role-name-2', 'role-name-3']) {
      const group = part(morph, `::view-transition-group(${name})`)
      expect(group, name).toMatchObject({ delay: 0, duration: 200, easing: EASE_OUT })
      // The words and rows keep their place; a role's name moves only by its weight's change of width.
      if (words.includes(name)) expect(group?.first, `${name} stays in place`).toBe(group?.last)
      expect(part(morph, `::view-transition-new(${name})`, '-ua-view-transition-fade-in'), name).toMatchObject({ duration: 200 })
    }
    // Each side keeps its own size: the note held to the right edge, the names to the left, never stretched.
    // The note's sides are held to the right edge, at their own widths ("Lit for mobile" and
    // "Lit for applied AI" differ), and the names' to the left.
    for (const side of ['old', 'new']) {
      expect(morph.sizes[`${side} hero-note`], side).toMatch(/ 0px$/)
      expect(morph.sizes[`${side} role-name-1`], side).toMatch(/^0px /)
    }
    expect(morph.sizes['old hero-note']).not.toBe(morph.sizes['new hero-note'])

    const topics = morph.parts.filter((p) => /^::view-transition-group\(hopper-topic-\d\)$/.test(p.pseudo))
    expect(topics).toHaveLength(5)
    for (const topic of topics) expect(topic, topic.pseudo).toMatchObject({ delay: 0, duration: 420, easing: SPRING })
    expect(topics.filter((topic) => topic.first !== topic.last).length, 'topics that move').toBeGreaterThanOrEqual(2)

    // The page that lands: Applied AI current, its word lit, its topic first.
    await expect(page.locator('.hero__roles [aria-current="page"]')).toHaveText('Applied AI')
    await expect(page.locator('.hero__word--on')).toContainText('Applied AI')
  })

  test('S1.2 home to a role: the mark fades in under the role over 200 ms', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const morph = await tap(page, '/fullstack')
    expect(morph.vt).toBe(true)
    expect(part(morph, '::view-transition-new(role-pill)')).toMatchObject({ name: 'ds-morph-in', duration: 200, easing: EASE_OUT })
    expect(part(morph, '::view-transition-old(role-pill)')).toBeUndefined()
  })

  test('S1.1 S1.2 the roles’ names sit above the mark, whichever way it moves', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    for (const [from, to] of [
      ['/', '/ai'],
      ['/ai', '/mobile'],
      ['/fullstack', '/mobile'],
    ] as const) {
      await open(page, from)
      const morph = await tap(page, to)
      expect(morph.vt, `${from} to ${to}`).toBe(true)
      for (const n of [1, 2, 3]) expect(morph.layers[`role-name-${n}`], `${from} to ${to}`).toBe('1')
      expect(morph.layers['role-pill'], `${from} to ${to}`).toBe('auto')
    }
  })

  test('S1.6 the rest swaps at once; the header and the floating button sit still above the morph', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'dark' }, 'no-preference')
    await open(page, '/fullstack')
    const morph = await tap(page, '/mobile')
    for (const pseudo of [
      '::view-transition-old(root)',
      '::view-transition-new(root)',
      '::view-transition-group(site-header)',
      '::view-transition-group(chat-ask)',
      '::view-transition-new(site-header)',
      '::view-transition-new(chat-ask)',
    ])
      expect(part(morph, pseudo), pseudo).toBeUndefined()
    expect(morph.layers).toEqual({
      'site-header': '1',
      'chat-ask': '1',
      'role-pill': 'auto',
      'role-name-1': '1',
      'role-name-2': '1',
      'role-name-3': '1',
    })
  })
})

test.describe('the morph plays where the role page opens (story 2)', () => {
  test('S2.1 S2.2 SC-002 FR-003 from below the hero on a phone, the page goes to its top and morphs there, with no jump', async ({
    page,
  }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await open(page, '/mobile')
    await page.locator('.hero__roles a[href="/ai"]').scrollIntoViewIfNeeded()
    await page.evaluate(`scrollBy({ top: 120, behavior: 'instant' })`)
    expect(await page.evaluate('scrollY')).toBeGreaterThan(100)
    const morph = await tap(page, '/ai')
    expect(morph.vt).toBe(true)
    for (const name of ['hero-word-3', 'hero-eyebrow']) {
      const group = part(morph, `::view-transition-group(${name})`)
      expect(group?.first, name).toBe(group?.last)
    }
    expect(await page.evaluate('scrollY')).toBe(0)
    // The word's morph ends where the role page shows it, so nothing jumps when the morph ends.
    const word = (await page.locator('.hero__word--3').boundingBox())?.y ?? -1
    const end = Number(/, (-?[\d.]+)\)$/.exec(part(morph, '::view-transition-group(hero-word-3)')?.last ?? '')?.[1])
    expect(Math.abs(end - word)).toBeLessThan(1)
    expect(morph.heroAtReady).toBe(0)
    expect(await heroRunning(page)).toBe(0)
  })

  test('S2.2 from the top on a laptop, the role page’s hero is at rest when the morph starts, and stays so', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const morph = await tap(page, '/mobile')
    expect(morph.heroAtReady).toBe(0)
    await page.waitForTimeout(400)
    expect(await heroRunning(page)).toBe(0)
  })

  test('S2.3 FR-003 the header’s link home, back, forward and a reload load as today, with no morph', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/mobile')
    expect((await tap(page, '/ai')).vt).toBe(true)

    await page.evaluate('window.__vt = undefined')
    await page.locator('header a[href="/"]').first().click()
    await page.waitForURL((url) => url.pathname === '/')
    await page.waitForFunction(revealed)
    expect(await page.evaluate('window.__vt')).toBe(false)

    for (const step of [() => page.goBack(), () => page.goForward(), () => page.reload()]) {
      await step()
      await page.waitForFunction(revealed)
      expect(await page.evaluate('window.__vt')).toBe(false)
    }
  })
})

test.describe('everyone else gets a plain page load (story 3)', () => {
  test('S3.1 SC-003 under reduced motion a switch runs no transition and opens at the top', async ({ page }) => {
    await page.addInitScript(RECORD)
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/mobile')
    await page.locator('.hero__roles a[href="/ai"]').scrollIntoViewIfNeeded()
    const morph = await tap(page, '/ai')
    expect(morph.vt).toBe(false)
    expect(await page.evaluate('scrollY')).toBe(0)
    expect(await heroRunning(page)).toBe(0)
  })

  test('S3.2 SC-003 Firefox loads the role page normally', async () => {
    // Firefox won't start as root with a $HOME another user owns, as in CI's container, so it gets its own.
    const browser = await firefox.launch({ env: { ...process.env, HOME: mkdtempSync(path.join(tmpdir(), 'firefox-home-')) } })
    try {
      const page = await browser.newPage({ viewport: DESKTOP, reducedMotion: 'no-preference', baseURL: test.info().project.use.baseURL })
      await open(page, '/')
      await page.locator('.hero__roles a[href="/mobile"]').click()
      await page.waitForURL('**/mobile')
      await expect(page.locator('.hero__roles [aria-current="page"]')).toHaveText('Mobile')
      await expect(page.locator('.hero__word--on')).toContainText('Mobile')
      await expect(page.locator('.hopper__topic')).toHaveCount(5)
      expect(await page.evaluate(`document.documentElement.matches(':root')`)).toBe(true)
    } finally {
      await browser.close()
    }
  })

  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S3.3 SC-003 the switch’s links work, and nothing is named for a transition', async ({ page }) => {
      await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
      await open(page, '/')
      await page.locator('.hero__roles a[href="/ai"]').click()
      await page.waitForURL('**/ai')
      await expect(page.locator('.hero__roles [aria-current="page"]')).toHaveText('Applied AI')
      const names = await page.evaluate(
        `['.hero__word--1', '.hero__rows > li', '.hopper__topic', '.ds-header'].map((s) => getComputedStyle(document.querySelector(s)).viewTransitionName)`,
      )
      expect(names).toEqual(['none', 'none', 'none', 'none'])
    })
  })

  test('S3.4 S4.2 every page at rest keeps its words, order and switch, and the current role’s fill', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const [address, current] of [
      ['/mobile', 'Mobile'],
      ['/fullstack', 'Full-stack'],
      ['/ai', 'Applied AI'],
    ] as const) {
      await open(page, address)
      const nav = page.getByRole('navigation', { name: 'Tailor this page' })
      for (const name of ['Mobile', 'Full-stack', 'Applied AI']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
      await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName(current)
      const fill = await nav.locator('[aria-current="page"]').evaluate('(a) => getComputedStyle(a).backgroundColor')
      expect(fill, address).not.toBe('rgba(0, 0, 0, 0)')
      await expect(page.locator('.hopper__topic')).toHaveCount(5)
    }
  })
})

test.describe('it still works for everyone (story 4)', () => {
  test('S4.3 the morph’s rules reach only the home and the role pages', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    const hasMorph = `[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes('@view-transition')))`
    for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
      await open(page, address)
      expect(await page.evaluate(hasMorph), address).toBe(true)
    }
    for (const address of ['/design-system', '/evals', '/privacy']) {
      await open(page, address)
      expect(await page.evaluate(hasMorph), address).toBe(false)
    }
  })

  test('S4.4 SC-005 FR-005 the morph adds no scroll listener, and the one module grows by at most 768 bytes', async ({ page }) => {
    await page.addInitScript(`(() => {
      window.__scroll = []
      const add = EventTarget.prototype.addEventListener
      EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (type === 'scroll' || type === 'scrollend' || type === 'wheel') window.__scroll.push(type)
        return add.call(this, type, ...rest)
      }
    })()`)
    await page.addInitScript(RECORD)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await tap(page, '/ai')
    // Spec 016's previews keep one passive scroll listener per preview link (spec 027).
    const previewLinks = (await page.evaluate(`document.querySelectorAll('a[data-preview]').length`)) as number
    expect(await page.evaluate('window.__scroll')).toEqual(Array.from({ length: previewLinks }, () => 'scroll'))
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE)
  })

  test('S4.5 SC-004 layout shift on the role page stays 0 through a morph', async ({ page }) => {
    await page.addInitScript(RECORD)
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await open(page, '/fullstack')
    await tap(page, '/mobile')
    await page.waitForTimeout(500)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })
})
