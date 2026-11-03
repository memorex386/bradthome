import path from 'node:path'
import { expect, test } from '@playwright/test'
import { enter, FIXED_TIME, fontsSettled, STATES } from '../helpers/e2e.ts'
import { loadSiteReport } from '../helpers/modules.ts'

// Visual snapshots (FR-011, S2.4, S2.7, P1–P4, C2): the phone at 390×844 and
// the desktop at 1280×800, in light and dark, with reduced motion on, a fixed
// clock and no pixel tolerance (playwright.config.ts). They run only in the
// pinned container, where the baselines were made. Baselines are named by
// state, as in tests/snapshots/003/e2e/P1-home-phone-light.png, and come from
// pnpm test:visual --update at the build. A snapshot that differs fails with
// C2's message; any other failure, such as a missing baseline, keeps
// Playwright's own.

for (const state of STATES) {
  test(`S2.4 S2.7 FR-011 FR-014 ${state.id} C2 the page matches its baseline, at ${state.size} size in ${state.theme}`, async ({ page }, testInfo) => {
    const { snapshotMessage } = await loadSiteReport()
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await page.goto('/')
    await fontsSettled(page)
    const name = `${state.id}-home-${state.size}-${state.theme}.png`
    try {
      await expect(page).toHaveScreenshot(name, { fullPage: true })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      const pixels = Number((/([\d,]+) pixels? \(ratio/.exec(text)?.[1] ?? '0').replaceAll(',', ''))
      if (pixels === 0) throw error
      const diff = testInfo.attachments.find((attachment) => attachment.name.endsWith('-diff.png'))?.path
      throw new Error(snapshotMessage([{ state: state.label, pixels, diff: path.basename(diff ?? name.replace(/\.png$/, '-diff.png')) }]).join('\n'))
    }
  })
}
