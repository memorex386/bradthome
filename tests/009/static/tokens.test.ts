import { describe, expect, test } from 'vitest'
import { colorTokens, contrast, contrastPairs, FILES, over, read } from '../helpers/ds.ts'

// The design system's tokens, read as text (S1.1, S1.2, S1.4, FR-001, FR-002,
// FR-010, SC-001). The browser tests check what a visitor gets; these check
// what the build is told.

/** The colors Home v2 draws, in each theme (D118). */
const HOME_V2 = {
  bg: ['#fafaf8', '#0f1115'],
  surface: ['#ffffff', '#161920'],
  soft: ['#f1f1ec', '#1b1f27'],
  ink: ['#111318', '#eceef2'],
  'ink-2': ['#2b2f37', '#cdd2da'],
  muted: ['#5b6270', '#9aa2af'],
  dim: ['#858b96', '#6e7581'],
  rule: ['#e3e3dd', '#272c35'],
  accent: ['#2a55e5', '#8ea8ff'],
  'accent-soft': ['#eaf0fe', '#1c2440'],
  'on-accent': ['#ffffff', '#0f1115'],
  band: ['#0e1116', '#07080b'],
  'band-ink': ['#e8eaed', '#e8eaed'],
  'band-muted': ['#a3abb7', '#a3abb7'],
  'band-accent': ['#8ea8ff', '#8ea8ff'],
  'band-rule': ['#262b33', '#1e232b'],
  // Amended by spec 038 (D230): the band's quiet mark, dark's dim in both themes, for the sparkle at rest in the band.
  'band-dim': ['#6e7581', '#6e7581'],
} as const

describe('the tokens', () => {
  test("S1.1 FR-001 the colors are Home v2's, each a light-dark() pair in Tailwind's @theme", () => {
    const css = read(FILES.tokens)
    expect(css).toMatch(/@theme\b/)
    const tokens = colorTokens(css)
    for (const [name, [light, dark]] of Object.entries(HOME_V2)) {
      expect(tokens.get(name), name).toEqual({ light, dark })
    }
  })

  test('S1.1 FR-001 the type, space, radius, shadow and motion tokens are all defined', () => {
    const css = read(FILES.tokens)
    const names = [
      '--font-display',
      '--font-sans',
      '--font-mono',
      '--text-display',
      '--text-title',
      '--text-heading',
      '--text-subheading',
      '--text-lede',
      '--text-body',
      '--text-small',
      '--text-caption',
      '--text-eyebrow',
      '--text-stat',
      '--spacing',
      '--spacing-gutter',
      '--spacing-section',
      '--container-page',
      '--radius-pill',
      '--radius-card',
      '--radius-panel',
      '--radius-note',
      '--shadow-raised',
      '--shadow-ask',
      '--ease-out-soft',
      '--duration-quick',
      '--duration-base',
      '--duration-intro',
    ]
    for (const name of names) expect(css, name).toMatch(new RegExp(`${name}:\\s*\\S`))
    expect(css).toMatch(/--text-display--line-height:/)
    expect(css).toMatch(/--text-heading--letter-spacing:/)
  })

  test('S1.2 FR-010 SC-001 every pair in the contrast table meets its ratio, in light and in dark', () => {
    const pairs = contrastPairs()
    expect(pairs.length).toBeGreaterThan(40)
    const short = pairs.filter((pair) => pair.ratio < pair.needs).map((pair) => `${pair.mark} on ${pair.on}, ${pair.theme}: ${pair.ratio.toFixed(2)} < ${pair.needs}`)
    expect(short).toEqual([])
  })

  // Amended by spec 038 (D230): the band's dim, which the sparkle rests in there, is a mark too, never text.
  test('S1.2 FR-010 dim is never text: it measures under 4.5:1 somewhere, so no component colors text with it', () => {
    for (const mark of ['dim', 'band-dim']) {
      const pairs = contrastPairs().filter((pair) => pair.mark === mark)
      expect(pairs.length, mark).toBeGreaterThan(0)
      expect(
        pairs.some((pair) => pair.ratio < 4.5),
        mark,
      ).toBe(true)
    }
    const components = read(FILES.components)
    for (const rule of components.match(/[^{}]+\{[^{}]*\}/g) ?? []) {
      expect(rule, 'a rule colors text with dim').not.toMatch(/(?:^|[;\s{])color:\s*var\(--color-(?:band-)?dim\)/)
    }
  })

  // Spec 038 (D230): the band's highlighted card is the band under a tint of its accent, so the sparkle's band-dim is
  // checked there too. The tint is read from the card's rule, so a change to it is checked as well.
  test('S1.2 FR-010 SC-001 band-dim keeps 3:1 on the band and on its highlighted card, in light and in dark', () => {
    const tint = /\.ds-band \.ds-card--highlight \{\s*background: rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\);/.exec(read(FILES.components))
    expect(tint, 'the band’s highlighted card is a tint').not.toBeNull()
    const [r = 0, g = 0, b = 0, alpha = 0] = (tint ?? []).slice(1).map(Number)
    const tokens = colorTokens()
    for (const theme of ['light', 'dark'] as const) {
      const band = tokens.get('band')?.[theme] ?? ''
      const dim = tokens.get('band-dim')?.[theme] ?? ''
      expect(contrast(dim, band), `band-dim on the band, ${theme}`).toBeGreaterThanOrEqual(3)
      expect(contrast(dim, over(band, [r, g, b], alpha)), `band-dim on the band's highlighted card, ${theme}`).toBeGreaterThanOrEqual(3)
    }
  })

  test('S1.3 the page follows the device by color-scheme, with no script or stored choice', () => {
    expect(read(FILES.tokens)).toMatch(/:root\s*\{\s*color-scheme:\s*light dark;/)
    for (const file of [FILES.tokens, FILES.components, FILES.gallery, FILES.layout, FILES.page]) {
      expect(read(file), file).not.toMatch(/localStorage|matchMedia|data-theme|<script\b/)
    }
  })
})

describe('the fonts', () => {
  test("S1.4 FR-002 Inter Tight and JetBrains Mono come through the Fonts API's local provider, from pinned Fontsource packages", () => {
    const config = read(FILES.astro)
    for (const [name, pkg] of [
      ['Inter Tight', '@fontsource-variable/inter-tight'],
      ['JetBrains Mono', '@fontsource-variable/jetbrains-mono'],
      ['Inter', '@fontsource-variable/inter'],
    ] as const) {
      expect(config, name).toMatch(new RegExp(`name: '${name}'`))
      expect(config, pkg).toContain(`${pkg}/files/`)
      const deps = (JSON.parse(read(FILES.sitePackage)) as { dependencies: Record<string, string> }).dependencies
      expect(deps[pkg], pkg).toMatch(/^\d+\.\d+\.\d+$/)
    }
    expect(config).not.toMatch(/fontProviders\.(?:google|fontsource|bunny|adobe|fontshare|npm)\(/)
    expect(config).not.toMatch(/display: '(?:block|optional)'/)
  })

  test('S1.4 FR-002 both fonts are under the SIL Open Font License 1.1', () => {
    for (const pkg of ['inter-tight', 'jetbrains-mono']) {
      const manifest = JSON.parse(read(FILES.sitePackage.replace('package.json', `node_modules/@fontsource-variable/${pkg}/package.json`))) as {
        license: string
      }
      expect(manifest.license, pkg).toBe('OFL-1.1')
    }
  })

  test('S1.4 FR-002 the layout preloads the three fonts, and each has a size-adjusted fallback', () => {
    const layout = read(FILES.layout)
    for (const variable of ['--font-inter-tight', '--font-inter', '--font-jetbrains-mono']) {
      expect(layout, variable).toMatch(new RegExp(`<Font cssVariable="${variable}" preload />`))
    }
    const tokens = read(FILES.tokens)
    for (const family of ['Inter Tight fallback', 'JetBrains Mono fallback', 'Inter fallback']) {
      const face = new RegExp(`font-family: '${family}';[^}]*size-adjust: [\\d.]+%;[^}]*ascent-override`)
      expect(tokens, family).toMatch(face)
    }
  })
})
