// Captures spec 045's "Show it" states from a local preview of the production
// build: `pnpm site:build`, then
// `pnpm --filter @bradthome/site exec astro preview --port 4345`, then
// `node specs/045-chat-voice/mocks/capture.ts`. Chromium at 1x density, with
// reduced motion, at the brief's 375 × 812 and 1440 × 900, in both themes.
// Each answer is the fake API's, from spec 022's helper, in the words of the
// study's proposals (fixtures.ts's VOICED), so no model is called. The real
// model's replies are shown to Brad at Gate 2, and the tests' snapshots, in
// the pinned container, are the record once the slice lands.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from '@playwright/test'
import { VOICED } from '../../../apps/site/src/components/chat/fixtures.ts'
import { fakeApi } from '../../../tests/022/helpers/fake-api.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE ?? 'http://localhost:4345'
const SIZES = { phone: { width: 375, height: 812 }, desktop: { width: 1440, height: 900 } }
const THEMES = ['light', 'dark'] as const
const only = process.env.ONLY?.split(',')

const browser = await chromium.launch()

for (const [id, turn] of Object.entries(VOICED)) {
  if (only !== undefined && !only.includes(id)) continue
  for (const theme of THEMES) {
    for (const [size, viewport] of Object.entries(SIZES)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' })
      const tab = await context.newPage()
      const reply = { kind: 'answer', text: turn.text, sources: [...turn.sources], meta: turn.meta, next: turn.next } as const
      await fakeApi(tab as unknown as Page, [reply])
      await tab.goto(`${BASE}/`)
      await tab.locator('[data-chat-open]').first().click()
      const box = tab.locator('dialog[data-chat-dialog] textarea')
      await box.waitFor()
      await box.fill(turn.question)
      await box.press('Enter')
      await tab.locator('dialog[data-chat-dialog] .chat__pill').first().waitFor()
      await tab.waitForTimeout(300)
      await tab.screenshot({ path: path.join(here, `${id}-${size}-${theme}.png`) })
      await context.close()
    }
  }
}

await browser.close()
