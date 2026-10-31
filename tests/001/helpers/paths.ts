import path from 'node:path'

// Found from this file, so the tests run the same from any working directory
// or worktree.
export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const TESTS_DIR = path.join(REPO_ROOT, 'tests', '001')
export const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures')
export const FROZEN_CASES_DIR = path.join(TESTS_DIR, 'frozen-cases')
export const SPEC_DIR = path.join(REPO_ROOT, 'specs', '001-hooks-and-agent-rules')

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts)
}

export function fixturePath(...parts: string[]): string {
  return path.join(FIXTURES_DIR, ...parts)
}

/** A path with forward slashes, the way git, sh and the mocks write it. */
export function slash(p: string): string {
  return p.replaceAll('\\', '/')
}

/** The product's entry points, as the plan names them. */
export const SCRIPTS = {
  preCommit: repoPath('scripts', 'hooks', 'pre-commit.ts'),
  commitMsg: repoPath('scripts', 'hooks', 'commit-msg.ts'),
  prePush: repoPath('scripts', 'hooks', 'pre-push.ts'),
  terms: repoPath('scripts', 'terms.ts'),
  lock: repoPath('scripts', 'lock-tests.ts'),
  trace: repoPath('scripts', 'trace.ts'),
  sync: repoPath('scripts', 'sync.ts'),
  setupCheck: repoPath('scripts', 'setup-check.ts'),
  guardInstall: repoPath('scripts', 'guard-install.ts'),
  guard: repoPath('.claude', 'hooks', 'guard.ts'),
  turnStart: repoPath('.claude', 'hooks', 'turn-start.ts'),
  stop: repoPath('.claude', 'hooks', 'stop.ts'),
  userGuard: repoPath('.claude', 'hooks', 'user-guard.ts'),
} as const
