import path from 'node:path'

// Found from this file, so the tests run the same from any working directory
// or worktree. Spec 001's helpers hold the rest: sandboxes, scratch repos and
// made-up terms.
export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const TESTS_DIR = path.join(REPO_ROOT, 'tests', '002')
export const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures')
export const SPEC_DIR = path.join(REPO_ROOT, 'specs', '002-ci-and-rulesets')

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts)
}

export function fixturePath(...parts: string[]): string {
  return path.join(FIXTURES_DIR, ...parts)
}

/** The product's entry points, as the plan names them. */
export const CI = {
  gate: repoPath('scripts', 'ci', 'gate.ts'),
  privacy: repoPath('scripts', 'ci', 'privacy.ts'),
  secrets: repoPath('scripts', 'ci', 'secrets.ts'),
  commits: repoPath('scripts', 'ci', 'commits.ts'),
  traceAll: repoPath('scripts', 'ci', 'trace-all.ts'),
  hygiene: repoPath('scripts', 'ci', 'hygiene.ts'),
  lock: repoPath('scripts', 'ci', 'lock.ts'),
} as const

export const SCRIPTS = {
  rulesetCheck: repoPath('scripts', 'ruleset-check.ts'),
  setupCheck: repoPath('scripts', 'setup-check.ts'),
  guardInstall: repoPath('scripts', 'guard-install.ts'),
} as const

export const GITHUB = {
  ci: repoPath('.github', 'workflows', 'ci.yml'),
  lockedTests: repoPath('.github', 'workflows', 'locked-tests.yml'),
  workflows: repoPath('.github', 'workflows'),
  dependabot: repoPath('.github', 'dependabot.yml'),
  codeowners: repoPath('.github', 'CODEOWNERS'),
  ruleset: repoPath('.github', 'rulesets', 'main.json'),
  prTemplate: repoPath('.github', 'pull_request_template.md'),
} as const

/** The repo on GitHub, as its remote and the API name it. */
export const REPO_SLUG = 'memorex386/bradthome'
export const REPO_REMOTE = `https://github.com/${REPO_SLUG}.git`
export const BRAD_LOGIN = 'memorex386'
