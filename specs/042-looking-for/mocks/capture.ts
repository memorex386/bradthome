// Captures spec 042's "Show it" states from a local preview of the production
// build: `pnpm site:build`, then
// `pnpm --filter @bradthome/site exec astro preview --port 4342`, then
// `node specs/042-looking-for/mocks/capture.ts`. Chromium at 1x density, with
// reduced motion, at the brief's 375 × 812 and 1440 × 900. The chat's answer
// is the fake API's, from spec 022's helper, in words written for the mock, so
// no model is called. The tests' snapshots, in the pinned container, are the
// record once the slice lands.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from '@playwright/test'
import { fakeApi } from '../../../tests/022/helpers/fake-api.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE ?? 'http://localhost:4342'
const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }
const THEMES = ['light', 'dark'] as const
const SIZES = { phone: PHONE, desktop: DESKTOP }

const browser = await chromium.launch()

async function open(size: { width: number; height: number }, theme: 'light' | 'dark') {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: 'reduce',
    // The page's CSP refuses the capture's one style, which hides the header over the section.
    bypassCSP: true,
  })
  return { context, tab: await context.newPage() }
}

const shot = (name: string) => path.join(here, `${name}.png`)

// The sticky header and the floating button would cover the section; hide them for section shots.
const CLEAN = '.ds-header, .chat-ask, .chat-corner { visibility: hidden !important; }'

async function capture(
  name: string,
  options: { url?: string; selector: string; size: { width: number; height: number }; theme: 'light' | 'dark'; pad?: number; to?: string },
) {
  const { url = '/', selector, size, theme, pad = 0, to } = options
  const { context, tab } = await open(size, theme)
  await tab.goto(BASE + url)
  await tab.addStyleTag({ content: CLEAN })
  await tab.evaluate(() => {
    for (const image of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) image.loading = 'eager'
  })
  const target = tab.locator(selector).first()
  await target.scrollIntoViewIfNeeded()
  await tab.waitForLoadState('networkidle')
  const box = await target.boundingBox()
  const end = to === undefined ? undefined : await tab.locator(to).first().boundingBox()
  if (box === null) throw new Error(`${selector} isn't on ${url}`)
  const top = box.y - pad + (await tab.evaluate(() => scrollY))
  const bottom = (end === null || end === undefined ? box.y + box.height : end.y + end.height) + pad + (await tab.evaluate(() => scrollY))
  await tab.screenshot({
    path: shot(name),
    fullPage: true,
    clip: { x: Math.max(0, box.x - pad), y: top, width: Math.min(size.width, box.width + pad * 2), height: bottom - top },
  })
  await context.close()
}

const only = process.env.ONLY?.split(',')
const run = (id: string) => only === undefined || only.includes(id)

// M1, M2: the section on the home, and on /fullstack with its track lit, in both themes at both sizes.
for (const [id, url, label] of [
  ['M1', '/', 'home'],
  ['M2', '/fullstack', 'fullstack'],
] as const) {
  for (const theme of run(id) ? THEMES : []) {
    for (const [size, viewport] of Object.entries(SIZES)) {
      await capture(`${id}-section-${label}-${size}-${theme}`, { url, selector: '#looking-for', size: viewport, theme })
    }
  }
}

// M3: the other role pages' tracks, each lit first.
for (const page of run('M3') ? (['mobile', 'ai'] as const) : []) {
  await capture(`M3-tracks-${page}-desktop-light`, {
    url: `/${page}`,
    selector: '#looking-for .fit__tracks',
    size: DESKTOP,
    theme: 'light',
    pad: 16,
  })
}

// M4: the section in place, from On the side's last card to Get in touch.
for (const [size, viewport] of run('M4') ? Object.entries(SIZES) : []) {
  await capture(`M4-in-place-${size}-light`, { selector: '#side-bradthome-com', to: '#contact', size: viewport, theme: 'light', pad: 16 })
}

// M5: interview prep's fixed card, in the gallery's held answered state (P3) and the named role (P4).
for (const theme of run('M5') ? THEMES : []) {
  for (const state of ['p3', 'p4']) {
    await capture(`M5-prep-card-${state}-${theme}`, { url: '/design-system', selector: `#prep-${state} .chat-frame`, size: DESKTOP, theme })
  }
}

// M6: one chat answer from the section's "Ask about this", with the fake API's reply citing the wants.
const SITE = 'https://bradthome.com'
const ANSWER =
  'Brad is looking for a Senior, Staff or Principal engineer or architect role, as an individual contributor who leads technically and mentors, at a small or medium, growth-stage company scaling a product people already use. Brad builds AI-first: agents write most of the code, and Brad owns the spec, the design, the review and the release. Brad is looking for work remote in the US, or in Dallas–Fort Worth, full-time or contract.'
const SOURCES = [
  { id: 'looking-for-role', url: `${SITE}/#looking-for-role`, label: 'Looking for · Role' },
  { id: 'looking-for-team', url: `${SITE}/#looking-for-team`, label: 'Looking for · Team' },
  { id: 'looking-for-build', url: `${SITE}/#looking-for-build`, label: 'Looking for · How I build' },
  { id: 'looking-for-where', url: `${SITE}/#looking-for-where`, label: 'Looking for · Where' },
]
for (const [size, viewport] of run('M6') ? Object.entries(SIZES) : []) {
  const { context, tab } = await open(viewport, 'light')
  await fakeApi(tab as unknown as Page, [{ kind: 'answer', text: ANSWER, sources: SOURCES }])
  await tab.goto(`${BASE}/`)
  await tab.locator('#looking-for .fit__ask').scrollIntoViewIfNeeded()
  await tab.locator('#looking-for .fit__ask').click()
  const box = tab.locator('dialog[data-chat-dialog] textarea')
  await box.waitFor()
  await tab.waitForTimeout(300)
  await tab.screenshot({ path: shot(`M6-ask-filled-${size}-light`) })
  await box.press('Enter')
  await tab.locator('dialog[data-chat-dialog]').getByText('Looking for · Where').waitFor()
  await tab.waitForTimeout(300)
  await tab.screenshot({ path: shot(`M6-chat-answer-${size}-light`) })
  await context.close()
}

await browser.close()
