// Captures spec 041's "Show it" states from a local preview of the build:
// `pnpm site:build`, then `pnpm --filter @bradthome/site exec astro preview
// --port 4341`, then `node specs/041-vindecoded-pulse/mocks/capture.mjs`.
// Chromium at 1x density, with reduced motion, at the brief's 375 × 812 and
// 1440 × 900. The API is a fake here, as in the tests: its answer is fixed,
// and the clock is Nov 17, 2026 at 15:12 UTC, so "updated 12 min ago" and
// "7 days ago" read the same each run. The tests' snapshots are the record.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(path.join(root, 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE ?? 'http://localhost:4341'
const API = 'https://chat-api-568431230204.us-central1.run.app/pulse'
const NOW = new Date('2026-11-17T15:12:00Z')
const LIVE = {
  appStore: { version: '12.7.8', released: '2026-11-10', rating: 4.7, ratings: 3254, fetched: '2026-11-17T15:00:00.000Z' },
  github: { merged: 296, days: 30, fetched: '2026-11-17T15:00:00.000Z' },
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
  // With no script the page can't take a style or a scroll from the capture; a full-page shot from the top leaves the header above the card.
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
  const height = Math.round(box.height)
  await context.close()
  console.log(`${name}: ${Math.round(box.width)} × ${height}`)
}

const only = process.env.ONLY?.split(',')
const run = (id) => only === undefined || only.includes(id)

if (run('M1'))
  for (const theme of ['light', 'dark'])
    for (const size of ['desktop', 'phone']) await capture(`M1-live-home-${size}-${theme}`, { size, theme })
if (run('M2'))
  for (const [size, theme] of [
    ['desktop', 'light'],
    ['phone', 'dark'],
  ])
    await capture(`M2-live-mobile-${size}-${theme}`, { url: '/mobile', size, theme })
if (run('M3')) for (const size of ['desktop', 'phone']) await capture(`M3-noscript-${size}-light`, { size, script: false })
if (run('M4')) for (const size of ['desktop', 'phone']) await capture(`M4-api-down-${size}-light`, { size, answer: 'down' })
if (run('M5')) await capture('M5-github-missing-desktop-light', { size: 'desktop', answer: { appStore: LIVE.appStore } })
if (run('M6'))
  for (const [size, theme] of [
    ['desktop', 'light'],
    ['desktop', 'dark'],
    ['phone', 'light'],
  ])
    await capture(`M6-how-open-${size}-${theme}`, { size, theme, how: true })

// M7: page 2 of the mobile résumé PDF, the tightest, where VINDecoded prints, drawn by PDF.js in Chromium. PDF_SETS
// names folders of PDFs printed in the pinned container, as name=folder pairs split by ';', such as the build's.
const PDFJS = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
const SETS = (process.env.PDF_SETS ?? `build=${path.join(root, 'apps', 'site', 'dist', 'resume')}`)
  .split(';')
  .map((pair) => pair.split('='))
for (const [label, folder] of run('M7') ? SETS : []) {
  const context = await browser.newContext({ viewport: { width: 960, height: 1300 }, deviceScaleFactor: 1 })
  const html = `<!doctype html><html><body style="margin:0;background:#e9e6e0"><canvas id="page"></canvas>
    <script type="module">
      import * as pdfjs from '/pdf.mjs'
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
      const doc = await pdfjs.getDocument({ url: '/brad-thome-mobile.pdf' }).promise
      window.pages = doc.numPages
      const page = await doc.getPage(2)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.getElementById('page')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      window.drawn = true
    </script></body></html>`
  await context.route('https://pdf.test/**', (route) => {
    const name = new URL(route.request().url()).pathname.slice(1)
    if (name === 'index.html') return route.fulfill({ body: html, contentType: 'text/html' })
    const body = name.endsWith('.pdf') ? readFileSync(path.join(folder, name)) : readFileSync(path.join(PDFJS, name))
    return route.fulfill({ body, contentType: name.endsWith('.pdf') ? 'application/pdf' : 'text/javascript' })
  })
  const tab = await context.newPage()
  await tab.goto('https://pdf.test/index.html')
  await tab.waitForFunction(() => window.drawn === true, undefined, { timeout: 30000 })
  console.log(`M7-pdf-mobile-page-2-${label}: ${await tab.evaluate(() => window.pages)} pages`)
  await tab.locator('#page').screenshot({ path: shot(`M7-pdf-mobile-page-2-${label}`) })
  await context.close()
}
await browser.close()
