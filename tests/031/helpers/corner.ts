import type { Page } from '@playwright/test'

// Spec 031's phone, and how its tests read and move the corner button (D214).

export const PHONE_375 = { width: 375, height: 812 } as const
export const BUTTON = '.chat-corner'
export const HERO_BUTTON = '.hero .chat-ask'

export interface Corner {
  float: boolean
  small: boolean
  end: boolean
  position: string
  visibility: string
  x: number
  y: number
  width: number
  height: number
}

/** The button's attributes, place and size now. */
export const cornerOf = (page: Page): Promise<Corner> =>
  page.evaluate(`(() => {
    const b = document.querySelector('${BUTTON}')
    const r = b.getBoundingClientRect()
    const s = getComputedStyle(b)
    return { float: b.hasAttribute('data-float'), small: b.hasAttribute('data-small'), end: b.hasAttribute('data-end'),
      position: s.position, visibility: s.visibility, x: r.x, y: r.y, width: r.width, height: r.height }
  })()`) as Promise<Corner>

/**
 * Scrolls at once, as a jump would, and lets the observers answer. A headless
 * browser can deliver them hundreds of milliseconds late, so this waits for an
 * observer of its own, which the browser answers in the same step as the
 * page's, and then two frames for the styles.
 */
export async function jump(page: Page, y: number | 'end'): Promise<void> {
  await page.evaluate(`scrollTo(0, ${y === 'end' ? 'document.documentElement.scrollHeight' : y})`)
  await page.evaluate(`new Promise((done) => {
    const o = new IntersectionObserver(() => { o.disconnect(); requestAnimationFrame(() => requestAnimationFrame(done)) })
    o.observe(document.getElementById('contact'))
  })`)
  await page.waitForTimeout(50)
}

/**
 * A scroll that puts the hero's place for the pill 300 px from the top of the
 * screen, inside spec 032's band. Spec 036's tiles, buttons and chips moved
 * the place down the page, so the tests find it rather than scroll to 400.
 */
export const heroPlaceY = (page: Page): Promise<number> =>
  page.evaluate(`Math.round(document.querySelector('${HERO_BUTTON}').getBoundingClientRect().top + scrollY - 300)`) as Promise<number>

/** Scrolls down with the wheel, as a finger would, in small steps. */
export async function flick(page: Page, dy: number, steps = 8): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps)
    await page.waitForTimeout(25)
  }
}

/**
 * What a tap would hit at the circle's center and at the pill's words, 56 px
 * to its left: the circle is a clip, so the box keeps its width while only the
 * circle can be seen or tapped.
 */
export const tapsOf = (page: Page): Promise<{ circle: boolean; words: boolean }> =>
  page.evaluate(`(() => {
    const b = document.querySelector('${BUTTON}')
    const x = innerWidth - 20 - 28, y = innerHeight - 20 - 28
    const at = (px) => { const e = document.elementFromPoint(px, y); return !!e && b.contains(e) }
    return { circle: at(x), words: at(x - 56) }
  })()`) as Promise<{ circle: boolean; words: boolean }>

/** One appearance of the corner: when it showed, what animations it started, and its opacity frame by frame after. */
export interface Showing {
  at: number
  animations: { name: string; delay: number; duration: number }[]
  opacity: number[]
}

/**
 * Records each time the corner shows, the moment it does: its animations, read
 * then (so a headless browser's late events can't hide one), and its opacity on
 * each frame for 600 ms after (so an entrance that skips to its end shows as
 * all 1s). Also records the transitions it runs: window.__shows, window.__runs.
 */
export async function recordMotion(page: Page): Promise<void> {
  await page.addInitScript(`window.__shows = []; window.__runs = []
    const t0 = performance.now()
    const shown = (c) => c.hasAttribute('data-float') && !c.hasAttribute('data-end')
    let was = false
    new MutationObserver(() => {
      const c = document.querySelector('.chat-corner')
      if (!c) return
      const now = shown(c)
      if (now && !was) {
        const showing = { at: Math.round(performance.now() - t0), opacity: [], animations: c.getAnimations().filter((a) => a.animationName).map((a) => {
          const t = a.effect.getTiming()
          return { name: a.animationName, delay: Math.round(t.delay), duration: Math.round(Number(t.duration)) }
        }) }
        window.__shows.push(showing)
        const from = performance.now()
        const tick = () => { showing.opacity.push(Number(getComputedStyle(c).opacity)); if (performance.now() - from < 600) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }
      was = now
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-float', 'data-end'] })
    addEventListener('transitionrun', (e) => {
      if (e.target.classList && e.target.classList.contains('chat-corner')) window.__runs.push(e.propertyName)
    }, true)`)
}

/** The appearances recorded so far, taken off the record. */
export const showsOf = (page: Page): Promise<Showing[]> => page.evaluate('window.__shows.splice(0)') as Promise<Showing[]>

export const runsOf = (page: Page): Promise<string[]> => page.evaluate('window.__runs.splice(0)') as Promise<string[]>

/** MA-20 as it starts: the rise and the fade, 420 ms, at once. */
export const MA20 = [
  { name: 'chat-ask-rise', delay: 0, duration: 420 },
  { name: 'chat-ask-fade', delay: 0, duration: 420 },
]

/** Whether an appearance visibly faded in: some frame caught it part of the way. */
export const faded = (showing: Showing | undefined): boolean => (showing?.opacity ?? []).some((o) => o > 0.02 && o < 0.98)

/** One frame of the page, as spec 032's recorder sees it. */
export interface Frame {
  y: number
  fly: boolean
  corner: boolean
  hero: boolean
  end: boolean
  c: [number, number, number, number]
  h: [number, number, number, number]
}

/**
 * Spec 032: records every frame, once the corner's first appearance is due:
 * the scroll, whether each button is shown, and both buttons' boxes, as
 * window.__frames.
 */
export async function recordFrames(page: Page): Promise<void> {
  await page.addInitScript(`window.__frames = []
    const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }
    // Sampled just after each frame, once every frame callback (the flight's included) has run.
    const sample = () => {
      const c = document.querySelector('.chat-corner'), h = document.querySelector('.hero .chat-ask')
      if (c && h && performance.now() > 2000) window.__frames.push({ y: Math.round(scrollY), fly: c.hasAttribute('data-fly'), end: c.hasAttribute('data-end'),
        corner: getComputedStyle(c).visibility === 'visible', hero: getComputedStyle(h).visibility === 'visible', c: box(c), h: box(h) })
      requestAnimationFrame(() => setTimeout(sample))
    }
    requestAnimationFrame(() => setTimeout(sample))`)
}

export const framesOf = (page: Page): Promise<Frame[]> => page.evaluate('window.__frames.splice(0)') as Promise<Frame[]>

/** Scrolls by dy in small steps, as a slow finger would. */
export async function creep(page: Page, dy: number, step = 20): Promise<void> {
  for (let done = 0; Math.abs(done) < Math.abs(dy); done += Math.sign(dy) * step) {
    await page.mouse.wheel(0, Math.sign(dy) * step)
    await page.waitForTimeout(40)
  }
}
