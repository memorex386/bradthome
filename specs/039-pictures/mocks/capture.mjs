// Captures spec 039's "Show it" states from a local preview of the production
// build: `pnpm site:build`, then `pnpm --filter @bradthome/site exec astro
// preview --port 4339`, then `node specs/039-pictures/mocks/capture.mjs`.
// Chromium at 1x density, with reduced motion. The tests' snapshots, in the
// pinned container, are the record.
import { copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(path.join(root, 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE ?? 'http://localhost:4339'
const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 800 }
const THEMES = ['light', 'dark']
const sizes = { phone: PHONE, desktop: DESKTOP }

const browser = await chromium.launch()

async function page({ size, theme = 'light', motion = 'reduce', script = true, scale = 1 }) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: scale,
    colorScheme: theme,
    reducedMotion: motion,
    javaScriptEnabled: script,
    // The page's CSP refuses the capture's one style, which hides the header over a card.
    bypassCSP: true,
  })
  const tab = await context.newPage()
  return { context, tab }
}

const shot = (name) => path.join(here, `${name}.png`)

// The sticky header and the floating button would cover a card; hide them for card shots.
const CLEAN = `
  .ds-header, .chat-ask, .chat-corner { visibility: hidden !important; }
`

async function card(name, { url = '/', selector, size, theme, pad = 16, script = true, before }) {
  const { context, tab } = await page({ size, theme, script })
  await tab.goto(BASE + url)
  if (script) await tab.addStyleTag({ content: CLEAN })
  if (before) await before(tab)
  const target = tab.locator(selector).first()
  await target.scrollIntoViewIfNeeded()
  if (!script) {
    // Page script is off, so nothing here evaluates in the page: the element's own shot, and the header stays.
    await target.screenshot({ path: shot(name) })
    await context.close()
    return
  }
  const box = await target.boundingBox()
  await tab.screenshot({
    path: shot(name),
    fullPage: true,
    clip: {
      x: Math.max(0, box.x - pad),
      y: box.y - pad + (await tab.evaluate(() => scrollY)),
      width: Math.min(size.width, box.width + pad * 2),
      height: box.height + pad * 2,
    },
  })
  await context.close()
}

// ONLY=M5,M7 runs just those groups.
const only = process.env.ONLY?.split(',')
const run = (id) => only === undefined || only.includes(id)

// M1–M4, M6: the pictures at rest, on the home.
for (const theme of run('M1') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M1-hopper-${size}-${theme}`, { selector: '#hopper', size: viewport, theme, pad: 0 })
  }
}
for (const theme of run('M2') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M2-mobile-remoteui-${size}-${theme}`, { url: '/mobile', selector: '#hopper .hopper__topic', size: viewport, theme })
  }
}
for (const theme of run('M3') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M3-bleacher-report-${size}-${theme}`, { selector: '#experience-bleacher-report', size: viewport, theme })
  }
}
for (const theme of run('M4') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M4-side-${size}-${theme}`, { selector: '#side', size: viewport, theme, pad: 0 })
  }
}

// M5: "Get in touch" with Brad's photo, 76 px on a desktop and 64 px on a phone.
for (const theme of run('M5') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M5-contact-photo-${size}-${theme}`, { selector: '#contact', size: viewport, theme, pad: 0 })
  }
}

for (const theme of run('M6') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M6-footer-${size}-${theme}`, { selector: '.ds-footer', size: viewport, theme, pad: 0 })
  }
}

// M7: each share card as the build drew it, and the home's in a pasted link's preview.
if (run('M7')) {
  for (const id of ['home', 'mobile', 'fullstack', 'ai', 'vindecoded-agents', 'evals']) {
    copyFileSync(path.join(root, 'apps', 'site', 'dist', 'share', `${id}.png`), shot(`M7-share-${id}`))
  }
  for (const id of ['home', 'vindecoded-agents']) {
    const { context, tab } = await page({ size: { width: 520, height: 520 } })
    await tab.goto(BASE + (id === 'home' ? '/' : '/vindecoded-agents'))
    const meta = await tab.evaluate(() => ({
      title: document.querySelector('meta[property="og:title"]').content,
      description: document.querySelector('meta[property="og:description"]').content,
      image: new URL(document.querySelector('meta[property="og:image"]').content).pathname,
      host: new URL(document.querySelector('meta[property="og:url"]').content).host,
    }))
    await tab.setContent(`<!doctype html><html><body style="margin:0;padding:24px;background:#eef0f3;font:14px/1.4 system-ui,sans-serif">
      <div style="max-width:420px;padding:10px;border-radius:18px 18px 18px 6px;background:#fff;border:1px solid #dcdfe4">
        <div style="color:#2a55e5;text-decoration:underline;margin:0 0 8px">${meta.host}${id === 'home' ? '' : '/vindecoded-agents'}</div>
        <div style="border:1px solid #dcdfe4;border-radius:12px;overflow:hidden;background:#f6f7f9">
          <img src="${BASE}${meta.image}" width="400" height="210" style="display:block;width:100%;height:auto;border-bottom:1px solid #dcdfe4" alt="">
          <div style="padding:10px 12px"><b style="display:block;color:#111318">${meta.title}</b><span style="color:#5b6270">${meta.description.slice(0, 140)}…</span><small style="display:block;color:#858b96;margin-top:4px">${meta.host}</small></div>
        </div>
      </div></body></html>`)
    await tab.waitForLoadState('networkidle')
    await tab.locator('body > div').screenshot({ path: shot(`M7-unfurl-${id}`) })
    await context.close()
  }
}

// M8: the site icon in a light and a dark browser tab at 16 px, larger, and on
// a phone's home screen, from the gallery, at 1x and 2x.
for (const scale of run('M8') ? [1, 2] : []) {
  const { context, tab } = await page({ size: DESKTOP, scale })
  await tab.goto(BASE + '/design-system')
  await tab.addStyleTag({ content: CLEAN })
  const row = tab.locator('.g-icons')
  await row.scrollIntoViewIfNeeded()
  await row.screenshot({ path: shot(`M8-site-icon-${scale}x`) })
  await context.close()
}

// M9: no script. The diagrams, marks and icons need none.
for (const [size, viewport] of run('M9') ? Object.entries(sizes) : []) {
  await card(`M9-noscript-capital-one-${size}-light`, { selector: '#hopper .hopper__topic', size: viewport, theme: 'light', script: false })
  await card(`M9-noscript-side-${size}-light`, { selector: '#side-vindecoded', size: viewport, theme: 'light', script: false })
}

// M10: the gallery's new sections, in both themes.
for (const theme of run('M10') ? THEMES : []) {
  for (const id of ['pictures', 'pictures-band']) {
    const { context, tab } = await page({ size: DESKTOP, theme })
    await tab.goto(BASE + '/design-system')
    await tab.addStyleTag({ content: '.ds-header, .chat-ask, .chat-corner { visibility: hidden !important; }' })
    await tab.evaluate(() => {
      for (const image of document.querySelectorAll('img[loading="lazy"]')) image.loading = 'eager'
    })
    const target = tab.locator(`#${id}`)
    await target.scrollIntoViewIfNeeded()
    await tab.waitForLoadState('networkidle')
    await target.screenshot({ path: shot(`M10-gallery-${id}-${theme}`) })
    await context.close()
  }
}

// The page and band heights, at the sizes the study measured live v2.9.0 at.
if (run('H')) {
  for (const url of ['/', '/mobile', '/fullstack', '/ai']) {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 375, height: 812 },
    ]) {
      const { context, tab } = await page({ size: viewport })
      await tab.goto(BASE + url)
      const heights = await tab.evaluate(() => ({
        page: document.documentElement.scrollHeight,
        band: Math.round(document.getElementById('hopper').getBoundingClientRect().height),
      }))
      console.log(url, viewport.width, JSON.stringify(heights))
      await context.close()
    }
  }
}

await browser.close()
console.log('captured')
