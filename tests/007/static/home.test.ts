import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { loadTerms, termLines } from '../../../scripts/lib/terms.ts'
import { PAGE } from '../../003/helpers/site.ts'
import { FILES, HOME, LINE, repoPath } from '../helpers/home.ts'

// The layout, pages and styles, read as text (spec 007). The end-to-end tests
// check what a browser gets; these check what the build is told.

const text = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '')

/** Every file under a folder, with its text. Missing folders give none. */
function filesUnder(dir: string): { file: string; text: string }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => !/\.(?:woff2?|png|ico)$/.test(file))
    .map((file) => ({ file: path.relative(dir, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))
}

describe('the layout', () => {
  test('FR-001 S2.1 S2.2 the layout holds the header, the main column and the footer, once, for every page', () => {
    const base = text(FILES.baseLayout)
    expect(base.match(/<header class="site-header">/g)).toHaveLength(1)
    expect(base).toMatch(/<a class="name" href="\/">\s*Brad Thome\s*<\/a>/)
    expect(base).toMatch(/<nav aria-label="Elsewhere">/)
    expect(base).toMatch(/<main class="frame">\s*<slot \/>\s*<\/main>/)
    expect(base).toMatch(/<footer class="site-footer">\s*<a href="\/">Brad Thome<\/a> · Dallas–Fort Worth\s*<\/footer>/)
    expect(base).toMatch(/import '\.\.\/styles\/site\.css'/)
    for (const file of [FILES.essayLayout, FILES.index, FILES.notFound]) {
      expect(text(file), file).not.toMatch(/<header slot=|<footer\b|class="site-header"|\bframe=/)
    }
  })

  test('FR-004 the share tags are opt-in: the home page is a website, the essay an article, and the 404 page has none', () => {
    const base = text(FILES.baseLayout)
    for (const tag of [
      'name="author"',
      'rel="canonical"',
      'property="og:type"',
      'property="og:site_name"',
      'property="og:title"',
      'property="og:description"',
      'property="og:url"',
      'name="twitter:card"',
    ]) {
      expect(base, tag).toContain(tag)
    }
    expect(base).toMatch(/share && \(/)
    expect(text(FILES.index)).toMatch(/share=\{\{ type: 'website', title: 'Brad Thome' \}\}/)
    expect(text(FILES.essayLayout)).toMatch(/share=\{\{ type: 'article', title: frontmatter\.title \}\}/)
    expect(text(FILES.notFound)).not.toMatch(/\bshare=/)
  })

  test('FR-006 S3.3 the site styles have no transition or animation, so the card changes at once on hover', () => {
    for (const file of [FILES.siteCss, FILES.essayCss]) {
      expect(text(file), file).not.toMatch(/@keyframes|\banimation(?:-name)?\s*:|\btransition(?:-property)?\s*:/)
    }
    expect(text(FILES.siteCss)).toMatch(/\.card:hover \{\s*border-color: var\(--color-accent\);/)
  })
})

describe('the home page', () => {
  test("FR-002 S1.1 the page uses today's line for its description and lede, and today's title", () => {
    const index = text(FILES.index)
    expect(index).toContain(`'${LINE}'`)
    expect(index).toMatch(/<Base title="Brad Thome" description=\{line\}/)
    expect(index).toMatch(/<p class="lede">\{line\}<\/p>/)
    expect(index).toContain(HOME.card.title)
    expect(index.match(/<li>/g)).toHaveLength(1)
  })

  test("FR-003 S1.3 VINDecoded's name and address come from its project file", () => {
    const index = text(FILES.index)
    expect(index).toMatch(/getEntry\('projects', 'vindecoded'\)/)
    expect(index).toMatch(/<a href=\{vindecoded\.data\.url\}>\{vindecoded\.data\.name\}<\/a>/)
    expect(index).not.toContain('https://vindecoded.com')
    const project = text(FILES.vindecoded)
    expect(project).toMatch(/^name: VINDecoded$/m)
    expect(project).toMatch(/^url: https:\/\/vindecoded\.com$/m)
  })
})

describe('the removed item', () => {
  // The removed project's name is on Brad's private-term list, so the check
  // reads the list rather than naming it. The list is on Brad's PC; in CI the
  // privacy job keeps every term out of every commit, and the end-to-end test
  // checks every outside link the built site has.
  const loaded = loadTerms()
  const terms = 'terms' in loaded ? loaded.terms : undefined

  test.skipIf(terms === undefined)('S1.4 FR-005 SC-004 no private term is in the site source, its content or its build', () => {
    if (terms === undefined) return
    const found: string[] = []
    for (const [root, files] of [
      ['apps/site/src', filesUnder(FILES.src)],
      ['apps/site/content', filesUnder(FILES.content)],
      ['apps/site/dist', filesUnder(FILES.dist)],
    ] as const) {
      for (const { file, text: source } of files) for (const line of termLines(source, terms)) found.push(`${root}/${file}:${line}`)
    }
    expect(found).toEqual([])
  })
})

describe('the checks', () => {
  test('S4.2 SC-003 Lighthouse runs on the home page and the essay', () => {
    const urls = (JSON.parse(text(FILES.lighthouse)) as { ci?: { collect?: { url?: string[] } } }).ci?.collect?.url ?? []
    expect(urls).toEqual(['http://localhost/index.html', 'http://localhost/vindecoded-agents.html'])
  })
})

describe('spec 003', () => {
  test("FR-008 spec 003's page checks follow the ported page, its spec says so, and its lock matches its tests (D112)", () => {
    expect(PAGE.line).toBe(LINE)
    expect(PAGE.href).toBe(HOME.card.href)
    const spec = text(repoPath('specs', '003-skeleton-and-pipeline', 'spec.md'))
    for (const id of ['S1.1', 'S1.4', 'FR-005', 'FR-006']) {
      const line = spec.split(/\r?\n/).find((entry) => entry.startsWith(`- **${id}** `)) ?? ''
      expect(line, id).toContain('D112')
    }
    const lock = text(repoPath('specs', '003-skeleton-and-pipeline', 'tests.lock'))
    for (const file of ['tests/003/helpers/site.ts', 'tests/003/e2e/page.test.ts', 'tests/003/static/site.test.ts']) {
      const hash = createHash('sha256')
        .update(readFileSync(repoPath(file)))
        .digest('hex')
      expect(lock, file).toContain(`${hash}  ${file}`)
    }
  })
})
