import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { sitePath } from './paths.ts'

// What the page shows, from the mocks, D92 and, since spec 007 ported today's
// home page, D112, and the site's source files read as text.

export const PAGE = {
  heading: 'Brad Thome',
  line: 'Senior full-stack product engineer in Dallas–Fort Worth. I build products where AI agents do most of the engineering and deterministic systems keep them honest.',
  /** The page's first link in its text: the Writing card. */
  link: 'How one person runs a 1.4M-download product with AI agents',
  href: '/vindecoded-agents',
  /** The repo, which the source may name (FR-006). */
  repo: 'https://github.com/memorex386/bradthome',
  title: 'Brad Thome',
} as const

/** The other hosts the source may link, as links, not requests (FR-006, D112). */
export const OUTSIDE_LINKS = ['https://github.com/memorex386', 'https://www.linkedin.com/in/brad-thome/', 'https://vindecoded.com'] as const

/** The page's links in Tab order (S1.4): the header, the card, VINDecoded and the footer. */
export const TAB_ORDER = ['/', 'https://github.com/memorex386', 'https://www.linkedin.com/in/brad-thome/', '/vindecoded-agents', 'https://vindecoded.com', '/'] as const

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
