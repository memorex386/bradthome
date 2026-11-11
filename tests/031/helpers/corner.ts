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

/**
 * Records the corner's entrances and exits by name as they start, so a 420 ms
 * animation can't slip past a check: window.__starts and window.__runs. A
 * headless browser may deliver the event after the animation has ended, so
 * its delay is read from the computed style instead (delayOf).
 */
export async function recordMotion(page: Page): Promise<void> {
  await page.addInitScript(`window.__starts = []; window.__runs = []
    addEventListener('animationstart', (e) => {
      if (e.target.classList && e.target.classList.contains('chat-corner')) window.__starts.push(e.animationName)
    }, true)
    addEventListener('transitionrun', (e) => {
      if (e.target.classList && e.target.classList.contains('chat-corner')) window.__runs.push(e.propertyName)
    }, true)`)
}

export const startsOf = (page: Page): Promise<string[]> => page.evaluate('window.__starts.splice(0)') as Promise<string[]>

export const runsOf = (page: Page): Promise<string[]> => page.evaluate('window.__runs.splice(0)') as Promise<string[]>

/** The corner's computed animation delay now. */
export const delayOf = (page: Page): Promise<string> =>
  page.evaluate(`getComputedStyle(document.querySelector('${BUTTON}')).animationDelay`) as Promise<string>
