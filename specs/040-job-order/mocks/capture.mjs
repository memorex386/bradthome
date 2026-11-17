// Captures spec 040's "Show it" states from a local preview of the production
// build: `pnpm test:visual`'s container builds the site and prints the
// résumé PDFs into apps/site/dist, then `pnpm --filter @bradthome/site exec
// astro preview --port 4340` serves it, then
// `node specs/040-job-order/mocks/capture.mjs`. Chromium at 1x density, with
// reduced motion, at the brief's 375 × 812 and 1440 × 900. The tests'
// snapshots, in the pinned container, are the record.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..', '..')
const require = createRequire(path.join(root, 'package.json'))
const { chromium } = require('@playwright/test')

const BASE = process.env.BASE ?? 'http://localhost:4340'
const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }
const THEMES = ['light', 'dark']
const sizes = { phone: PHONE, desktop: DESKTOP }

const browser = await chromium.launch()

async function open({ size, theme = 'light', script = true }) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: 'reduce',
    javaScriptEnabled: script,
    // The page's CSP refuses the capture's one style, which hides the header over a card.
    bypassCSP: true,
  })
  return { context, tab: await context.newPage() }
}

const shot = (name) => path.join(here, `${name}.png`)

// The sticky header and the floating button would cover a card; hide them for card shots.
const CLEAN = '.ds-header, .chat-ask, .chat-corner { visibility: hidden !important; }'

async function capture(name, { url = '/', selector, size, theme, pad = 0, before }) {
  const { context, tab } = await open({ size, theme })
  await tab.goto(BASE + url)
  await tab.addStyleTag({ content: CLEAN })
  await tab.evaluate(() => {
    for (const image of document.querySelectorAll('img[loading="lazy"]')) image.loading = 'eager'
  })
  if (before) await before(tab)
  const target = tab.locator(selector).first()
  await target.scrollIntoViewIfNeeded()
  await tab.waitForLoadState('networkidle')
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

// ONLY=M1,M6 runs just those groups.
const only = process.env.ONLY?.split(',')
const run = (id) => only === undefined || only.includes(id)

// M1, M2: the Experience section on the home and on a role page, with RealPage's card in place.
for (const [id, url, label] of [
  ['M1', '/', 'home'],
  ['M2', '/mobile', 'mobile'],
]) {
  for (const theme of run(id) ? THEMES : []) {
    for (const [size, viewport] of Object.entries(sizes)) {
      await capture(`${id}-experience-${label}-${size}-${theme}`, { url, selector: '#experience', size: viewport, theme })
    }
  }
}

// M3: RealPage's card itself: its kicker, its sentence with its sparkle, and its tag row.
for (const theme of run('M3') ? THEMES : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await capture(`M3-realpage-${size}-${theme}`, { selector: '#experience-realpage', size: viewport, theme, pad: 16 })
  }
}

// M3b: the other choice, set in the built page for comparison: the tech claim as its own line, with its sparkle,
// between the sentence and the tag row, as BookShout's second claim sits.
const TECH = 'Worked in Kotlin, Java and RxJava.'
for (const [size, viewport] of run('M3') ? Object.entries(sizes) : []) {
  await capture(`M3b-realpage-tech-line-${size}-light`, {
    selector: '#experience-realpage',
    size: viewport,
    theme: 'light',
    pad: 16,
    before: (tab) =>
      tab.evaluate((words) => {
        const first = document.querySelector('#receipt-realpage-2')
        const line = first.cloneNode(true)
        line.id = 'receipt-realpage-3'
        line.dataset.claim = 'realpage-3'
        const end = line.querySelector('.ds-claim__end')
        const last = words.split(' ').at(-1)
        for (const node of [...line.childNodes]) if (node !== end) node.remove()
        end.firstChild.textContent = last
        line.insertBefore(document.createTextNode(`${words.slice(0, -last.length)}`), end)
        line.querySelector('.ds-claim-ask').setAttribute('aria-label', 'Ask about this: Kotlin, Java and RxJava')
        first.after(line)
      }, TECH),
  })
}

// M4: the heading's options, set in the built page for comparison: the proposal, as built, and today's words.
const HEADINGS = {
  proposed: 'Android for brands, a startup, real-estate apps and a sports media platform',
  today: 'Android for brands, a startup and a sports media platform',
}
for (const [option, words] of run('M4') ? Object.entries(HEADINGS) : []) {
  for (const [size, viewport] of Object.entries(sizes)) {
    await capture(`M4-heading-${option}-${size}-light`, {
      selector: '#experience .experience__head',
      size: viewport,
      theme: 'light',
      pad: 16,
      before: (tab) => tab.evaluate((text) => (document.querySelector('#experience-heading').textContent = text), words),
    })
  }
}

// M5: the kicker's options on RealPage's card, set in the built page for comparison.
const KICKERS = { 'real-estate-apps': 'Real-estate apps', 'real-estate': 'Real estate' }
for (const [option, words] of run('M5') ? Object.entries(KICKERS) : []) {
  await capture(`M5-kicker-${option}-phone-light`, {
    selector: '#experience-realpage .experience__card-head',
    size: PHONE,
    theme: 'light',
    pad: 16,
    before: (tab) =>
      tab.evaluate((text) => {
        const kicker = document.querySelector('#experience-realpage .ds-card__kicker')
        kicker.textContent = kicker.textContent.replace(/^[^·]+·/, `${text} ·`)
      }, words),
  })
}

// M6: page 2 of each résumé PDF, where RealPage prints, drawn by PDF.js in Chromium from the build's own files: the
// build's, and with PDF_BOTH naming a folder of PDFs printed with both of RealPage's lines, those too, as M6b.
const FILES = { mobile: 'brad-thome-mobile.pdf', fullstack: 'brad-thome-full-stack.pdf', ai: 'brad-thome-applied-ai.pdf' }
const PDFJS = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
const SETS = [
  ['M6-pdf', path.join(root, 'apps', 'site', 'dist', 'resume')],
  ...(process.env.PDF_BOTH ? [['M6b-pdf-both-lines', process.env.PDF_BOTH]] : []),
]
for (const [prefix, folder, role, file] of run('M6')
  ? SETS.flatMap(([prefix, folder]) => Object.entries(FILES).map(([role, file]) => [prefix, folder, role, file]))
  : []) {
  const context = await browser.newContext({ viewport: { width: 960, height: 1300 }, deviceScaleFactor: 1 })
  // The drawing page, PDF.js and the PDF all come from one made-up origin that the route serves from disk.
  const html = `<!doctype html><html><body style="margin:0;background:#e9e6e0"><canvas id="page"></canvas>
    <script type="module">
      import * as pdfjs from '/pdf.mjs'
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
      const doc = await pdfjs.getDocument({ url: '/${file}' }).promise
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
  console.log(prefix, role, 'pages', await tab.evaluate(() => window.pages))
  await tab.locator('#page').screenshot({ path: shot(`${prefix}-${role}-page-2`) })
  await context.close()
}

// M7: a link to RealPage's first claim lands on it with its tint, as the corpus will send it, and the job's own
// link, which the deployed chat sends today, lands on the card.
if (run('M7')) {
  for (const [name, hash] of [
    ['M7-landed-receipt-realpage-2-desktop-light', '#receipt-realpage-2'],
    ['M7-landed-experience-realpage-desktop-light', '#experience-realpage'],
  ]) {
    const { context, tab } = await open({ size: DESKTOP, theme: 'light' })
    await tab.goto(`${BASE}/${hash}`)
    await tab.waitForLoadState('networkidle')
    await tab.mouse.move(0, 0)
    await tab.screenshot({ path: shot(name) })
    await context.close()
  }
}

// The page heights at the sizes the brief names.
if (run('H')) {
  for (const url of ['/', '/mobile', '/fullstack', '/ai']) {
    for (const viewport of [DESKTOP, PHONE]) {
      const { context, tab } = await open({ size: viewport })
      await tab.goto(BASE + url)
      const heights = await tab.evaluate(() => ({
        page: document.documentElement.scrollHeight,
        experience: Math.round(document.getElementById('experience').getBoundingClientRect().height),
      }))
      console.log(url, viewport.width, JSON.stringify(heights))
      await context.close()
    }
  }
}

await browser.close()
console.log('captured')
