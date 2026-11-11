import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'
import {
  BUTTON,
  cornerOf,
  delayOf,
  flick,
  HERO_BUTTON,
  jump,
  PHONE_375,
  recordMotion,
  runsOf,
  startsOf,
  tapsOf,
} from '../helpers/corner.ts'

// Spec 031 in the browser, on a 375 × 812 phone: a corner "Ask about Brad"
// shows whenever the hero's is off screen, shrinks while the visitor scrolls
// down, opens on a stop or a scroll up, hides at the end, and never entirely
// hides what has focus. Neither button moves, so layout shift stays 0 (D214).
// The desktop and the page with no script don't change.

// The one module before this slice (spec 030's build with its fixes), and Brad's Gate 1 allowance.
const MODULE_BEFORE = 11346
const ALLOWANCE = 768
const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'
const NAMED = { name: 'Ask about Brad', exact: true } as const

/** The contact section's top in the page. */
const contactTop = (page: Page): Promise<number> =>
  page.evaluate(`document.getElementById('contact').getBoundingClientRect().top + scrollY`) as Promise<number>

/** How many "Ask about Brad" buttons a visitor can see on the screen now, below the header. */
const seen = (page: Page): Promise<number> =>
  page.evaluate(`[...document.querySelectorAll('[data-chat-open]')].filter((b) => {
    const r = b.getBoundingClientRect()
    return getComputedStyle(b).visibility === 'visible' && Number(getComputedStyle(b).opacity) > 0.5 && r.width > 0 && r.bottom > 72 && r.top < innerHeight
  }).length`) as Promise<number>

async function load(page: Page, path = '/', motion: 'reduce' | 'no-preference' = 'reduce'): Promise<void> {
  await enter(page, { viewport: PHONE_375, theme: 'light' }, motion)
  await page.goto(path)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

test.describe('the chat is one tap away anywhere on the page (story 1)', () => {
  test('S1.1 SC-002 on load the corner shows, the full pill, 56 px tall, 20 px from the edges', async ({ page }) => {
    await load(page)
    await expect.poll(async () => (await cornerOf(page)).float).toBe(true)
    const corner = await cornerOf(page)
    expect(corner.position).toBe('fixed')
    expect(corner.visibility).toBe('visible')
    expect(corner.height).toBe(56)
    expect(corner.width).toBeGreaterThan(150)
    // The gutter on the right, and 20 px above the bottom, with no home bar here.
    expect(Math.round(corner.x + corner.width)).toBe(PHONE_375.width - 20)
    expect(Math.round(corner.y + corner.height)).toBe(PHONE_375.height - 20)
    await expect(page.getByRole('button', NAMED)).toHaveCount(1)
    await expect(page.locator(BUTTON)).toBeVisible()
  })

  test('S1.2 S1.3 SC-001 FR-001 exactly one button is visible at every 400 px, in the hero or the corner, until the end', async ({
    page,
  }) => {
    await load(page)
    const end = await contactTop(page)
    let inHero = 0
    for (let y = 0; y + PHONE_375.height < end + 150; y += 400) {
      await jump(page, y)
      expect(await seen(page), `at ${y}`).toBe(1)
      if (!(await cornerOf(page)).float) {
        inHero += 1
        await expect(page.locator(HERO_BUTTON), `at ${y}`).toBeInViewport()
      }
    }
    expect(inHero, 'the hero holds it somewhere on the way down').toBeGreaterThan(0)
  })

  test('S1.2 FR-001 with the hero’s button on screen the corner is hidden, and only one button is ever in the accessibility tree', async ({
    page,
  }) => {
    await load(page)
    await jump(page, 520)
    const corner = await cornerOf(page)
    expect(corner.float).toBe(false)
    expect(corner.visibility).toBe('hidden')
    await expect(page.locator(HERO_BUTTON)).toBeInViewport()
    await expect(page.getByRole('button', NAMED)).toHaveCount(1)
    // Floating, the hero's is hidden instead, so a screen reader still finds one.
    await jump(page, 3000)
    await expect(page.getByRole('button', NAMED)).toHaveCount(1)
    await expect(page.locator(HERO_BUTTON)).toBeHidden()
  })

  test('S1.4 FR-002 at the end it hides: not seen, not tapped, not focused; scrolling up shows it again', async ({ page }) => {
    await load(page)
    await jump(page, 'end')
    const corner = await cornerOf(page)
    expect(corner.end).toBe(true)
    expect(corner.visibility).toBe('hidden')
    expect(await seen(page)).toBe(0)
    await page.evaluate(`document.querySelector('${BUTTON}').focus()`)
    expect(await page.evaluate(`document.activeElement === document.querySelector('${BUTTON}')`)).toBe(false)
    await expect(page.locator('#contact-heading')).toBeInViewport()
    await jump(page, (await contactTop(page)) - 2000)
    expect((await cornerOf(page)).visibility).toBe('visible')
  })

  test('S1.5 a tap on the corner opens the full-screen sheet, and closing it returns focus there', async ({ page }) => {
    await fakeApi(page)
    await load(page)
    await jump(page, 3000)
    await page.locator(BUTTON).click()
    await dialogOf(page).locator('textarea').waitFor()
    expect(await dialogOf(page).boundingBox()).toEqual({ x: 0, y: 0, width: PHONE_375.width, height: PHONE_375.height })
    await page.keyboard.press('Escape')
    await expect(dialogOf(page)).toBeHidden()
    await expect(page.locator(BUTTON)).toBeFocused()
  })

  test('S1.6 a role page shows the corner, and hides it at the end, too', async ({ page }) => {
    await load(page, '/ai')
    await jump(page, 3000)
    expect((await cornerOf(page)).float).toBe(true)
    expect(await seen(page)).toBe(1)
    await jump(page, 'end')
    expect(await seen(page)).toBe(0)
  })
})

test.describe('it stays out of the way while the visitor reads (story 2)', () => {
  test('S2.1 S2.2 S2.3 SC-002 FR-003 FR-004 scrolling down makes a 56 px circle named "Ask about Brad"; a stop opens it', async ({
    page,
  }) => {
    await load(page, '/', 'no-preference')
    await page.waitForTimeout(2400)
    await jump(page, 2000)
    // The jump down shrank it too; 0.6 s after it stops, and its 300 ms, it's open.
    await page.waitForTimeout(1000)
    expect(await tapsOf(page)).toEqual({ circle: true, words: true })
    await flick(page, 600)
    await page.waitForTimeout(350)
    expect((await cornerOf(page)).small).toBe(true)
    expect(await tapsOf(page)).toEqual({ circle: true, words: false })
    expect((await cornerOf(page)).height).toBe(56)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).clipPath`)).toBe('circle(28px at 28px 50%)')
    await expect(page.getByRole('button', NAMED)).toBeVisible()
    await page.waitForTimeout(1000)
    expect((await cornerOf(page)).small).toBe(false)
    expect(await tapsOf(page)).toEqual({ circle: true, words: true })
  })

  test('S2.2 FR-003 scrolling up opens it at once, before the stop', async ({ page }) => {
    await load(page, '/', 'no-preference')
    await page.waitForTimeout(2400)
    await jump(page, 2000)
    await flick(page, 600)
    expect((await cornerOf(page)).small).toBe(true)
    await flick(page, -300, 4)
    expect((await cornerOf(page)).small).toBe(false)
    await page.waitForTimeout(350)
    expect(await tapsOf(page)).toEqual({ circle: true, words: true })
  })
})

test.describe('it arrives and leaves gently, or not at all (story 3)', () => {
  const ENTRANCE = ['chat-ask-rise', 'chat-ask-fade']

  test('S3.1 the first appearance, on load, plays MA-20 from 1.8 s, on the spring', async ({ page }) => {
    await recordMotion(page)
    await load(page, '/', 'no-preference')
    await expect.poll(async () => (await cornerOf(page)).float).toBe(true)
    expect(await delayOf(page)).toBe('1.8s')
    await page.waitForTimeout(2400)
    expect(await startsOf(page)).toEqual(ENTRANCE)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).animationTimingFunction`)).toContain(SPRING)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).animationDuration`)).toBe('0.42s, 0.42s')
  })

  test('S3.2 later appearances play MA-20 at once; at the end it fades and drops', async ({ page }) => {
    await recordMotion(page)
    await load(page, '/', 'no-preference')
    await page.waitForTimeout(2400)
    await startsOf(page)
    await jump(page, 520)
    expect((await cornerOf(page)).float).toBe(false)
    await jump(page, 2500)
    expect((await cornerOf(page)).float).toBe(true)
    expect(await delayOf(page)).toBe('0s, 0s')
    await expect.poll(() => page.evaluate('window.__starts.length')).toBe(2)
    expect(await startsOf(page)).toEqual(ENTRANCE)
    await page.waitForTimeout(1000)
    await runsOf(page)
    await jump(page, 'end')
    expect(await runsOf(page)).toEqual(expect.arrayContaining(['opacity', 'translate', 'visibility']))
  })

  test('S3.3 FR-003 with reduced motion it never shrinks, rises or slides', async ({ page }) => {
    await recordMotion(page)
    await load(page)
    await page.waitForTimeout(2400)
    await jump(page, 520)
    await jump(page, 2000)
    await flick(page, 600)
    expect((await cornerOf(page)).small).toBe(true)
    expect(await tapsOf(page)).toEqual({ circle: true, words: true })
    await jump(page, 'end')
    await page.waitForTimeout(400)
    expect(await startsOf(page)).toEqual([])
    expect(await runsOf(page)).toEqual([])
  })

  test('S3.4 a page that loads away from its top doesn’t wait for the hero: any entrance plays at once', async ({ page }) => {
    await recordMotion(page)
    await enter(page, { viewport: PHONE_375, theme: 'light' }, 'no-preference')
    await page.goto('/#hopper')
    await page.waitForLoadState('load')
    await page.waitForTimeout(1000)
    expect((await cornerOf(page)).float).toBe(true)
    expect(await delayOf(page)).toBe('0s, 0s')
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).opacity`)).toBe('1')
  })
})

test.describe('it never hides what has focus (story 4)', () => {
  test('S4.1 FR-005 tabbing through the page, no focused element is entirely hidden, and one scrolled into view lands clear', async ({
    page,
  }) => {
    await load(page)
    let checked = 0
    for (let i = 0; i < 140; i++) {
      const before = (await page.evaluate('scrollY')) as number
      await page.keyboard.press('Tab')
      const after = (await page.evaluate('scrollY')) as number
      const hit = (await page.evaluate(`(() => {
        const a = document.activeElement, b = document.querySelector('${BUTTON}')
        if (!a || a === document.body || a === b || getComputedStyle(b).visibility === 'hidden') return null
        const x = a.getBoundingClientRect(), y = b.getBoundingClientRect()
        if (x.width === 0 || x.height === 0) return null
        const w = Math.max(0, Math.min(x.right, y.right) - Math.max(x.left, y.left))
        const h = Math.max(0, Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top))
        return { what: a.tagName + ' ' + (a.textContent || '').trim().slice(0, 40), overlap: w * h, area: x.width * x.height }
      })()`)) as { what: string; overlap: number; area: number } | null
      if (hit === null) continue
      checked += 1
      expect(hit.overlap, hit.what).toBeLessThan(hit.area)
      if (after > before) expect(hit.overlap, `${hit.what}, scrolled into view`).toBe(0)
    }
    expect(checked).toBeGreaterThan(40)
  })
})

test.describe('nothing else changes (story 5)', () => {
  test('S5.1 FR-006 on a desktop the hero’s button floats as before, scrolling never changes it, and the corner’s isn’t there', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(2400)
    const box = (): Promise<unknown> =>
      page.evaluate(
        `(() => { const b = document.querySelector('${HERO_BUTTON}'); const r = b.getBoundingClientRect(); return [getComputedStyle(b).position, getComputedStyle(b).visibility, r.x, r.y, r.width, r.height] })()`,
      )
    const before = await box()
    expect(before).toEqual(['fixed', 'visible', expect.any(Number), expect.any(Number), expect.any(Number), 52])
    await flick(page, 600)
    await page.waitForTimeout(350)
    expect(await box()).toEqual(before)
    await jump(page, 'end')
    expect(await box()).toEqual(before)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).display`)).toBe('none')
    await expect(page.getByRole('button', NAMED)).toHaveCount(1)
  })

  test('S5.2 with no script neither button is shown', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: PHONE_375 })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('[data-chat-open]')).toHaveCount(2)
    await expect(page.locator(HERO_BUTTON)).toBeHidden()
    await page.evaluate('scrollTo(0, 3000)')
    await expect(page.locator(BUTTON)).toBeHidden()
    await context.close()
  })

  test('S5.3 S5.5 SC-003 SC-004 FR-005 FR-006 layout shift stays 0 down the page; one module, grown by at most 768 bytes', async ({
    page,
  }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await load(page, '/', 'no-preference')
    await page.waitForTimeout(2400)
    for (const y of [520, 1200, 3000, 520, 0, 6000]) {
      await jump(page, y)
      await flick(page, 400)
    }
    await jump(page, 'end')
    expect(await page.evaluate('window.__shift')).toBe(0)
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE)
  })
})
