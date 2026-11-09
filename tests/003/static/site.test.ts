import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CONFIG } from '../helpers/paths.ts'
import { COLORS, OUTSIDE_LINKS, PAGE, siteSources } from '../helpers/site.ts'

// The site's source and config, read as text (FR-002 to FR-006, S1.3, S1.5).
// The end-to-end tests check what a browser gets; these check what the build
// is told to do, so a font host or a script can't creep in unseen.

const text = (file: string): string => readFileSync(file, 'utf8')

/** The source with each `@media (prefers-reduced-motion: no-preference)` block taken out, braces matched (D122). */
function stillSource(source: string): string {
  const open = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g
  let out = ''
  let from = 0
  for (let match = open.exec(source); match !== null; match = open.exec(source)) {
    if (match.index < from) continue
    let depth = 1
    let at = match.index + match[0].length
    while (at < source.length && depth > 0) {
      if (source[at] === '{') depth += 1
      else if (source[at] === '}') depth -= 1
      at += 1
    }
    out += source.slice(from, match.index)
    from = at
  }
  return out + source.slice(from)
}

describe('the stack is wired up', () => {
  test('FR-002 Astro uses React and Tailwind 4 through its Vite plugin, and turns on its CSP hashes', () => {
    const config = text(CONFIG.astro)
    expect(config).toMatch(/from ['"]@astrojs\/react['"]/)
    expect(config).toMatch(/from ['"]@tailwindcss\/vite['"]/)
    expect(config).toMatch(/\bcsp\b/)
  })

  test("FR-002 S1.5 Motion is installed for later islands, the site uses no Motion and React only in the chat's window, and it ships no script but the link previews' one module", () => {
    const deps = (JSON.parse(text(CONFIG.sitePackage)) as { dependencies?: Record<string, string> }).dependencies ?? {}
    expect(deps.motion).toBeDefined()
    // Spec 016's link previews add one first-party module, from one component (D147, D148).
    const PREVIEWS = 'src/components/previews/PreviewLink.astro'
    // Spec 022's chat window is React, loaded from that one module when it's opened, with no client directive (D188).
    const CHAT = 'src/components/chat/'
    for (const { file, text: source } of siteSources()) {
      expect(source, file).not.toMatch(/from ['"]motion(?:\/[\w-]+)?['"]/)
      if (!file.replaceAll('\\', '/').startsWith(CHAT)) expect(source, file).not.toMatch(/from ['"](?:react|react-dom)(?:\/[\w-]+)?['"]/)
      // Each script tag's opening, found by plain search over the lowercased source, not a tag regex (D151).
      const lower = source.toLowerCase()
      const openings: string[] = []
      for (let at = lower.indexOf('<script'); at >= 0; at = lower.indexOf('<script', at + 1)) {
        openings.push(source.slice(at, lower.indexOf('>', at) + 1))
      }
      expect(openings, file).toEqual(file === PREVIEWS ? ['<script>'] : [])
      expect(source, file).not.toMatch(/\bclient:(?:load|idle|visible|media|only)\b/)
    }
  })
})

describe('the tokens', () => {
  test("FR-003 S1.2 v0's light and dark colors are tokens in Tailwind's theme, and dark follows the device's setting", () => {
    const tokens = text(CONFIG.tokens).toLowerCase()
    expect(tokens).toMatch(/@theme\b/)
    const dark = tokens.indexOf('prefers-color-scheme: dark')
    expect(dark).toBeGreaterThan(0)
    for (const value of Object.values(COLORS.light)) {
      expect(tokens.indexOf(value), `light ${value}`).toBeGreaterThanOrEqual(0)
      expect(tokens.indexOf(value), `light ${value} comes before the dark block`).toBeLessThan(dark)
    }
    for (const value of Object.values(COLORS.dark)) expect(tokens.lastIndexOf(value), `dark ${value}`).toBeGreaterThan(dark)
  })

  test('FR-003 S1.2 there is no theme script or toggle, so nothing can flash the other theme', () => {
    for (const { file, text: source } of siteSources()) {
      expect(source, file).not.toMatch(/localStorage|matchMedia|data-theme|classList\.(?:add|toggle)\(['"]dark/)
    }
  })
})

describe('the fonts', () => {
  test("S1.3 FR-004 Charis SIL and Inter come through Astro's Fonts API with its local provider, from the installed packages", () => {
    const config = text(CONFIG.astro)
    expect(config).toMatch(/\bfonts\s*:/)
    expect(config).toMatch(/Charis SIL/)
    expect(config).toMatch(/\bInter\b/)
    expect(config).toMatch(/fontProviders\.local\(\)|provider:\s*['"]local['"]/)
    expect(config).not.toMatch(/fontProviders\.(?:google|fontsource|bunny|adobe|fontshare|npm)\(/)
    const deps = (JSON.parse(text(CONFIG.sitePackage)) as { dependencies?: Record<string, string> }).dependencies ?? {}
    expect(deps['@fontsource/charis-sil']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(deps['@fontsource-variable/inter']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('S1.3 FR-004 the layout preloads both fonts, and text shows in a fallback while they load', () => {
    const layout = text(CONFIG.layout)
    expect(layout).toMatch(/<Font\b[^>]*\bpreload\b/)
    expect((layout.match(/<Font\b/g) ?? []).length).toBeGreaterThanOrEqual(2)
    const sources = [text(CONFIG.astro), ...siteSources().map((source) => source.text)].join('\n')
    expect(sources).not.toMatch(/font-display:\s*(?:block|optional)/)
  })
})

describe('the page', () => {
  test("FR-005 S1.1 the essay holds its title and description, on v1's layout with its byline and the header's link home, with lang=\"en\" (D112, D167)", () => {
    const essay = text(CONFIG.essay)
    expect(essay).toContain(`title: ${PAGE.sourceTitle}`)
    expect(essay).toContain(`description: ${PAGE.description}`)
    expect(text(CONFIG.essayLayout)).toMatch(/from ['"]\.\/Base\.astro['"]/)
    expect(text(CONFIG.essayLayout)).toContain('Brad Thome · <time')
    expect(text(CONFIG.layout)).toContain(`href="${PAGE.href}"`)
    expect(text(CONFIG.layout)).toMatch(/<html\b[^>]*\blang=["']en["']/)
  })

  test('S1.5 nothing moves with reduced motion on: animation and transition only inside a no-preference query (D122)', () => {
    const MOTION = /@keyframes|\banimation(?:-name)?\s*:|\btransition(?:-property)?\s*:/
    // The planted cases show the check tells the two apart.
    expect(stillSource('a { transition: color 1s }')).toMatch(MOTION)
    expect(stillSource('@media (prefers-reduced-motion: no-preference) { a { transition: color 1s } }')).not.toMatch(MOTION)
    expect(stillSource('@media (prefers-reduced-motion: reduce) { a { transition: color 1s } }')).toMatch(MOTION)
    for (const { file, text: source } of siteSources()) {
      expect(stillSource(source), file).not.toMatch(MOTION)
      for (const classes of source.match(/\bclass(?:Name)?=["'][^"']*["']/g) ?? []) {
        expect(classes, file).not.toMatch(/\b(?:animate-[a-z]+|transition(?:-[a-z]+)?)\b/)
      }
    }
  })

  test("FR-006 the site's source names no host but the repo's link, the site's own address and the links D112 allows", () => {
    // The repo and the site may be named with any path; the other links only exactly.
    const allowed = [PAGE.repo, 'https://bradthome.com']
    const exact: readonly string[] = OUTSIDE_LINKS
    // Spec 018's analytics post to Umami Cloud's API, named in one file only (D159).
    const UMAMI = { file: 'src/components/analytics/umami.ts', host: 'https://gateway.umami.is' }
    for (const { file, text: source } of [{ file: 'astro.config.mjs', text: text(CONFIG.astro) }, ...siteSources()]) {
      for (const url of source.match(/\bhttps?:\/\/[^\s"'`<>)]+/g) ?? []) {
        if (file === UMAMI.file && url === UMAMI.host) continue
        expect(exact.includes(url) || allowed.some((prefix) => url === prefix || url.startsWith(`${prefix}/`)), `${file}: ${url}`).toBe(true)
      }
      expect(source, file).not.toMatch(/(?:src|href)=["']\/\//)
    }
  })
})
