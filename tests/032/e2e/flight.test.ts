import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import {
  BUTTON,
  cornerOf,
  creep,
  type Frame,
  framesOf,
  HERO_BUTTON,
  jump,
  PHONE_375,
  recordFrames,
  recordMotion,
  showsOf,
} from '../../031/helpers/corner.ts'

// Spec 032 in the browser, on a 375 × 812 phone: the corner's pill flies into
// the hero's place once all of it is 100 px into the screen, hands over to the
// hero's button, and flies back out as it leaves; every frame aims at where the
// place is, so a flight ends on target while the visitor scrolls (D215).

// The one module before this slice (v2.5.0's), and Brad's Gate 1 allowance.
const MODULE_BEFORE = 12051
const ALLOWANCE = 768
// The band the place must be inside: 100 px below the 72 px header, and 100 px above the bottom.
const TOP = 172
const BOTTOM = PHONE_375.height - 100

async function load(page: Page, motion: 'reduce' | 'no-preference' = 'no-preference'): Promise<void> {
  await enter(page, { viewport: PHONE_375, theme: 'light' }, motion)
  await page.goto('/')
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  await page.waitForTimeout(2400)
}

/** The flights in a run of frames, each as its frames in order. */
function flightsOf(frames: Frame[]): Frame[][] {
  const flights: Frame[][] = []
  let current: Frame[] = []
  for (const frame of frames) {
    if (frame.fly) current.push(frame)
    else if (current.length > 0) {
      flights.push([...current, frame])
      current = []
    }
  }
  return flights
}

const near = (a: number[], b: number[], by = 1): boolean => a.every((v, i) => Math.abs(v - (b[i] ?? 0)) <= by)

test.describe('one button that moves (story 1)', () => {
  test('S1.1 FR-002 on a phone the hero’s button is the same pill as the corner’s', async ({ page }) => {
    await load(page, 'reduce')
    const corner = await cornerOf(page)
    await jump(page, 400)
    const hero = (await page.evaluate(
      `(() => { const r = document.querySelector('${HERO_BUTTON}').getBoundingClientRect(); return [r.left, r.width, r.height] })()`,
    )) as number[]
    expect(hero[0]).toBe(20)
    expect(Math.abs((hero[1] ?? 0) - corner.width)).toBeLessThanOrEqual(1)
    expect(hero[2]).toBe(56)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${HERO_BUTTON}')).boxShadow`)).not.toBe('none')
  })

  test('S1.2 S1.3 S1.6 SC-001 FR-001 a slow scroll flies it in once the place is in the band, onto it, and back out to the corner', async ({
    page,
  }) => {
    await recordFrames(page)
    await load(page)
    const home = await cornerOf(page)
    await framesOf(page)
    await creep(page, 420)
    await page.waitForTimeout(600)
    await creep(page, 600)
    await page.waitForTimeout(600)
    const frames = await framesOf(page)
    const [into, out, ...more] = flightsOf(frames)
    expect(more).toEqual([])
    // In: it starts only with the place inside the band, and lands on it in the same frame the hero's shows.
    const first = into?.[0]
    expect(first?.h[1]).toBeGreaterThanOrEqual(TOP)
    expect((first?.h[1] ?? 0) + 56).toBeLessThanOrEqual(BOTTOM)
    const landed = into?.at(-1)
    expect(landed?.hero, 'the hero’s shows on landing').toBe(true)
    expect(landed?.corner, 'the corner’s hides on landing').toBe(false)
    const before = into?.at(-2)
    expect(near(before?.c ?? [], before?.h ?? [], 2), `last flying frame ${JSON.stringify(before)}`).toBe(true)
    // Out: its first frame is on the place, and it ends in the corner.
    // By its first sampled frame it has already moved a frame's worth, a few pixels.
    expect(near(out?.[0]?.c ?? [], out?.[0]?.h ?? [], 8), `first frame out ${JSON.stringify(out?.[0])}`).toBe(true)
    const back = out?.at(-1)
    expect(back?.corner).toBe(true)
    expect(near(back?.c ?? [], [home.x, home.y, home.width, home.height].map(Math.round), 1)).toBe(true)
  })

  test('S1.2 S2.5 FR-001 no frame ever shows both buttons, or neither, on the way down and back', async ({ page }) => {
    await recordFrames(page)
    await load(page)
    await framesOf(page)
    await creep(page, 1200, 40)
    await page.waitForTimeout(600)
    await creep(page, -1200, 40)
    await page.waitForTimeout(600)
    const frames = await framesOf(page)
    expect(frames.length).toBeGreaterThan(30)
    for (const frame of frames.filter((f) => !f.end)) expect(Number(frame.corner) + Number(frame.hero), JSON.stringify(frame)).toBe(1)
  })

  test('S1.4 SC-001 scrolling on through a flight, it still lands exactly on the place', async ({ page }) => {
    await recordFrames(page)
    await load(page)
    await framesOf(page)
    // Fast enough that the place moves through most of the band while the pill is in flight.
    await creep(page, 520, 40)
    await page.waitForTimeout(700)
    const [into] = flightsOf(await framesOf(page))
    const before = into?.at(-2)
    expect(
      into?.some((f, i) => i > 0 && f.y !== into[0]?.y),
      'the page scrolled during the flight',
    ).toBe(true)
    expect(near(before?.c ?? [], before?.h ?? [], 2), JSON.stringify(before)).toBe(true)
    expect(into?.at(-1)?.hero).toBe(true)
  })

  test('S1.5 reversing mid-flight, it turns around from where it is and goes back to the corner', async ({ page }) => {
    await recordFrames(page)
    await load(page)
    const home = await cornerOf(page)
    await framesOf(page)
    // 80 ms into the flight in, the page scrolls back to its top, from inside the page so no round trip delays it.
    const turned = page.evaluate(`new Promise((done) => {
      const c = document.querySelector('${BUTTON}')
      const watch = new MutationObserver(() => {
        if (!c.hasAttribute('data-fly')) return
        watch.disconnect()
        setTimeout(() => { scrollTo(0, 0); done() }, 80)
      })
      watch.observe(c, { attributes: true, attributeFilter: ['data-fly'] })
    })`)
    await page.evaluate('scrollTo(0, 400)')
    await turned
    await page.waitForTimeout(900)
    const frames = await framesOf(page)
    const [flight] = flightsOf(frames)
    // It turned around before it landed: no frame of the flight shows the hero's button.
    expect(flight?.slice(0, -1).some((f) => f.hero)).toBe(false)
    expect(flight).toBeDefined()
    // No jump between frames: it turns around, never teleports.
    for (let i = 1; i < (flight?.length ?? 0) - 1; i++) {
      const a = flight?.[i - 1]?.c ?? [0, 0]
      const b = flight?.[i]?.c ?? [0, 0]
      expect(Math.hypot((b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0)), JSON.stringify([a, b])).toBeLessThan(120)
    }
    const last = flight?.at(-1)
    expect(last?.corner).toBe(true)
    expect(near(last?.c ?? [], [home.x, home.y, home.width, home.height].map(Math.round), 1)).toBe(true)
  })

  test('S1.6 S2.6 SC-002 SC-003 FR-004 layout shift stays 0 through flights; one module, grown by at most 768 bytes', async ({ page }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await load(page)
    await creep(page, 1200, 40)
    await creep(page, -1200, 40)
    await creep(page, 520, 60)
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(800)
    expect(await page.evaluate('window.__shift')).toBe(0)
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE)
  })
})

test.describe('a page loaded away from its top (from the review)', () => {
  test('S1.2 S1.3 SC-001 flights around 1.8 s into a load away from the top run on: nothing hides the pill mid-flight', async ({
    page,
  }) => {
    // A flight shows the pill as it starts and hides it only after it ends; a removal while one is under way is a snap.
    // From 1.6 s to 2.0 s the place sits in the band, so a flight in is under way when the old 1.8 s timer fired.
    await page.addInitScript(`window.__snaps = 0; window.__flights = 0
      new MutationObserver((records) => {
        for (const r of records) {
          if (r.attributeName === 'data-fly' && r.target.hasAttribute('data-fly')) window.__flights += 1
          if (r.attributeName === 'data-float' && r.target.hasAttribute('data-fly') && !r.target.hasAttribute('data-float')) window.__snaps += 1
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-fly', 'data-float'] })
      addEventListener('DOMContentLoaded', () => {
        for (const [at, y] of [[1600, 400], [2000, 1200], [2400, 400]])
          setTimeout(() => scrollTo({ top: y, behavior: 'instant' }), at)
      })`)
    await enter(page, { viewport: PHONE_375, theme: 'light' }, 'no-preference')
    await page.goto('/#stack-label')
    await page.waitForTimeout(3500)
    expect(await page.evaluate('window.__flights')).toBeGreaterThan(0)
    expect(await page.evaluate('window.__snaps')).toBe(0)
  })
})

test.describe('everything else holds (story 2)', () => {
  test('S2.1 FR-003 with reduced motion the two swap at once, with no flight', async ({ page }) => {
    await recordFrames(page)
    await load(page, 'reduce')
    await framesOf(page)
    await creep(page, 1200, 40)
    await page.waitForTimeout(400)
    const frames = await framesOf(page)
    expect(frames.some((f) => f.fly)).toBe(false)
    expect(frames.some((f) => f.hero)).toBe(true)
    expect(frames.some((f) => f.corner)).toBe(true)
  })

  test('S2.2 MA-20 plays on the first appearance only; flights and a return from the end play none', async ({ page }) => {
    await recordMotion(page)
    await load(page)
    const [first] = await showsOf(page)
    expect(first?.animations.map((a) => a.name)).toEqual(['chat-ask-rise', 'chat-ask-fade'])
    await creep(page, 1200, 40)
    await page.waitForTimeout(600)
    await jump(page, 'end')
    await page.waitForTimeout(500)
    await jump(page, 3000)
    await page.waitForTimeout(600)
    const later = await showsOf(page)
    expect(later.length).toBeGreaterThan(0)
    for (const showing of later) expect(showing.animations).toEqual([])
  })

  test('S2.3 the corner still shrinks while the visitor scrolls down past the hero, and opens on a stop', async ({ page }) => {
    await load(page)
    await jump(page, 2000)
    await page.waitForTimeout(1000)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(350)
    expect((await cornerOf(page)).small).toBe(true)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).clipPath`)).toBe('circle(28px at 28px 50%)')
    await page.waitForTimeout(1000)
    expect((await cornerOf(page)).small).toBe(false)
  })

  test('S2.4 FR-004 on a desktop nothing flies, and the hero’s button floats as before', async ({ page }) => {
    await recordFrames(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(2400)
    await creep(page, 1200, 60)
    await page.waitForTimeout(400)
    const frames = await framesOf(page)
    expect(frames.some((f) => f.fly)).toBe(false)
    expect(frames.every((f) => !f.corner)).toBe(true)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('${HERO_BUTTON}')).position`)).toBe('fixed')
  })
})
