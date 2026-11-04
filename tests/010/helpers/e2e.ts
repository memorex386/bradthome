import type { Page } from '@playwright/test'

// The new home's states, as the mocks name them (H1–H4), for spec 010's
// end-to-end tests. Playwright runs these in the pinned container only.

export const HOME = '/v2'
export const PHONE = { width: 390, height: 844 } as const
export const NARROW = { width: 320, height: 720 } as const
export const DESKTOP = { width: 1280, height: 800 } as const

export interface HomeState {
  id: 'H1' | 'H2' | 'H3' | 'H4'
  size: 'desktop' | 'phone'
  theme: 'light' | 'dark'
  viewport: { width: number; height: number }
}

export const HOME_STATES: readonly HomeState[] = [
  { id: 'H1', size: 'desktop', theme: 'light', viewport: DESKTOP },
  { id: 'H2', size: 'desktop', theme: 'dark', viewport: DESKTOP },
  { id: 'H3', size: 'phone', theme: 'light', viewport: PHONE },
  { id: 'H4', size: 'phone', theme: 'dark', viewport: PHONE },
]

/** Sets the size, theme and motion before the page loads. */
export async function enter(
  page: Page,
  state: { viewport: { width: number; height: number }; theme: 'light' | 'dark' },
  reducedMotion: 'reduce' | 'no-preference' = 'reduce',
): Promise<void> {
  await page.setViewportSize(state.viewport)
  await page.emulateMedia({ colorScheme: state.theme, reducedMotion })
}

/** Opens /v2 and waits for its fonts. */
export async function openHome(page: Page): Promise<void> {
  await page.goto(HOME)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** Pauses every running animation at a time from the start of the sequence. */
export async function freezeAt(page: Page, time: number): Promise<number> {
  return (await page.evaluate(`(() => {
    const animations = document.getAnimations()
    for (const animation of animations) { animation.pause(); animation.currentTime = ${time} }
    return animations.length
  })()`)) as number
}

/** Each running animation's target, keyframes name, delay, duration and iterations, to the millisecond (SC-003). */
export interface Timing {
  target: string
  name: string
  delay: number
  duration: number
  iterations: number
}

export async function timings(page: Page): Promise<Timing[]> {
  return (await page.evaluate(`document.getAnimations().map((animation) => {
    const timing = animation.effect.getTiming()
    const target = animation.effect.target
    return {
      target: target.className,
      name: animation.animationName,
      delay: Math.round(timing.delay),
      duration: Math.round(Number(timing.duration)),
      iterations: timing.iterations,
    }
  })`)) as Timing[]
}

/** WCAG's contrast ratio of two rgb() colors. */
export function contrast(a: string, b: string): number {
  const luminance = (color: string): number => {
    const [r, g, b2] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => {
      const value = Number(part) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b2 ?? 0)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}
