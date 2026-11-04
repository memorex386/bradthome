import path from 'node:path'
import { expect, test } from '@playwright/test'
import { enter, FIXED_TIME, fontsSettled, MISSING, STATES } from '../../003/helpers/e2e.ts'
import { loadSiteReport } from '../../003/helpers/modules.ts'

// The 404 page's visual snapshots (FR-009, S4.3, N1, N2): the whole page at
// phone 390×844 and desktop 1280×800, in light and dark, with spec 003's
// settings (playwright.config.ts) in the pinned container. The home page's
// snapshots are spec 003's and the essay's are spec 006's. Baselines are
// named by state, as in tests/snapshots/007/e2e/404-phone-light.png, and
// come from pnpm test:visual --update. A snapshot that differs fails with
// C2's message.

for (const state of STATES) {
  test(`S4.3 FR-009 the 404 page matches its baseline, at ${state.size} size in ${state.theme}`, async ({ page }, testInfo) => {
    const { snapshotMessage } = await loadSiteReport()
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await page.goto(MISSING)
    await fontsSettled(page)
    const name = `404-${state.size}-${state.theme}.png`
    try {
      await expect(page).toHaveScreenshot(name, { fullPage: true })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      const pixels = Number((/([\d,]+) pixels? \(ratio/.exec(text)?.[1] ?? '0').replaceAll(',', ''))
      if (pixels === 0) throw error
      const diff = testInfo.attachments.find((attachment) => attachment.name.endsWith('-diff.png'))?.path
      const label = `404, ${state.size}, ${state.theme}`
      throw new Error(
        snapshotMessage([{ state: label, pixels, diff: path.basename(diff ?? name.replace(/\.png$/, '-diff.png')) }]).join('\n'),
      )
    }
  })
}
