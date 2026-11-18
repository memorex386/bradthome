import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

// The built site, served as Firebase Hosting serves it, for Lighthouse CI
// (spec 043, D245). Lighthouse CI's own static server compresses only with
// gzip, so it sent the home as about 16.6 KB, past the first round trip, where
// bradthome.com sends Chrome brotli at its highest quality, as 13,099 bytes.
// This sends text as brotli at quality 11 to a request that accepts it, gzip
// to one that accepts only gzip, and fonts and images as built, as Firebase
// does. lighthouserc.json starts it: node scripts/site/serve.ts.

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const DIST = path.join(ROOT, 'apps', 'site', 'dist')

export const PORT = 4180
export const READY = `serving apps/site/dist on http://127.0.0.1:${PORT}`

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
}

/** The types Firebase compresses: text, scripts, JSON, XML and SVG. Fonts and images are already compressed. */
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|manifest\+json|xml|javascript)\b|image\/svg\+xml\b)/

export function contentTypeOf(file: string): string {
  return TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/** The codings a request accepts, from its Accept-Encoding, leaving out any it refuses with q=0. */
function accepted(header: string | undefined): Set<string> {
  const codings = new Set<string>()
  for (const part of (header ?? '').split(',')) {
    const [name = '', ...params] = part.split(';').map((text) => text.trim().toLowerCase())
    const q = params.find((param) => param.startsWith('q='))
    if (name !== '' && (q === undefined || Number(q.slice(2)) > 0)) codings.add(name)
  }
  return codings
}

/** How a response of this type goes to this request: brotli first, then gzip, as Firebase chooses. */
export function encodingFor(acceptEncoding: string | undefined, contentType: string): 'br' | 'gzip' | undefined {
  if (!COMPRESSIBLE.test(contentType)) return undefined
  const codings = accepted(acceptEncoding)
  if (codings.has('br')) return 'br'
  if (codings.has('gzip')) return 'gzip'
  return undefined
}

/** The file a request's path names inside root, or nothing: never a folder, and never a file outside it. */
export function fileFor(root: string, url: string): string | undefined {
  let pathname: string
  try {
    pathname = decodeURIComponent((url.split(/[?#]/)[0] ?? '').replaceAll('\\', '/'))
  } catch {
    return undefined
  }
  if (pathname.endsWith('/')) pathname += 'index.html'
  const base = path.resolve(root)
  const file = path.resolve(base, `.${path.posix.normalize(`/${pathname}`)}`)
  const inside = path.relative(base, file)
  if (inside === '' || inside.startsWith('..') || path.isAbsolute(inside)) return undefined
  return existsSync(file) && statSync(file).isFile() ? file : undefined
}

/** Brotli at quality 11, its highest, as bradthome.com sends Chrome its pages. */
export function brotli(body: Buffer): Buffer {
  return brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY } })
}

/** Serves root on 127.0.0.1 at port, once it listens. Port 0 picks a free one, for the tests. */
export function serve(root: string, port: number): Promise<Server> {
  const bodies = new Map<string, Buffer>()
  const bodyOf = (file: string, encoding: 'br' | 'gzip' | undefined): Buffer => {
    const key = `${encoding ?? 'identity'} ${file}`
    let body = bodies.get(key)
    if (body === undefined) {
      const built = readFileSync(file)
      body = encoding === 'br' ? brotli(built) : encoding === 'gzip' ? gzipSync(built, { level: 9 }) : built
      bodies.set(key, body)
    }
    return body
  }
  const server = createServer((request, response) => {
    const file = fileFor(root, request.url ?? '/')
    if (file === undefined) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
      return
    }
    const type = contentTypeOf(file)
    const encoding = encodingFor(request.headers['accept-encoding'], type)
    const body = bodyOf(file, encoding)
    const headers: Record<string, string | number> = { 'Content-Type': type, 'Content-Length': body.length }
    if (COMPRESSIBLE.test(type)) headers['Vary'] = 'Accept-Encoding'
    if (encoding !== undefined) headers['Content-Encoding'] = encoding
    response.writeHead(200, headers).end(request.method === 'HEAD' ? undefined : body)
  })
  return new Promise((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => reject(error.code === 'EADDRINUSE' ? new Error(`port ${port} is taken`) : error))
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function main(): Promise<number> {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.log(['✖ serve  no built site in apps/site/dist', '  Fix: pnpm site:build first.'].join('\n'))
    return 1
  }
  try {
    await serve(DIST, PORT)
  } catch (error) {
    console.log([`✖ serve  ${(error as Error).message}`, `  Fix: stop what's listening on ${PORT}, then run it again.`].join('\n'))
    return 1
  }
  console.log(READY)
  return 0
}

if (import.meta.main) process.exitCode = await main()
