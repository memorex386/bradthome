import { request } from 'node:http'
import path from 'node:path'

// Spec 043's helpers: the repo's paths, and a request that keeps the bytes as
// sent, since fetch would decompress them.

export const ROOT = path.join(import.meta.dirname, '..', '..', '..')
export const repoPath = (...parts: string[]): string => path.join(ROOT, ...parts)

export interface Answer {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Buffer
}

/** GET a path from a server on localhost, with the Accept-Encoding given, keeping the body as sent. */
export function get(port: number, pathname: string, acceptEncoding?: string): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const headers = acceptEncoding === undefined ? {} : { 'accept-encoding': acceptEncoding }
    const req = request({ host: '127.0.0.1', port, path: pathname, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

/** Chrome's Accept-Encoding, as Lighthouse's Chromium sends it to localhost. */
export const CHROME = 'gzip, deflate, br, zstd'
