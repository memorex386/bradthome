import { defineConfig } from '@playwright/test'

// The end-to-end tests (FR-010, FR-011, S2.3, S2.4, S2.7, S4.1): the page,
// accessibility, visual snapshots and headers, against the built site served
// by the Firebase Hosting emulator. They run only inside the pinned Playwright
// container, in CI's e2e job and through pnpm test:visual on Brad's PC, which
// set BRADTHOME_CONTAINER=1. Snapshots match only there, and the emulator
// drops every header on Windows.

if (process.env.BRADTHOME_CONTAINER !== '1') {
  throw new Error(
    'The end-to-end tests run only in the pinned Playwright container. Run pnpm test:visual, which starts it through Docker.',
  )
}

const PORT = 5000

export default defineConfig({
  testDir: 'tests',
  testMatch: '*/e2e/**/*.test.ts',
  // Baselines sit outside the locked test folders, so a new baseline doesn't
  // change a lock: tests/snapshots/003/e2e/P1-home-phone-light.png.
  snapshotPathTemplate: '{testDir}/snapshots/{testFileDir}/{arg}{ext}',
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  webServer: {
    command: `pnpm exec firebase emulators:start --only hosting --project demo-bradthome`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
