import path from 'node:path'

// The home page and the shared header and footer as today's site shows them,
// and the paths these tests read (spec 007). The end-to-end tests reuse spec
// 003's states, helpers and Playwright settings.

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const TESTS_DIR = path.join(REPO_ROOT, 'tests', '007')

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts)
}

export const FILES = {
  baseLayout: repoPath('apps', 'site', 'src', 'layouts', 'Base.astro'),
  essayLayout: repoPath('apps', 'site', 'src', 'layouts', 'Essay.astro'),
  index: repoPath('apps', 'site', 'src', 'pages', 'index.astro'),
  notFound: repoPath('apps', 'site', 'src', 'pages', '404.astro'),
  siteCss: repoPath('apps', 'site', 'src', 'styles', 'site.css'),
  essayCss: repoPath('apps', 'site', 'src', 'styles', 'essay.css'),
  vindecoded: repoPath('apps', 'site', 'content', 'projects', 'vindecoded.yaml'),
  src: repoPath('apps', 'site', 'src'),
  content: repoPath('apps', 'site', 'content'),
  dist: repoPath('apps', 'site', 'dist'),
  lighthouse: repoPath('lighthouserc.json'),
  /**
   * Today's home page's text, from https://bradthome.com/ on 2026-11-03,
   * through pageText(), with the second Work item taken out (D111). The
   * item's name is on Brad's private-term list, so it isn't written here.
   */
  home: path.join(TESTS_DIR, 'fixtures', 'home.txt'),
} as const

/** The three pages that share the header and footer. */
export const PAGES = [
  { path: '/', name: 'home' },
  { path: '/vindecoded-agents', name: 'essay' },
  { path: '/no-such-page', name: '404' },
] as const

export const LINE =
  'Senior full-stack product engineer in Dallas–Fort Worth. I build products where AI agents do most of the engineering and deterministic systems keep them honest.'

export const HOME = {
  title: 'Brad Thome',
  description: LINE,
  canonical: 'https://bradthome.com/',
  card: { title: 'How one person runs a 1.4M-download product with AI agents', href: '/vindecoded-agents' },
  work: [{ name: 'VINDecoded', href: 'https://vindecoded.com' }],
} as const

export const CHROME = {
  name: 'Brad Thome',
  github: 'https://github.com/memorex386',
  linkedin: 'https://www.linkedin.com/in/brad-thome/',
  footer: 'Brad Thome · Dallas–Fort Worth',
} as const

/** Every address on another host the site may link (spec 003's FR-006, D112). */
export const OUTSIDE_LINKS = [CHROME.github, CHROME.linkedin, 'https://vindecoded.com', 'https://github.com/memorex386/bradthome'] as const

/** The home page's Tab order (S3.1), by each link's address. */
export const TAB_ORDER = ['/', CHROME.github, CHROME.linkedin, HOME.card.href, 'https://vindecoded.com', '/'] as const

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Decodes the character references a built page uses. */
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref.startsWith('#x') || ref.startsWith('#X')) return String.fromCodePoint(Number.parseInt(ref.slice(2), 16))
    if (ref.startsWith('#')) return String.fromCodePoint(Number.parseInt(ref.slice(1), 10))
    return ENTITIES[ref.toLowerCase()] ?? match
  })
}

/** Replaces a pattern until nothing changes, so a removal can't leave a new match behind. */
function untilStable(text: string, pattern: RegExp, replacement: string): string {
  let previous: string
  let current = text
  do {
    previous = current
    current = previous.replace(pattern, replacement)
  } while (current !== previous)
  return current
}

/**
 * A page's body as words: its style blocks removed, every tag turned into a
 * space, references decoded and whitespace collapsed. Tags become spaces, so
 * the same words read the same whether or not the build compresses the
 * whitespace between elements.
 */
export function pageText(html: string): string {
  const body = /<body\b[\s\S]*<\/body>/.exec(html)?.[0] ?? ''
  return decode(untilStable(untilStable(body, /<style\b[\s\S]*?<\/style>/g, ''), /<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** The first word where two texts part, for a failure message. */
export function firstDifference(actual: string, expected: string): string {
  const a = actual.split(' ')
  const b = expected.split(' ')
  const index = a.findIndex((word, i) => word !== b[i])
  const at = index === -1 ? Math.min(a.length, b.length) : index
  return `word ${at + 1}: got "${a.slice(at, at + 8).join(' ')}", expected "${b.slice(at, at + 8).join(' ')}"`
}
