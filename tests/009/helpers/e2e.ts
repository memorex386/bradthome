import type { Page } from '@playwright/test'

// The gallery's four looks, as the mocks name them (G1–G4), for spec 009's
// end-to-end tests. Playwright runs these in the pinned container only.

export interface GalleryState {
  id: 'G1' | 'G2' | 'G3' | 'G4'
  size: 'phone' | 'desktop'
  theme: 'light' | 'dark'
  viewport: { width: number; height: number }
}

export const PHONE = { width: 390, height: 844 } as const
export const NARROW = { width: 320, height: 720 } as const
export const DESKTOP = { width: 1280, height: 800 } as const

export const GALLERY_STATES: readonly GalleryState[] = [
  { id: 'G1', size: 'desktop', theme: 'light', viewport: DESKTOP },
  { id: 'G2', size: 'desktop', theme: 'dark', viewport: DESKTOP },
  { id: 'G3', size: 'phone', theme: 'light', viewport: PHONE },
  { id: 'G4', size: 'phone', theme: 'dark', viewport: PHONE },
]

export const GALLERY = '/design-system'

/** The tokens' values as a browser computes them, for each theme. */
export const RGB = {
  light: { bg: 'rgb(250, 250, 248)', ink: 'rgb(17, 19, 24)', accent: 'rgb(42, 85, 229)', surface: 'rgb(255, 255, 255)', band: 'rgb(14, 17, 22)' },
  dark: { bg: 'rgb(15, 17, 21)', ink: 'rgb(236, 238, 242)', accent: 'rgb(142, 168, 255)', surface: 'rgb(22, 25, 32)', band: 'rgb(7, 8, 11)' },
} as const

/** Sets a state's size and theme, with reduced motion on, before the page loads. */
export async function enterGallery(page: Page, state: Pick<GalleryState, 'viewport' | 'theme'>, reducedMotion: 'reduce' | 'no-preference' = 'reduce'): Promise<void> {
  await page.setViewportSize(state.viewport)
  await page.emulateMedia({ colorScheme: state.theme, reducedMotion })
}

/** Opens the gallery and waits for its fonts. */
export async function openGallery(page: Page, hash = ''): Promise<void> {
  await page.goto(`${GALLERY}${hash}`)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The computed style of the first element a selector matches. */
export async function styleOf(page: Page, selector: string, property: string): Promise<string> {
  await page.locator(selector).first().waitFor({ state: 'attached' })
  return (await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`)) as string
}

/** The focused element's outline, its accessible label, and a short description of it. */
export async function focused(page: Page): Promise<{ outline: string; width: number; color: string; label: string; tag: string } | null> {
  return (await page.evaluate(String.raw`(() => {
    const element = document.activeElement
    if (element === null || element === document.body) return null
    const style = getComputedStyle(element)
    return {
      outline: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
      color: style.outlineColor,
      label: (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tag: element.tagName.toLowerCase(),
    }
  })()`)) as { outline: string; width: number; color: string; label: string; tag: string } | null
}
