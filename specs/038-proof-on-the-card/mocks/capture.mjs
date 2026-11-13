// Captures spec 038's "Show it" states from a local preview of the production
// build: `pnpm site:build`, then `pnpm --filter @bradthome/site exec astro
// preview --port 4338`, then `node specs/038-proof-on-the-card/mocks/capture.mjs`.
// Chromium at 1x density, with reduced motion except where a state needs
// motion. The tests' snapshots, in the pinned container, are the record.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, '..', '..', '..', 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE ?? 'http://localhost:4338'
const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 800 }
const THEMES = ['light', 'dark']

const browser = await chromium.launch()

async function page({ size, theme = 'light', motion = 'reduce', script = true }) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
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

async function card(name, { url = '/', selector, size, theme, pad = 16 }) {
  const { context, tab } = await page({ size, theme })
  await tab.goto(BASE + url)
  await tab.addStyleTag({ content: CLEAN })
  const target = tab.locator(selector).first()
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  await tab.screenshot({
    path: shot(name),
    fullPage: true,
    clip: { x: Math.max(0, box.x - pad), y: box.y - pad + (await tab.evaluate(() => scrollY)), width: Math.min(size.width, box.width + pad * 2), height: box.height + pad * 2 },
  })
  await context.close()
}

const sizes = { phone: PHONE, desktop: DESKTOP }

// ONLY=M9,M10 runs just those groups.
const only = process.env.ONLY?.split(',')
const run = (id) => only === undefined || only.includes(id)

// M1–M4: the cards at rest.
for (const theme of run('M1') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M1-hopper-${size}-${theme}`, { selector: '#hopper', size: viewport, theme, pad: 0 })
    await card(`M2-bleacher-report-${size}-${theme}`, { selector: '#experience-bleacher-report', size: viewport, theme })
    await card(`M3-vindecoded-${size}-${theme}`, { selector: '#side-vindecoded', size: viewport, theme })
    await card(`M4-bradthome-com-${size}-${theme}`, { selector: '#side-bradthome-com', size: viewport, theme })
  }
}

// M5: a sparkle's hover and keyboard focus, on the page and in the band, with motion allowed.
for (const theme of run('M5') ? THEMES : []) {
  for (const [state, id] of [
    ['hover', 'receipt-bleacher-report-2'],
    ['focus', 'receipt-bleacher-report-2'],
    ['hover-band', 'receipt-hopper-disruption-assistance-3'],
    ['focus-band', 'receipt-hopper-disruption-assistance-3'],
  ]) {
    const { context, tab } = await page({ size: DESKTOP, theme, motion: 'no-preference' })
    await tab.goto(BASE + '/')
    await tab.addStyleTag({ content: CLEAN })
    const ask = tab.locator(`#${id} .ds-claim-ask`)
    await ask.scrollIntoViewIfNeeded()
    await tab.evaluate(() => window.scrollBy(0, -200))
    if (state.startsWith('hover')) await ask.hover()
    else {
      // Tab to the sparkle from the element before it, so :focus-visible shows.
      await ask.evaluate((el) => {
        const all = [...document.querySelectorAll('a[href], button')]
        const before = all[all.indexOf(el) - 1]
        before?.focus()
      })
      await tab.keyboard.press('Tab')
    }
    await tab.waitForTimeout(400)
    const claim = tab.locator(`#${id}`)
    const box = await claim.boundingBox()
    await tab.screenshot({ path: shot(`M5-${state}-desktop-${theme}`), clip: { x: box.x - 24, y: box.y - 56, width: box.width + 48, height: box.height + 80 } })
    await context.close()
  }
}

// M6: the chat opened from a sparkle, its question in the box, unsent.
for (const [size, viewport] of run('M6') ? Object.entries(sizes) : []) {
  const { context, tab } = await page({ size: viewport })
  await tab.goto(BASE + '/')
  const ask = tab.locator('#receipt-hopper-partner-platform-1 .ds-claim-ask')
  await ask.scrollIntoViewIfNeeded()
  await ask.click()
  await tab.locator('[data-chat-dialog] textarea').waitFor()
  await tab.waitForTimeout(600)
  await tab.screenshot({ path: shot(`M6-chat-from-sparkle-${size}-light`) })
  await context.close()
}

// M7: a chat source link lands on its claim, which tints: with motion (caught early) and reduced.
for (const [size, viewport] of run('M7') ? Object.entries(sizes) : []) {
  for (const motion of ['reduce', 'no-preference']) {
    const { context, tab } = await page({ size: viewport, motion })
    await tab.goto(BASE + '/#receipt-hopper-fintech-ai-1')
    await tab.waitForTimeout(motion === 'reduce' ? 600 : 150)
    await tab.screenshot({ path: shot(`M7-landing-${size}-${motion === 'reduce' ? 'reduced' : 'motion'}`) })
    await context.close()
  }
}

// M8: a role page, /fullstack, its Hopper band first topic and its sources.
for (const theme of run('M8') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await card(`M8-fullstack-hopper-${size}-${theme}`, { url: '/fullstack', selector: '#hopper .hopper__topic', size: viewport, theme })
  }
}

// M9: no script. The sparkle is a plain link to the contact section. Page
// script is off, so nothing here evaluates in the page, and the header stays.
for (const [size, viewport] of run('M9') ? Object.entries(sizes) : []) {
  const { context, tab } = await page({ size: viewport, script: false })
  await tab.goto(BASE + '/')
  await tab.locator('#hopper .hopper__topic').nth(1).screenshot({ path: shot(`M9-noscript-${size}-light`) })
  await tab.locator('#receipt-hopper-partner-platform-1 .ds-claim-ask').click()
  await tab.waitForURL(/#contact$/)
  await tab.screenshot({ path: shot(`M9-noscript-contact-${size}-light`) })
  await context.close()
}

// M10: the gallery's new section, in both themes.
for (const theme of run('M10') ? THEMES : []) {
  for (const id of ['proof', 'proof-band']) {
    const { context, tab } = await page({ size: DESKTOP, theme })
    await tab.goto(BASE + '/design-system')
    await tab.addStyleTag({ content: '.ds-header { visibility: hidden !important; }' })
    const target = tab.locator(`#${id}`)
    await target.scrollIntoViewIfNeeded()
    await target.screenshot({ path: shot(`M10-gallery-${id}-${theme}`) })
    await context.close()
  }
}

await browser.close()
console.log('captured')
