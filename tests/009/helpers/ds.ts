import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Spec 009's paths, its contrast table, and readers for the design system's
// tokens. Found from this file, so the tests run from any working directory.

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const repoPath = (...parts: string[]): string => path.join(REPO_ROOT, ...parts)
export const sitePath = (...parts: string[]): string => repoPath('apps', 'site', ...parts)
export const read = (file: string): string => readFileSync(file, 'utf8')

export const FILES = {
  tokens: sitePath('src', 'styles', 'ds', 'tokens.css'),
  components: sitePath('src', 'styles', 'ds', 'components.css'),
  gallery: sitePath('src', 'styles', 'ds', 'gallery.css'),
  v1Tokens: sitePath('src', 'styles', 'tokens.css'),
  layout: sitePath('src', 'layouts', 'DesignBase.astro'),
  v1Layout: sitePath('src', 'layouts', 'Base.astro'),
  page: sitePath('src', 'pages', 'design-system.astro'),
  astro: sitePath('astro.config.mjs'),
  sitePackage: sitePath('package.json'),
  componentsDir: sitePath('src', 'components', 'ds'),
  dist: sitePath('dist'),
  next: repoPath('.github', 'workflows', 'next.yml'),
  nextDeploy: repoPath('scripts', 'ci', 'next-deploy.ts'),
  spec003: repoPath('specs', '003-skeleton-and-pipeline', 'spec.md'),
  test003: repoPath('tests', '003', 'static', 'site.test.ts'),
  lock003: repoPath('specs', '003-skeleton-and-pipeline', 'tests.lock'),
  agents: repoPath('AGENTS.md'),
  release: repoPath('docs', 'release.md'),
  plan: repoPath('docs', 'plan.md'),
} as const

/** The gallery's address. */
export const GALLERY = '/design-system'

/** Each component file in components/ds/, with its text. */
export function componentSources(): { file: string; text: string }[] {
  return readdirSync(FILES.componentsDir)
    .filter((name) => name.endsWith('.astro'))
    .sort()
    .map((name) => ({ file: name, text: read(path.join(FILES.componentsDir, name)) }))
}

/** Each design-system source: the components, the layout, the gallery and their styles. */
export function designSources(): { file: string; text: string }[] {
  return [
    ...componentSources(),
    ...[FILES.tokens, FILES.components, FILES.gallery, FILES.layout, FILES.page].map((file) => ({ file: path.basename(file), text: read(file) })),
  ]
}

export type Theme = 'light' | 'dark'

/** Every `--color-name: light-dark(a, b)` in the tokens, as hex for each theme. */
export function colorTokens(css: string = read(FILES.tokens)): Map<string, Record<Theme, string>> {
  const found = new Map<string, Record<Theme, string>>()
  for (const match of css.matchAll(/--color-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi)) {
    found.set(match[1] ?? '', { light: (match[2] ?? '').toLowerCase(), dark: (match[3] ?? '').toLowerCase() })
  }
  return found
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG's contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

/** The spec's contrast table: each mark on each background, and the ratio it needs. */
export const CONTRAST_TABLE: readonly { marks: readonly string[]; on: readonly string[]; needs: number }[] = [
  { marks: ['ink', 'ink-2', 'muted', 'accent'], on: ['bg', 'surface', 'soft', 'accent-soft'], needs: 4.5 },
  { marks: ['bg'], on: ['ink'], needs: 4.5 },
  { marks: ['on-accent'], on: ['accent'], needs: 4.5 },
  { marks: ['band-ink', 'band-muted', 'band-accent'], on: ['band'], needs: 4.5 },
  { marks: ['dim'], on: ['bg', 'surface'], needs: 3 },
  // Amended by spec 038 (D230): the sparkle rests in dim on the page and its cards, and in the band's own dim in the band.
  { marks: ['band-dim'], on: ['band'], needs: 3 },
  { marks: ['accent'], on: ['bg', 'surface', 'soft'], needs: 3 },
]

/** A color laid over a background at an opacity, as hex: what a translucent fill shows. */
export function over(background: string, color: readonly [number, number, number], alpha: number): string {
  const channels = [1, 3, 5].map((at, i) =>
    Math.round(alpha * (color[i] ?? 0) + (1 - alpha) * Number.parseInt(background.slice(at, at + 2), 16)),
  )
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** Every pair in the table, with its ratio in each theme. */
export function contrastPairs(tokens = colorTokens()): { mark: string; on: string; theme: Theme; ratio: number; needs: number }[] {
  const pairs: { mark: string; on: string; theme: Theme; ratio: number; needs: number }[] = []
  for (const row of CONTRAST_TABLE) {
    for (const mark of row.marks) {
      for (const on of row.on) {
        for (const theme of ['light', 'dark'] as const) {
          const a = tokens.get(mark)?.[theme]
          const b = tokens.get(on)?.[theme]
          pairs.push({ mark, on, theme, ratio: a && b ? contrast(a, b) : 0, needs: row.needs })
        }
      }
    }
  }
  return pairs
}

/** CSS with each `@media (prefers-reduced-motion: no-preference)` block taken out, braces matched. */
export function withoutMotionBlocks(source: string): { still: string; blocks: string[] } {
  const open = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g
  let still = ''
  let from = 0
  const blocks: string[] = []
  for (let match = open.exec(source); match !== null; match = open.exec(source)) {
    if (match.index < from) continue
    let depth = 1
    let at = match.index + match[0].length
    while (at < source.length && depth > 0) {
      if (source[at] === '{') depth += 1
      else if (source[at] === '}') depth -= 1
      at += 1
    }
    still += source.slice(from, match.index)
    blocks.push(source.slice(match.index, at))
    from = at
  }
  return { still: still + source.slice(from), blocks }
}
