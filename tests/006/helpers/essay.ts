import path from 'node:path'

// The essay as today's page shows it, and the paths these tests read. The
// end-to-end tests reuse spec 003's states, helpers and Playwright settings.

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const TESTS_DIR = path.join(REPO_ROOT, 'tests', '006')

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts)
}

export const FILES = {
  mdx: repoPath('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx'),
  essayLayout: repoPath('apps', 'site', 'src', 'layouts', 'Essay.astro'),
  baseLayout: repoPath('apps', 'site', 'src', 'layouts', 'Base.astro'),
  diagram: repoPath('apps', 'site', 'src', 'components', 'SystemDiagram.astro'),
  table: repoPath('apps', 'site', 'src', 'components', 'Table.astro'),
  essayCss: repoPath('apps', 'site', 'src', 'styles', 'essay.css'),
  index: repoPath('apps', 'site', 'src', 'pages', 'index.astro'),
  notFound: repoPath('apps', 'site', 'src', 'pages', '404.astro'),
  astro: repoPath('apps', 'site', 'astro.config.mjs'),
  sitePackage: repoPath('apps', 'site', 'package.json'),
  lighthouse: repoPath('lighthouserc.json'),
  prettierIgnore: repoPath('.prettierignore'),
  siteReport: repoPath('scripts', 'ci', 'site-report.ts'),
  /** Today's article text, from https://bradthome.com/vindecoded-agents on 2026-11-03, through articleText(), with D163's title. */
  article: path.join(TESTS_DIR, 'fixtures', 'article.txt'),
} as const

export const PATH = '/vindecoded-agents'

/** Today's page's front matter and head, which the port keeps. */
export const ESSAY = {
  /** D163 renamed it at v2.0; the article's words are otherwise today's. */
  title: 'Running a 1.4M-download product with AI agents',
  description:
    'How VINDecoded ships with AI agents writing most of the code. Docs every agent reads first, a worktree each, locked tests, a second reviewer, a kill switch on every feature and one audited door to production.',
  date: '2026-10-28',
  byline: 'Brad Thome · October 28, 2026',
  canonical: 'https://bradthome.com/vindecoded-agents',
} as const

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }

/** Decodes the character references a built page uses. */
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref.startsWith('#x') || ref.startsWith('#X')) return String.fromCodePoint(Number.parseInt(ref.slice(2), 16))
    if (ref.startsWith('#')) return String.fromCodePoint(Number.parseInt(ref.slice(1), 10))
    return ENTITIES[ref.toLowerCase()] ?? match
  })
}

/**
 * A page's article as words: the first <article>'s HTML with its style
 * blocks and tags removed, references decoded and whitespace collapsed. The
 * diagram's SVG text is part of it.
 */
export function articleText(html: string): string {
  const article = /<article\b[\s\S]*?<\/article>/.exec(html)?.[0] ?? ''
  return decode(untilStable(untilStable(article, /<style\b[\s\S]*?<\/style>/g, ''), /<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
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

/** The first word where two texts part, for a failure message. */
export function firstDifference(actual: string, expected: string): string {
  const a = actual.split(' ')
  const b = expected.split(' ')
  const index = a.findIndex((word, i) => word !== b[i])
  const at = index === -1 ? Math.min(a.length, b.length) : index
  return `word ${at + 1}: got "${a.slice(at, at + 8).join(' ')}", today's page has "${b.slice(at, at + 8).join(' ')}"`
}
