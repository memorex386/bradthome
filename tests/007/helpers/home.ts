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
  designLayout: repoPath('apps', 'site', 'src', 'layouts', 'DesignBase.astro'),
  index: repoPath('apps', 'site', 'src', 'pages', 'index.astro'),
  notFound: repoPath('apps', 'site', 'src', 'pages', '404.astro'),
  siteCss: repoPath('apps', 'site', 'src', 'styles', 'site.css'),
  essayCss: repoPath('apps', 'site', 'src', 'styles', 'essay.css'),
  vindecoded: repoPath('apps', 'site', 'content', 'projects', 'vindecoded.yaml'),
  src: repoPath('apps', 'site', 'src'),
  content: repoPath('apps', 'site', 'content'),
  dist: repoPath('apps', 'site', 'dist'),
  lighthouse: repoPath('lighthouserc.json'),
} as const

/** The pages that share v1's header and footer: v1's home retired with v2.0 (D162). */
export const PAGES = [
  { path: '/vindecoded-agents', name: 'essay' },
  { path: '/no-such-page', name: '404' },
] as const

export const CHROME = {
  name: 'Brad Thome',
  github: 'https://github.com/memorex386',
  linkedin: 'https://www.linkedin.com/in/brad-thome/',
  footer: 'Brad Thome · Dallas–Fort Worth',
} as const

/** Every address on another host the site may link (spec 003's FR-006, D112). */
export const OUTSIDE_LINKS = [CHROME.github, CHROME.linkedin, 'https://vindecoded.com', 'https://github.com/memorex386/bradthome'] as const

/** The first word where two texts part, for a failure message. */
export function firstDifference(actual: string, expected: string): string {
  const a = actual.split(' ')
  const b = expected.split(' ')
  const index = a.findIndex((word, i) => word !== b[i])
  const at = index === -1 ? Math.min(a.length, b.length) : index
  return `word ${at + 1}: got "${a.slice(at, at + 8).join(' ')}", expected "${b.slice(at, at + 8).join(' ')}"`
}
