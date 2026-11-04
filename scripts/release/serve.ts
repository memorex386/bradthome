import type { Fetch, VersionFile } from './hosting.ts'

// The proof that a site serves a version (spec 008, FR-004). Hosting answers
// each file with its hash in the version as the ETag, so a site serves version
// X when every file of X answers at its address with X's hash. Each request
// carries a query string, so the edge cache can't answer with an older copy.

/** Where Hosting serves a version's file, with clean URLs on, or undefined for Hosting's own files. */
export function urlPathFor(file: string): string | undefined {
  if (file.startsWith('/__/')) return undefined
  if (file === '/index.html') return '/'
  if (file.endsWith('/index.html')) return file.slice(0, -'/index.html'.length)
  if (file.endsWith('.html')) return file.slice(0, -'.html'.length)
  return file
}

export interface ServedOptions {
  base: string
  files: readonly VersionFile[]
  fetch: Fetch
  sleep: (ms: number) => Promise<void>
  now: () => number
  timeoutMs: number
  intervalMs: number
}

export interface Served {
  ok: boolean
  mismatches: string[]
  elapsedMs: number
}

/** The file's hash from an ETag. Hosting adds -br to it when it answers with Brotli. */
export const etagOf = (value: string | null): string =>
  (value ?? '')
    .replace(/^W\//, '')
    .replaceAll('"', '')
    .replace(/-(?:br|gzip|zstd)$/, '')

/** The files a site doesn't serve with their hash, each as one line. */
export async function mismatches(base: string, files: readonly VersionFile[], fetchImpl: Fetch, stamp: number): Promise<string[]> {
  const found: string[] = []
  for (const file of files) {
    const at = urlPathFor(file.path)
    if (at === undefined) continue
    let line: string | undefined
    try {
      const response = await fetchImpl(`${base}${at}?release-check=${stamp}`, {
        headers: { 'cache-control': 'no-cache' },
        redirect: 'manual',
      })
      await response.arrayBuffer()
      const etag = etagOf(response.headers.get('etag'))
      // The 404 page answers 200 at /404, and 404 for every missing page.
      if (response.status !== 200) line = `${at} answered ${response.status}`
      else if (etag !== file.hash) line = `${at} has ${etag === '' ? 'no ETag' : etag.slice(0, 12)}, not ${file.hash.slice(0, 12)}`
    } catch (error) {
      line = `${at} didn't answer: ${error instanceof Error ? error.message : String(error)}`
    }
    if (line !== undefined) found.push(line)
  }
  return found
}

/** Checks until the site serves every file, or the time runs out. */
export async function waitUntilServed(options: ServedOptions): Promise<Served> {
  const start = options.now()
  let last: string[] = []
  for (;;) {
    last = await mismatches(options.base, options.files, options.fetch, options.now())
    const elapsedMs = options.now() - start
    if (last.length === 0) return { ok: true, mismatches: [], elapsedMs }
    if (elapsedMs >= options.timeoutMs) return { ok: false, mismatches: last, elapsedMs }
    await options.sleep(Math.min(options.intervalMs, options.timeoutMs - elapsedMs))
  }
}
