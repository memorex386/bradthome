import { expect, type Page } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enter } from '../../010/helpers/e2e.ts'

// Spec 047's browser helpers. Each test installs Playwright's clock before
// the page loads, so the player's holds pass only when a test runs the
// clock: a 40 s replay plays in milliseconds, the same on every run, and
// nothing waits on real time. Page code goes as strings, as the other
// specs' does, since the tests type-check without the DOM's types.

export const DESKTOP = { width: 1440, height: 900 }
export const PHONE = { width: 375, height: 812 }
export const FIGURE = '[data-replay]'
export const STAGE = `${FIGURE} .r-stage`

export type Motion = 'reduce' | 'no-preference'

/** Opens a page with the clock installed and the fonts loaded. */
export async function open(
  page: Page,
  options: { address?: string; viewport?: { width: number; height: number }; theme?: 'light' | 'dark'; motion?: Motion } = {},
): Promise<void> {
  const { address = '/', viewport = DESKTOP, theme = 'light', motion = 'no-preference' } = options
  await enter(page, { viewport, theme }, motion)
  await page.clock.install({ time: FIXED_TIME })
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  // Installed, the clock still runs in real time; paused, only a test's runFor moves the replay.
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 60_000))
}

/** Scrolls the replay into view under the sticky header, and waits for its player. */
export async function reach(page: Page): Promise<void> {
  await page.evaluate(`window.scrollTo(0, document.querySelector('${FIGURE}').getBoundingClientRect().top + window.scrollY - 96)`)
  await expect(page.locator(`${FIGURE}.is-ready`)).toHaveCount(1, { timeout: 15_000 })
}

/** Scrolls the page back to its top, out of the replay's view. */
export async function leave(page: Page): Promise<void> {
  await page.evaluate('window.scrollTo(0, 0)')
  await expect.poll(() => page.evaluate(`document.querySelector('${FIGURE}').getBoundingClientRect().top > innerHeight`)).toBe(true)
}

/** How many trace lines and chat items are drawn now. */
export async function drawn(page: Page): Promise<{ log: number; chat: number }> {
  return (await page.evaluate(
    `({ log: document.querySelectorAll('[data-r-log] > *').length, chat: document.querySelectorAll('[data-r-chat] > *').length })`,
  )) as { log: number; chat: number }
}

/** The trace lines' titles, in order. */
export async function titles(page: Page): Promise<string[]> {
  return page.locator('[data-r-log] .r-t').allTextContents()
}

/** Runs the clock in steps until the page says a condition holds, or fails after `limit` ms of replay time. */
export async function playUntil(page: Page, condition: string, limit = 60_000): Promise<number> {
  let ran = 0
  while (!(await page.evaluate(condition))) {
    if (ran >= limit) throw new Error(`After ${ran} ms of replay time: ${condition}`)
    await page.clock.runFor(250)
    ran += 250
  }
  return ran
}

export const AT_SUMMARY = `!!document.querySelector('.r-done') && [...document.querySelectorAll('[data-r-log] .r-t')].some((e) => e.textContent === 'Release gate')`

/** Each animation running in the replay's box, by name, duration and iterations. */
export const RUNNING = `(document.querySelector('${STAGE}')?.getAnimations({ subtree: true }) ?? []).map((a) => ({ name: a.animationName, duration: Number(a.effect.getTiming().duration), iterations: Number(a.effect.getTiming().iterations) }))`

/**
 * For another spec's shot of the band or the whole home: brings the replay in,
 * waits for its player, and goes back to the top, so the shot always holds
 * its drawn frame (the finished one, with reduced motion) and never catches it
 * loading mid-shot.
 */
export async function settleReplay(page: Page): Promise<void> {
  await page.evaluate(`document.querySelector('${FIGURE}').scrollIntoView()`)
  await expect(page.locator(`${FIGURE}.is-ready`)).toHaveCount(1, { timeout: 15_000 })
  await page.evaluate('window.scrollTo(0, 0)')
}
