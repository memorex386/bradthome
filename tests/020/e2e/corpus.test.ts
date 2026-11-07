import { expect, test } from '@playwright/test'

// Spec 020, the corpus, served as Hosting serves it: both files, their types
// and headers, and every source's page and anchor.

interface Source {
  id: string
  url: string
}

test('S4.4 FR-001 /corpus.json and /llms.txt answer 200 with their types and the security headers', async ({ request }) => {
  for (const [address, type] of [
    ['/corpus.json', 'application/json'],
    ['/llms.txt', 'text/plain'],
  ] as const) {
    const response = await request.get(address)
    expect(response.status(), address).toBe(200)
    expect(response.headers()['content-type'], address).toContain(type)
    expect(response.headers()['content-security-policy'], address).toBeTruthy()
    expect(response.headers()['x-content-type-options'], address).toBe('nosniff')
  }
  const text = await (await request.get('/llms.txt')).text()
  expect(text.startsWith('# Brad Thome\n')).toBe(true)
})

test('S2.1 FR-005 SC-001 every source links a page that answers 200 and holds its anchor', async ({ request }) => {
  const corpus = (await (await request.get('/corpus.json')).json()) as { sources: Source[] }
  const pages = new Map<string, string>()
  const missing: string[] = []
  for (const source of corpus.sources) {
    const url = new URL(source.url)
    let html = pages.get(url.pathname)
    if (html === undefined) {
      const response = await request.get(url.pathname)
      expect(response.status(), url.pathname).toBe(200)
      html = await response.text()
      pages.set(url.pathname, html)
    }
    if (url.origin !== 'https://bradthome.com' || !html.includes(`id="${url.hash.slice(1)}"`)) missing.push(`${source.id} ${source.url}`)
  }
  expect(missing).toEqual([])
})
