import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { sitePath } from './paths.ts'

// What the page shows, from the mocks, D92 and D112, and since v2.0 retired
// v1's home, the essay, the page that keeps v1's layout, tokens and fonts
// (D121, D167). The site's source files are read as text.

export const PAGE = {
  /** The page spec 003's page checks read. */
  path: '/vindecoded-agents',
  /** The heading, with the non-breaking hyphen the essay's layout puts in it. */
  heading: 'Running a 1.4M‑download product with AI agents',
  /** The line under the heading: the byline. */
  line: 'Brad Thome · October 28, 2026',
  description:
    'How VINDecoded ships with AI agents writing most of the code. Docs every agent reads first, a worktree each, locked tests, a second reviewer, a kill switch on every feature and one audited door to production.',
  /** The page's first link: the header's name, to the home. */
  link: 'Brad Thome',
  href: '/',
  /** The repo, which the source may name (FR-006). */
  repo: 'https://github.com/memorex386/bradthome',
  title: 'Running a 1.4M-download product with AI agents · Brad Thome',
  /** The essay's front matter title, as its source holds it (D163). */
  sourceTitle: 'Running a 1.4M-download product with AI agents',
} as const

/** The other hosts the source may link, as links, not requests (FR-006, D112). */
export const OUTSIDE_LINKS = ['https://github.com/memorex386', 'https://www.linkedin.com/in/brad-thome/', 'https://vindecoded.com'] as const

/** A stop that's a scrollable region, which takes focus so a keyboard can scroll it, rather than a link. */
export const SCROLLER = 'scroll region'

/**
 * The page's Tab stops in order (S1.4): the header's name, GitHub and
 * LinkedIn, the essay's eight scrollable regions (six tables, the diagram and
 * a code block), and the footer's link home.
 */
export const TAB_ORDER: readonly string[] = [
  '/',
  'https://github.com/memorex386',
  'https://www.linkedin.com/in/brad-thome/',
  ...Array<string>(8).fill(SCROLLER),
  '/',
]

/** v0's colors, as the mocks list them, for each theme. */
export const COLORS = {
  light: { background: '#fbfaf7', text: '#1d1e20', quiet: '#5c6066', accent: '#2357c6' },
  dark: { background: '#131416', text: '#e9e7e3', quiet: '#a3a7ae', accent: '#82a8ff' },
} as const

/** A hex color as the rgb() string a browser's computed style gives. */
export function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`
}

/** Every file under apps/site/src, with its text. */
export function siteSources(): { file: string; text: string }[] {
  const dir = sitePath('src')
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
    .map((file) => ({ file: path.relative(sitePath(), file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))
}

/** A policy's directives, by name. */
export function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((parts) => parts[0] !== undefined && parts[0] !== '')
      .map(([name = '', ...values]) => [name.toLowerCase(), values]),
  )
}
