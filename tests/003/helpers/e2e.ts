import type { Page } from '@playwright/test'

// The page's four looks, as the mocks name them (P1–P4), for the end-to-end
// tests. Playwright runs these in the pinned container only.

export interface State {
  id: 'P1' | 'P2' | 'P3' | 'P4'
  /** As the messages name it, such as P2 home, phone, dark. */
  label: string
  size: 'phone' | 'desktop'
  theme: 'light' | 'dark'
  viewport: { width: number; height: number }
}

export const PHONE = { width: 390, height: 844 } as const
export const DESKTOP = { width: 1280, height: 800 } as const

export const STATES: readonly State[] = [
  { id: 'P1', label: 'P1 home, phone, light', size: 'phone', theme: 'light', viewport: PHONE },
  { id: 'P2', label: 'P2 home, phone, dark', size: 'phone', theme: 'dark', viewport: PHONE },
  { id: 'P3', label: 'P3 home, desktop, light', size: 'desktop', theme: 'light', viewport: DESKTOP },
  { id: 'P4', label: 'P4 home, desktop, dark', size: 'desktop', theme: 'dark', viewport: DESKTOP },
]

/** A missing path, which Hosting answers with the 404 page. */
export const MISSING = '/no-such-page'

/** A fixed moment, so nothing on a snapshot depends on the clock. */
export const FIXED_TIME = new Date('2026-11-03T12:00:00Z')

/** Sets a state's size and theme, with reduced motion on, before the page loads. */
export async function enter(page: Page, state: State): Promise<void> {
  await page.setViewportSize(state.viewport)
  await page.emulateMedia({ colorScheme: state.theme, reducedMotion: 'reduce' })
}

/** Waits until the fonts have loaded or failed, so nothing swaps afterwards. */
export async function fontsSettled(page: Page): Promise<void> {
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}
