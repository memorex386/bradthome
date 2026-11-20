import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { brotli } from '../../../scripts/site/serve.ts'
import { CLAIMS } from '../helpers/claims.ts'
import { ROOT } from '../../043/helpers/serve.ts'

// Spec 047 in a real build: the home's HTML keeps D246's budget with the
// replay's box adding 400 bytes or fewer (S5.1), the player and its styles
// are their own files the home doesn't name (S5.2), each within its cap
// (S5.3), the page holds both finished frames (S3.2), and the corpus gains
// the claims (S4.3). It builds into the checkout's ignored node_modules/.cache,
// as spec 043's test does.

const SITE = path.join(ROOT, 'apps', 'site')
/** The one module's size on main at be9569c, with brotli, measured 2026-11-20. */
const MAIN_MODULE = 5150
let out = ''
let home = ''
let page = ''

const asset = (pattern: RegExp): Buffer => {
  const name = readdirSync(path.join(out, '_astro')).find((file) => pattern.test(file))
  if (name === undefined) throw new Error(`No built file matches ${pattern}.`)
  return readFileSync(path.join(out, '_astro', name))
}

beforeAll(() => {
  const cache = path.join(ROOT, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  out = mkdtempSync(path.join(cache, 'bradthome-047-'))
  const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
  const env = { ...process.env, CI: '' }
  const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], { cwd: SITE, encoding: 'utf8', env })
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`)
  home = readFileSync(path.join(out, 'index.html'), 'utf8')
  page = readFileSync(path.join(out, 'offer-agent.html'), 'utf8')
})

afterAll(() => {
  if (out !== '') rmSync(out, { recursive: true, force: true })
})

describe("the home's weight (S5.1–S5.3, FR-011)", () => {
  test("S5.1 FR-011 SC-002 the home's HTML is 14,000 bytes or less with brotli, and the replay's box adds 400 or fewer", () => {
    const size = brotli(Buffer.from(home)).length
    expect(size).toBeLessThanOrEqual(14_000)
    const start = home.indexOf('<figure class="replay" data-replay>')
    const end = home.indexOf('</figure>', start) + '</figure>'.length
    expect(start).toBeGreaterThan(0)
    const without = brotli(Buffer.from(home.slice(0, start) + home.slice(end))).length
    expect(size - without).toBeLessThanOrEqual(400)
  })

  test("S5.2 FR-003 the home names neither the player nor its styles; the one module imports the player's chunk", () => {
    expect(home).not.toMatch(/player\.[\w-]+\.js|replay\.[\w-]+\.css/)
    expect(asset(/^PreviewLink\.astro.*\.js$/).toString('utf8')).toMatch(/player\.[\w-]+\.js/)
  })

  test('S5.3 FR-011 the player is 6,000 bytes or fewer, its styles 2,500, and the one module grows by 500 or fewer, with brotli', () => {
    expect(brotli(asset(/^player\.[\w-]+\.js$/)).length).toBeLessThanOrEqual(6000)
    expect(brotli(asset(/^replay\.[\w-]+\.css$/)).length).toBeLessThanOrEqual(2500)
    expect(brotli(asset(/^PreviewLink\.astro.*\.js$/)).length).toBeLessThanOrEqual(MAIN_MODULE + 500)
  })

  test('S3.3 FR-007 the home holds the box with its phone and trace empty and hidden, and the label with its link', () => {
    const start = home.indexOf('<figure class="replay" data-replay>')
    const figure = home.slice(start, home.indexOf('</figure>', start))
    expect(figure).toContain('<div class="r-stage r-stage--moving" aria-hidden="true"><div class="r-phone"></div><div class="r-trace"></div></div>')
    expect(figure).toContain('<a class="replay__read" href="/offer-agent">Read the conversation</a>')
    expect(figure).toContain('An illustration drawn from Brad&#39;s account, not a screenshot or a real trace.')
  })
})

describe('the page (S3.2, FR-008)', () => {
  test('S3.2 FR-008 /offer-agent holds the claim, the label and both finished frames, with noindex and no player', () => {
    expect(page).toContain('<meta name="robots" content="noindex">')
    expect(page).toContain('The offer agent, illustrated</h1>')
    expect(page).toContain(CLAIMS['hopper-fintech-ai-2'].replace(/'/g, '&#39;'))
    expect(page).toContain('When the traveler accepts the first offer</h2>')
    expect(page).toContain('When the traveler declines the first offer</h2>')
    expect(page.match(/<div class="r-stage">/g)?.length).toBe(2)
    expect(page.match(/class="r-done"/g)?.length).toBe(2)
    expect(page).not.toMatch(/data-replay|aria-hidden="true"><div class="r-phone/)
    expect(page).toContain('href="/#hopper-fintech-ai"')
  })
})

describe('the corpus (S4.3)', () => {
  test("S4.3 /corpus.json and /llms.txt hold the four claims, so the chat can answer about the agent", () => {
    const corpus = readFileSync(path.join(out, 'corpus.json'), 'utf8')
    const llms = readFileSync(path.join(out, 'llms.txt'), 'utf8')
    for (const [id, text] of Object.entries(CLAIMS)) {
      expect(corpus, id).toContain(JSON.stringify(text).slice(1, -1))
      expect(llms, id).toContain(text)
    }
  })
})
