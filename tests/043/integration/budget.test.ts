import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { budgetMessage, HOME_BUDGET } from '../../../scripts/site/budget.ts'
import { brotli, serve } from '../../../scripts/site/serve.ts'
import { CHROME, get, ROOT } from '../helpers/serve.ts'

// Spec 043 in a real build: the home's HTML fits D246's budget with brotli,
// and the server sends the built pages as Lighthouse loads them. It builds
// into the checkout's ignored node_modules/.cache, as spec 022's test does,
// since Astro's rename fails across drives on CI's Windows runner.

const SITE = path.join(ROOT, 'apps', 'site')
let out = ''
let server: Server | undefined
let port = 0

beforeAll(async () => {
  const cache = path.join(ROOT, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  out = mkdtempSync(path.join(cache, 'bradthome-043-'))
  const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
  // CI's test runners have no WeasyPrint, so this builds as a local build does (spec 018's test).
  const env = { ...process.env, CI: '' }
  const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], { cwd: SITE, encoding: 'utf8', env })
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`)
  server = await serve(out, 0)
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server?.close()
  if (out !== '') rmSync(out, { recursive: true, force: true })
})

describe("spec 043's budget in a real build", () => {
  test("S3.1 FR-005 SC-003 the home's HTML is 14,000 bytes or less with brotli", () => {
    const size = brotli(readFileSync(path.join(out, 'index.html'))).length
    expect(size, budgetMessage(size).join('\n')).toBeLessThanOrEqual(HOME_BUDGET)
  })

  test('S1.1 SC-002 the server sends the built home and essay to Chrome as brotli at quality 11, byte for byte', async () => {
    for (const page of ['index.html', 'vindecoded-agents.html']) {
      const built = readFileSync(path.join(out, page))
      const answer = await get(port, `/${page}`, CHROME)
      expect(answer.headers['content-encoding'], page).toBe('br')
      expect(answer.body.equals(brotli(built)), page).toBe(true)
      expect(brotliDecompressSync(answer.body).equals(built), page).toBe(true)
    }
  })

  test("S1.3 the home's stylesheets go as brotli and its preloaded fonts as built", async () => {
    const home = readFileSync(path.join(out, 'index.html'), 'utf8')
    const css = [...home.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1] ?? '')
    const fonts = [...home.matchAll(/<link rel="preload" href="([^"]+\.woff2)"/g)].map((match) => match[1] ?? '')
    expect(css.length).toBeGreaterThan(0)
    expect(fonts.length).toBeGreaterThan(0)
    for (const href of css) expect((await get(port, href, CHROME)).headers['content-encoding'], href).toBe('br')
    for (const href of fonts) expect((await get(port, href, CHROME)).headers['content-encoding'], href).toBeUndefined()
  })
})
