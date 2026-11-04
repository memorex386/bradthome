import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { ESSAY, FILES, PATH } from '../helpers/essay.ts'

// The essay's source and config, read as text (spec 006). The end-to-end
// tests check what a browser gets; these check what the build is told.

const text = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '')

/** The MDX file's front matter, as key and value. */
function frontMatter(source: string): Record<string, string> {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(source.replaceAll('\r\n', '\n'))?.[1] ?? ''
  return Object.fromEntries(
    block.split('\n').map((line) => {
      const at = line.indexOf(':')
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
    }),
  )
}

describe('the essay', () => {
  test('FR-001 the essay is an MDX page at /vindecoded-agents, and the site builds MDX', () => {
    expect(existsSync(FILES.mdx), FILES.mdx).toBe(true)
    expect(text(FILES.astro)).toMatch(/from ['"]@astrojs\/mdx['"]/)
    expect(text(FILES.astro)).toMatch(/\bmdx\(\)/)
    const deps = (JSON.parse(text(FILES.sitePackage)) as { dependencies?: Record<string, string> }).dependencies ?? {}
    expect(deps['@astrojs/mdx']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("FR-002 S1.3 the front matter keeps today's title, description and date, with the essay's layout", () => {
    const fields = frontMatter(text(FILES.mdx))
    expect(fields.title).toBe(ESSAY.title)
    expect(fields.description).toBe(ESSAY.description)
    expect(fields.date).toBe(ESSAY.date)
    expect(fields.layout).toBe('../layouts/Essay.astro')
  })

  test("FR-002 Prettier skips the essay, so a reformat can't change its words", () => {
    const ignored = text(FILES.prettierIgnore).split(/\r?\n/).map((line) => line.trim())
    expect(ignored.some((line) => line === 'apps/site/src/pages/vindecoded-agents.mdx' || line === 'apps/site/src/pages/*.mdx')).toBe(true)
  })

  test("FR-003 the layout sets the title with the site's name, and the author, canonical and link-preview tags", () => {
    const layout = text(FILES.essayLayout)
    expect(layout).toMatch(/·\s*Brad Thome/)
    for (const tag of ['name="author"', 'rel="canonical"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'name="twitter:card"']) {
      expect(layout, tag).toContain(tag)
    }
    expect(layout).toMatch(/<time\b[^>]*datetime=/)
    expect(text(FILES.baseLayout)).toMatch(/<slot\s+name=["']head["']/)
  })

  test('FR-004 the layout links only home, with "Brad Thome"', () => {
    const layout = text(FILES.essayLayout)
    const links = layout.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? []
    expect(links).toHaveLength(1)
    expect(links[0]).toMatch(/href=["']\/["']/)
    expect(links[0]).toMatch(/>\s*Brad Thome\s*</)
  })

  test('FR-005 FR-011 the diagram is inline SVG with a title, colored by the tokens, and nothing in the essay runs a script', () => {
    const diagram = text(FILES.diagram)
    expect(diagram).toMatch(/<svg viewBox=[^>]*role="img"[^>]*aria-labelledby=/)
    expect(diagram).toMatch(/<title id=/)
    expect(diagram).toMatch(/var\(--color-ink\)/)
    expect(diagram).toMatch(/var\(--color-accent\)/)
    expect(diagram).not.toMatch(/var\(--(?:ink|quiet|rule|edge|accent|sans)\)/)
    for (const file of [FILES.mdx, FILES.essayLayout, FILES.diagram, FILES.table]) {
      expect(text(file), file).not.toMatch(/<script\b|\bclient:[a-z]+/)
    }
  })

  test('FR-006 each table and the diagram sit in a focusable, named region', () => {
    expect(text(FILES.mdx)).toMatch(/export const components = \{ table: Table \}/)
    const table = text(FILES.table)
    expect(table).toMatch(/<section class="table-wrap" aria-label=\{name\} tabindex="0">/)
    expect(table).toMatch(/<th\b/)
    expect(text(FILES.diagram)).toMatch(/<section class="scroller" aria-labelledby="system-diagram-caption" tabindex="0">/)
    expect(text(FILES.diagram)).toMatch(/<figcaption id="system-diagram-caption">/)
  })

  test("FR-007 FR-011 a Shiki transformer swaps the code's inline styles for classes", () => {
    const config = text(FILES.astro)
    expect(config).toMatch(/transformers:\s*\[shikiClasses\]/)
    expect(config).toMatch(/delete node\.properties\.style/)
    expect(text(FILES.essayCss)).toMatch(/\.shiki-marker/)
  })

  test("FR-010 S4.2 Lighthouse runs on the essay as well as the home page, and a miss names its page", () => {
    const urls = (JSON.parse(text(FILES.lighthouse)) as { ci?: { collect?: { url?: string[] } } }).ci?.collect?.url ?? []
    expect(urls).toContain('http://localhost/index.html')
    expect(urls).toContain(`http://localhost${PATH}.html`)
    expect(text(FILES.siteReport)).toMatch(/lighthousePage\(/)
  })

  test('FR-012 the home and 404 pages keep the centred frame, which stays the layout\'s default', () => {
    for (const file of [FILES.index, FILES.notFound]) expect(text(file), file).not.toMatch(/\bframe=/)
    const base = text(FILES.baseLayout)
    expect(base).toMatch(/frame = 'center'/)
    expect(base).toContain("center: 'mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6 py-16'")
  })
})
