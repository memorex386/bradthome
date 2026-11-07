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

/** Every string in a JSON value, decoded, so an escape such as \n never reads as a path. */
const stringsOf = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringsOf) : []

test('S1.6 FR-008 neither served file holds a machine path, a phone number or an address other than brad@bradthome.com', async ({
  request,
}) => {
  const files = {
    'corpus.json': stringsOf(await (await request.get('/corpus.json')).json()).join(' '),
    'llms.txt': await (await request.get('/llms.txt')).text(),
  }
  for (const [file, text] of Object.entries(files)) {
    expect(text, file).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\//)
    expect(text, file).not.toMatch(/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/)
    const addresses = [...text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((match) => match[0])
    expect(addresses.filter((address) => address !== 'brad@bradthome.com'), file).toEqual([])
  }
})

test('S5.1 FR-010 no page links either file, and the sitemap and robots.txt name neither', async ({ request }) => {
  for (const address of ['/', '/vindecoded-agents', '/mobile', '/fullstack', '/ai', '/privacy', '/sitemap.xml', '/robots.txt'])
    expect(await (await request.get(address)).text(), address).not.toMatch(/corpus\.json|llms\.txt/)
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
