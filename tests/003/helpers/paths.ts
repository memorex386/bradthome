import path from 'node:path'

// Found from this file, so the tests run the same from any working directory
// or worktree. Spec 001's and 002's helpers hold the sandboxes, scratch repos,
// runners and workflow readers.
export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const TESTS_DIR = path.join(REPO_ROOT, 'tests', '003')
export const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures')
export const SPEC_DIR = path.join(REPO_ROOT, 'specs', '003-skeleton-and-pipeline')
export const SITE_DIR = path.join(REPO_ROOT, 'apps', 'site')

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts)
}

export function fixturePath(...parts: string[]): string {
  return path.join(FIXTURES_DIR, ...parts)
}

export function sitePath(...parts: string[]): string {
  return path.join(SITE_DIR, ...parts)
}

/** The product's entry points, as the plan names them. */
export const SCRIPTS = {
  csp: repoPath('scripts', 'site', 'csp.ts'),
  visual: repoPath('scripts', 'site', 'visual.ts'),
  siteReport: repoPath('scripts', 'ci', 'site-report.ts'),
  previewCredentials: repoPath('scripts', 'ci', 'preview-credentials.ts'),
  previewDeploy: repoPath('scripts', 'ci', 'preview-deploy.ts'),
  previewComment: repoPath('scripts', 'ci', 'preview-comment.ts'),
  nightlySummary: repoPath('scripts', 'ci', 'nightly-summary.ts'),
  gate: repoPath('scripts', 'ci', 'gate.ts'),
  setupCheck: repoPath('scripts', 'setup-check.ts'),
  guardInstall: repoPath('scripts', 'guard-install.ts'),
} as const

export const GITHUB = {
  workflows: repoPath('.github', 'workflows'),
  ci: repoPath('.github', 'workflows', 'ci.yml'),
  lockedTests: repoPath('.github', 'workflows', 'locked-tests.yml'),
  preview: repoPath('.github', 'workflows', 'preview.yml'),
  nightly: repoPath('.github', 'workflows', 'nightly.yml'),
  ruleset: repoPath('.github', 'rulesets', 'main.json'),
  prTemplate: repoPath('.github', 'pull_request_template.md'),
} as const

export const CONFIG = {
  firebase: repoPath('firebase.json'),
  firebaserc: repoPath('.firebaserc'),
  playwright: repoPath('playwright.config.ts'),
  lighthouse: repoPath('lighthouserc.json'),
  htmlValidate: repoPath('.htmlvalidate.json'),
  lychee: repoPath('lychee.toml'),
  stryker: repoPath('stryker.config.json'),
  prettier: repoPath('.prettierrc.json'),
  prettierIgnore: repoPath('.prettierignore'),
  workspace: repoPath('pnpm-workspace.yaml'),
  rootPackage: repoPath('package.json'),
  sitePackage: sitePath('package.json'),
  astro: sitePath('astro.config.mjs'),
  eslint: sitePath('eslint.config.js'),
  tokens: sitePath('src', 'styles', 'tokens.css'),
  layout: sitePath('src', 'layouts', 'Base.astro'),
  index: sitePath('src', 'pages', 'index.astro'),
  essay: sitePath('src', 'pages', 'vindecoded-agents.mdx'),
  essayLayout: sitePath('src', 'layouts', 'Essay.astro'),
  notFound: sitePath('src', 'pages', '404.astro'),
} as const

/** The pinned Playwright container, by tag and digest (FR-010, FR-011, D46). */
export const CONTAINER = /mcr\.microsoft\.com\/playwright:v1\.64\.1-noble@sha256:[0-9a-f]{64}/

/** lychee's release and its SHA-256, from the plan. */
export const LYCHEE = {
  version: '0.24.2',
  sha256: '1f4e0ef7f6554a6ed33dd7ac144fb2e1bbed98598e7af973042fc5cd43951c9a',
} as const

/** The repo on GitHub. */
export const REPO_SLUG = 'memorex386/bradthome'
export const REPO_URL = `https://github.com/${REPO_SLUG}`
export const SANDBOX_RUN = /https:\/\/github\.com\/bradthome-agent\/bradthome-ci-sandbox\/actions\/runs\/\d+/
