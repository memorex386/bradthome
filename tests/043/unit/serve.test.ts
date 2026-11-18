import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { brotliCompressSync, brotliDecompressSync, constants, gunzipSync } from 'node:zlib'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { brotli, encodingFor, fileFor, PORT, READY, serve } from '../../../scripts/site/serve.ts'
import { budgetMessage, HOME_BUDGET } from '../../../scripts/site/budget.ts'
import { CHROME, get } from '../helpers/serve.ts'

// Spec 043's server, on a made-up site in a temporary folder: what each kind
// of file is sent as, for each Accept-Encoding, and what it never reads.

const page = `<!doctype html><title>t</title>${'<p class="claim">A sentence a page repeats.</p>'.repeat(200)}`
let root = ''
let outside = ''
let server: Server
let port = 0

beforeAll(async () => {
  const base = mkdtempSync(path.join(tmpdir(), 'bradthome-043-'))
  root = path.join(base, 'dist')
  outside = path.join(base, 'secret.txt')
  mkdirSync(path.join(root, '_astro', 'fonts'), { recursive: true })
  mkdirSync(path.join(root, 'previews'), { recursive: true })
  writeFileSync(path.join(root, 'index.html'), page)
  writeFileSync(path.join(root, 'vindecoded-agents.html'), page)
  writeFileSync(path.join(root, '_astro', 'a.css'), 'body{color:red}'.repeat(50))
  writeFileSync(path.join(root, '_astro', 'a.js'), 'console.log(1);'.repeat(50))
  writeFileSync(path.join(root, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${'<g/>'.repeat(50)}</svg>`)
  writeFileSync(path.join(root, 'corpus.json'), JSON.stringify({ a: 'b'.repeat(500) }))
  writeFileSync(path.join(root, 'llms.txt'), 'text '.repeat(200))
  writeFileSync(path.join(root, '_astro', 'fonts', 'f.woff2'), Buffer.alloc(600, 7))
  writeFileSync(path.join(root, 'previews', 'p.webp'), Buffer.alloc(600, 8))
  writeFileSync(path.join(root, 'mark.png'), Buffer.alloc(600, 9))
  writeFileSync(outside, 'not to be served')
  server = await serve(root, 0)
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server?.close()
  rmSync(path.dirname(root), { recursive: true, force: true })
})

describe("spec 043's server", () => {
  test('S1.1 FR-002 the home goes to Chrome as brotli at the highest quality, byte for byte, with Vary', async () => {
    const answer = await get(port, '/index.html', CHROME)
    expect(answer.status).toBe(200)
    expect(answer.headers['content-encoding']).toBe('br')
    expect(answer.headers['vary']).toMatch(/accept-encoding/i)
    expect(answer.headers['content-type']).toMatch(/^text\/html/)
    expect(brotliDecompressSync(answer.body).toString()).toBe(page)
    expect(answer.body.equals(brotli(Buffer.from(page)))).toBe(true)
  })

  test("S1.1 FR-002 brotli runs at quality 11, brotli's highest, not a server's quick setting", () => {
    const big = Buffer.from(page)
    const at = (quality: number) => brotliCompressSync(big, { params: { [constants.BROTLI_PARAM_QUALITY]: quality } })
    expect(brotli(big).equals(at(11))).toBe(true)
    expect(brotli(big).length).toBeLessThanOrEqual(at(4).length)
    expect(encodingFor(CHROME, 'text/html; charset=utf-8')).toBe('br')
  })

  test('S1.2 FR-002 gzip goes to a request that accepts gzip and not br, and the file as built to one that accepts neither', async () => {
    const gz = await get(port, '/index.html', 'gzip, deflate')
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(gunzipSync(gz.body).toString()).toBe(page)
    for (const accept of [undefined, 'identity', 'deflate', 'zstd']) {
      const plain = await get(port, '/index.html', accept)
      expect(plain.headers['content-encoding'], String(accept)).toBeUndefined()
      expect(plain.body.toString(), String(accept)).toBe(page)
    }
  })

  test('S1.2 FR-002 the encoding reads the header as a list, with q=0 refusing one', () => {
    expect(encodingFor('br;q=0, gzip', 'text/html')).toBe('gzip')
    expect(encodingFor('GZIP, BR', 'text/html')).toBe('br')
    expect(encodingFor('gzip;q=0', 'text/html')).toBeUndefined()
    expect(encodingFor('brotli', 'text/html')).toBeUndefined()
  })

  test('S1.3 FR-002 stylesheets, scripts, SVG, JSON and text are compressed as the home is', async () => {
    for (const [file, type] of [
      ['/_astro/a.css', /^text\/css/],
      ['/_astro/a.js', /^text\/javascript/],
      ['/favicon.svg', /^image\/svg\+xml/],
      ['/corpus.json', /^application\/json/],
      ['/llms.txt', /^text\/plain/],
    ] as const) {
      const answer = await get(port, file, CHROME)
      expect(answer.headers['content-encoding'], file).toBe('br')
      expect(answer.headers['content-type'], file).toMatch(type)
    }
  })

  test('S1.3 FR-003 fonts and images go as built, with no Content-Encoding, as Firebase sends them', async () => {
    for (const [file, type] of [
      ['/_astro/fonts/f.woff2', 'font/woff2'],
      ['/previews/p.webp', 'image/webp'],
      ['/mark.png', 'image/png'],
    ] as const) {
      const answer = await get(port, file, CHROME)
      expect(answer.status, file).toBe(200)
      expect(answer.headers['content-encoding'], file).toBeUndefined()
      expect(answer.headers['content-type'], file).toBe(type)
      expect(answer.body.length, file).toBe(600)
    }
    expect(encodingFor(CHROME, 'font/woff2')).toBeUndefined()
    expect(encodingFor(CHROME, 'image/png')).toBeUndefined()
  })

  test('S1.4 FR-003 a path to no file, or out of the built site, is a 404 and reads nothing outside it', async () => {
    for (const pathname of [
      '/nope.html',
      '/_astro',
      '/../secret.txt',
      '/%2e%2e/secret.txt',
      '/..%2fsecret.txt',
      '/_astro/../../secret.txt',
    ]) {
      const answer = await get(port, pathname, CHROME)
      expect(answer.status, pathname).toBe(404)
      expect(answer.body.toString(), pathname).not.toContain('not to be served')
    }
    expect(fileFor(root, '/../secret.txt')).toBeUndefined()
    expect(fileFor(root, '/%2e%2e%2fsecret.txt')).toBeUndefined()
    expect(fileFor(root, '/_astro')).toBeUndefined()
  })

  test('S1.4 FR-003 a query string is ignored, and / is the home', async () => {
    expect(fileFor(root, '/index.html?x=1')).toBe(path.join(root, 'index.html'))
    expect(fileFor(root, '/')).toBe(path.join(root, 'index.html'))
    const answer = await get(port, '/index.html?utm=1', CHROME)
    expect(brotliDecompressSync(answer.body).toString()).toBe(page)
  })

  test('FR-001 it listens on a fixed port and prints one ready line naming it', () => {
    expect(PORT).toBe(4180)
    expect(READY).toBe(`serving apps/site/dist on http://localhost:${PORT}`)
  })

  test('FR-001 a taken port ends the server with a message saying so', async () => {
    await expect(serve(root, port)).rejects.toThrow(new RegExp(`port ${port} is taken`))
  })
})

describe("spec 043's byte budget", () => {
  test('FR-005 S3.1 the budget is 14,000 bytes, and a miss names the size, the budget and the fix', () => {
    expect(HOME_BUDGET).toBe(14_000)
    expect(budgetMessage(14_213)).toEqual([
      "✖ budget  the home's HTML is 14,213 bytes with brotli, over the 14,000-byte budget (D246)",
      '  apps/site/dist/index.html',
      "  Fix: slim the home's HTML, or ask Brad to move the budget.",
    ])
  })
})
