import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Route } from '@playwright/test'
import { CARD_IDS, type CardId, FOLDER, HEIGHT, WIDTH } from '../../apps/site/src/components/share/share.ts'

// The share cards (spec 039, D232). Astro builds a print page for each card in
// dist/share, and this integration draws each one into its 1200 × 630 PNG with
// Playwright's Chromium, then removes the print pages, so the site serves the
// PNGs alone, as the résumé PDFs' integration does (D139). The page loads only
// the build's own files, served from dist with every other request refused,
// so drawing a card needs no network. Each card is drawn twice and the bytes
// must match, so any build of the same tree serves the same files.
//
// Chromium comes with the pinned Playwright container, where CI's and the
// release's builds run. A build in CI without it fails. A build elsewhere
// without it, such as a test's build on a runner with no browser, says so and
// leaves the cards out; the share tags still name bradthome.com's.

/** The made-up address the print pages load from; every request to another fails. */
export const ORIGIN = 'http://share-cards.invalid'

/** The most a card may weigh, so every app that unfurls a link takes it. */
export const MAX_BYTES = 300 * 1024

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/** A card's print page and its PNG, as paths inside dist. */
export const JOBS: readonly { id: CardId; source: string; output: string }[] = CARD_IDS.map((id) => ({
  id,
  source: `${FOLDER}/${id}.html`,
  output: `${FOLDER}/${id}.png`,
}))

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

/** The build's assets a page names, as "_astro/…" paths. */
export function assetsOf(html: string): string[] {
  return [...new Set([...html.matchAll(/\/(_astro\/[\w.\-/]+)/g)].map((match) => match[1] ?? ''))]
}

/**
 * Removes the print pages from dist, and any asset only they named, so the
 * site serves the cards and nothing a visitor would never load.
 */
export function clean(dist: string): void {
  const named = new Set<string>()
  for (const job of JOBS) {
    const page = path.join(dist, job.source)
    if (!existsSync(page)) continue
    for (const asset of assetsOf(readFileSync(page, 'utf8'))) named.add(asset)
    rmSync(page, { force: true })
  }
  const rest = filesIn(dist)
    .filter((file) => /\.(html|css|js)$/.test(file))
    .map((file) => readFileSync(file, 'utf8'))
  for (const asset of named) {
    const base = path.posix.basename(asset)
    if (!rest.some((text) => text.includes(base))) rmSync(path.join(dist, asset), { force: true })
  }
  const folder = path.join(dist, FOLDER)
  if (existsSync(folder) && readdirSync(folder).length === 0) rmSync(folder, { recursive: true })
}

/** Serves a request from dist, or refuses it: nothing leaves the machine. */
async function serve(route: Route, dist: string, refused: string[]): Promise<void> {
  const url = new URL(route.request().url())
  if (url.origin !== ORIGIN) {
    refused.push(url.href)
    await route.abort('blockedbyclient')
    return
  }
  const file = path.join(dist, decodeURIComponent(url.pathname))
  const inside = path.relative(dist, file)
  if (inside.startsWith('..') || path.isAbsolute(inside) || !existsSync(file) || !statSync(file).isFile()) {
    refused.push(url.href)
    await route.fulfill({ status: 404, body: '' })
    return
  }
  await route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', body: readFileSync(file) })
}

/** What's wrong with a card as the page laid it out, or nothing: its size, its fonts, and anything past its edges. */
const LAYOUT_CHECK = `(() => {
  const card = document.querySelector('.share')
  if (!card) return 'the page has no card'
  const box = card.getBoundingClientRect()
  if (box.width !== ${WIDTH} || box.height !== ${HEIGHT}) return 'the card is ' + box.width + ' × ' + box.height
  const root = getComputedStyle(document.documentElement)
  const loaded = new Set([...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/^["']|["']$/g, '')))
  for (const name of ['--font-inter-tight', '--font-inter', '--font-jetbrains-mono']) {
    const family = root.getPropertyValue(name).split(',')[0].trim().replace(/^["']|["']$/g, '')
    if (!loaded.has(family)) return 'the font ' + family + ' did not load'
  }
  for (const element of card.querySelectorAll('*')) {
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (rect.left < box.left || rect.top < box.top || rect.right > box.right || rect.bottom > box.bottom)
      return (element.className || element.tagName) + ' reaches past the card'
    if (getComputedStyle(element).display !== 'inline' && element.scrollWidth > element.clientWidth + 1)
      return (element.className || element.tagName) + "'s words run past its box"
  }
  return ''
})()`

/** Draws one card in a fresh context, and fails on a request that left dist or a card that doesn't fit. */
async function draw(browser: Browser, dist: string, id: CardId): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })
  const refused: string[] = []
  try {
    await context.route('**/*', (route) => serve(route, dist, refused))
    const page = await context.newPage()
    const response = await page.goto(`${ORIGIN}/${FOLDER}/${id}.html`, { waitUntil: 'load' })
    if (response === null || !response.ok()) throw new Error(`The ${id} card's page didn't load.`)
    await page.evaluate('document.fonts.ready.then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))')
    const problem = (await page.evaluate(LAYOUT_CHECK)) as string
    if (problem !== '') throw new Error(`The ${id} card doesn't fit: ${problem}.`)
    if (refused.length > 0) throw new Error(`The ${id} card asked for files the build doesn't have: ${refused.join(', ')}.`)
    return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }, animations: 'disabled', caret: 'hide' })
  } finally {
    await context.close()
  }
}

/**
 * Draws every card into dist, twice, and checks the two drawings match byte
 * for byte and each is under MAX_BYTES. Returns a problem, or nothing.
 */
export async function drawCards(browser: Browser, dist: string): Promise<string | undefined> {
  for (const job of JOBS) {
    if (!existsSync(path.join(dist, job.source))) return `The build has no print page for the ${job.id} share card.`
    const first = await draw(browser, dist, job.id)
    const second = await draw(browser, dist, job.id)
    if (!first.equals(second)) return `A second drawing of the ${job.id} share card gave different bytes.`
    if (first.length > MAX_BYTES) return `The ${job.id} share card is ${first.length} bytes, over ${MAX_BYTES}.`
    writeFileSync(path.join(dist, job.output), first)
  }
  return undefined
}

async function launch(): Promise<Browser | undefined> {
  try {
    return await chromium.launch()
  } catch {
    return undefined
  }
}

export const shareCards = {
  name: 'bradthome:share-cards',
  hooks: {
    'astro:build:done': async ({ dir, logger }: { dir: URL; logger: { info(message: string): void; warn(message: string): void } }) => {
      const dist = fileURLToPath(dir)
      const browser = await launch()
      if (browser === undefined) {
        clean(dist)
        if (process.env.CI !== undefined && process.env.CI !== '')
          throw new Error("The share cards need Playwright's Chromium: build in the pinned Playwright container, as CI does.")
        logger.warn(
          "Playwright's Chromium isn't installed here, so this build has no share cards. pnpm test:visual builds them in the pinned container.",
        )
        return
      }
      try {
        const problem = await drawCards(browser, dist)
        clean(dist)
        if (problem !== undefined) throw new Error(problem)
      } finally {
        await browser.close()
      }
      logger.info(`Drew the share cards: ${JOBS.map((job) => job.output).join(', ')}.`)
    },
  },
}
