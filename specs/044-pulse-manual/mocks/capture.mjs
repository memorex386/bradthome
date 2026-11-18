// Captures spec 044's "Show it" states from this slice's own build:
// `pnpm site:build`, then serve apps/site/dist on port 4344 (any static
// server: `python -m http.server 4344 --directory apps/site/dist`), then
// `node specs/044-pulse-manual/mocks/capture.mjs`. Chromium at 1x density,
// with reduced motion, at the brief's 375 × 812 and 1440 × 900. The API is a
// fake here, as in the tests: it answers the App Store alone, fetched at
// 15:00 UTC, and the clock is Nov 18, 2026 at 15:12 UTC, so "updated 12 min
// ago" reads the same each run. The tests' snapshots are the record.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(path.join(root, 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE ?? 'http://localhost:4344'
const API = 'https://chat-api-568431230204.us-central1.run.app/pulse'
const NOW = new Date('2026-11-18T15:12:00Z')
const LIVE = {
  appStore: { version: '12.7.9', released: '2026-11-17', rating: 4.7, ratings: 3254, fetched: '2026-11-18T15:00:00.000Z' },
}
const sizes = { phone: { width: 375, height: 812 }, desktop: { width: 1440, height: 900 } }
const browser = await chromium.launch()
const shot = (name) => path.join(here, `${name}.png`)
const CLEAN = '.ds-header, .chat-ask, .chat-corner { visibility: hidden !important; }'

async function capture(name, { url = '/', size, theme = 'light', script = true, answer = LIVE, how = false }) {
  const context = await browser.newContext({
    viewport: sizes[size],
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: 'reduce',
    javaScriptEnabled: script,
    bypassCSP: true,
  })
  const tab = await context.newPage()
  if (script) await tab.clock.setFixedTime(NOW)
  await tab.route(API, (route) =>
    answer === 'down'
      ? route.abort()
      : route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(answer),
        }),
  )
  await tab.goto(BASE + url)
  const target = tab.locator('#side-vindecoded')
  if (script) {
    await tab.addStyleTag({ content: CLEAN })
    await tab.evaluate(() => {
      for (const image of document.querySelectorAll('img[loading="lazy"]')) image.loading = 'eager'
    })
    await target.scrollIntoViewIfNeeded()
    await tab.waitForLoadState('networkidle')
  }
  if (how) await tab.locator('[data-pulse-how]').click()
  await tab.waitForTimeout(150)
  const box = await target.boundingBox()
  const scrolled = script ? await tab.evaluate(() => scrollY) : 0
  await tab.screenshot({ path: shot(name), fullPage: true, clip: { x: box.x, y: box.y + scrolled, width: box.width, height: box.height } })
  await context.close()
  console.log(`${name}: ${Math.round(box.width)} × ${Math.round(box.height)}`)
}

const only = process.env.ONLY?.split(',')
const run = (id) => only === undefined || only.includes(id)

if (run('M1'))
  for (const theme of ['light', 'dark'])
    for (const size of ['desktop', 'phone']) await capture(`M1-built-${size}-${theme}`, { size, theme, answer: 'down' })
if (run('M2'))
  for (const theme of ['light', 'dark']) for (const size of ['desktop', 'phone']) await capture(`M2-live-${size}-${theme}`, { size, theme })
if (run('M3')) await capture('M3-noscript-phone-light', { size: 'phone', script: false })
if (run('M4'))
  for (const [size, theme] of [
    ['desktop', 'light'],
    ['phone', 'dark'],
  ])
    await capture(`M4-how-open-${size}-${theme}`, { size, theme, how: true })
await browser.close()
