import path from 'node:path'
import { expect, test } from '@playwright/test'
import { enter, FIXED_TIME, fontsSettled, STATES } from '../../003/helpers/e2e.ts'
import { loadSiteReport } from '../../003/helpers/modules.ts'
import { PATH } from '../helpers/essay.ts'

// The essay's visual snapshots (FR-009, S4.3, E1–E4): the whole page at phone
// 390×844 and desktop 1280×800, in light and dark, with spec 003's settings
// (playwright.config.ts) in the pinned container. Baselines are named by
// state, as in tests/snapshots/006/e2e/E1-essay-phone-light.png, and come from
// pnpm test:visual --update. A snapshot that differs fails with C2's message.

const IDS = { P1: 'E1', P2: 'E2', P3: 'E3', P4: 'E4' } as const

for (const state of STATES) {
  const id = IDS[state.id]
  test(`S4.3 FR-009 ${id} the essay matches its baseline, at ${state.size} size in ${state.theme}`, async ({ page }, testInfo) => {
    // The essay is 14,000 to 16,000 pixels tall, and a full-page capture can
    // take a few seconds, so Playwright gets time for the captures it needs
    // until two in a row match.
    test.setTimeout(120_000)
    const { snapshotMessage } = await loadSiteReport()
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await page.goto(PATH)
    await fontsSettled(page)
    const name = `${id}-essay-${state.size}-${state.theme}.png`
    try {
      await expect(page).toHaveScreenshot(name, { fullPage: true, timeout: 60_000 })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      const pixels = Number((/([\d,]+) pixels? \(ratio/.exec(text)?.[1] ?? '0').replaceAll(',', ''))
      if (pixels === 0) throw error
      const diff = testInfo.attachments.find((attachment) => attachment.name.endsWith('-diff.png'))?.path
      const label = `${id} essay, ${state.size}, ${state.theme}`
      throw new Error(snapshotMessage([{ state: label, pixels, diff: path.basename(diff ?? name.replace(/\.png$/, '-diff.png')) }]).join('\n'))
    }
  })
}
