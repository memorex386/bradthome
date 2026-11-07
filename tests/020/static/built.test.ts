import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Spec 020 over the build, when there is one: the files in apps/site/dist,
// read as text. CI's unit job has no build, so these pass there with nothing
// to read; the e2e job checks the served files (tests/020/e2e), and the
// private-term scan runs here, where Brad's list is.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const DIST = path.join(ROOT, 'apps', 'site', 'dist')
const built = (file: string): string | undefined => (existsSync(path.join(DIST, file)) ? readFileSync(path.join(DIST, file), 'utf8') : undefined)

interface Source {
  id: string
  url: string
}

const corpus = (): { sources: Source[] } | undefined => {
  const json = built('corpus.json')
  return json === undefined ? undefined : (JSON.parse(json) as { sources: Source[] })
}

/** Every string in a JSON value, decoded, so an escape such as \n never reads as a path. */
const stringsOf = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringsOf) : []

/** The built page a bradthome.com address serves. */
const pageOf = (url: URL): string => (url.pathname === '/' ? 'index.html' : `${url.pathname.slice(1)}.html`)

describe('the built corpus', () => {
  test('S2.1 FR-005 SC-001 every source links a built page and an element ID on it', () => {
    const sources = corpus()?.sources
    if (sources === undefined) return
    const missing = sources.filter((source) => {
      const url = new URL(source.url)
      const page = built(pageOf(url))
      return url.origin !== 'https://bradthome.com' || page === undefined || !page.includes(`id="${url.hash.slice(1)}"`)
    })
    expect(missing.map((source) => `${source.id} ${source.url}`)).toEqual([])
  })

  test('S1.6 FR-008 SC-004 neither file holds a private term, a machine path, a phone number or another address', () => {
    const files = ['corpus.json', 'llms.txt']
    if (files.some((file) => built(file) === undefined)) return
    const scan = spawnSync(process.execPath, ['scripts/terms.ts', '--files', ...files.map((file) => path.join(DIST, file))], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(scan.status, scan.stdout).toBe(0)
    for (const file of files) {
      const raw = built(file) ?? ''
      const text = file.endsWith('.json') ? stringsOf(JSON.parse(raw)).join(' ') : raw
      expect(text, file).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\//)
      expect(text, file).not.toMatch(/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/)
      const addresses = [...text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((match) => match[0])
      expect(addresses.filter((address) => address !== 'brad@bradthome.com'), file).toEqual([])
    }
  })

  test('S5.1 FR-010 the sitemap and robots.txt are as D168 left them, and no page links either file', () => {
    const publicFile = (name: string) => readFileSync(path.join(ROOT, 'apps', 'site', 'public', name), 'utf8')
    expect(publicFile('sitemap.xml')).not.toMatch(/corpus\.json|llms\.txt/)
    expect(publicFile('robots.txt')).not.toMatch(/corpus\.json|llms\.txt/)
    for (const page of ['index.html', 'vindecoded-agents.html', 'mobile.html', 'fullstack.html', 'ai.html', 'privacy.html']) {
      const html = built(page)
      if (html === undefined) continue
      expect(html, page).not.toMatch(/corpus\.json|llms\.txt/)
    }
  })
})
