// Locked tests (FR-011). Each spec's tests.lock lists its locked files. A
// commit may change a locked file, or a tests.lock, only when the branch also
// changes that spec's spec.md compared with main.

import { execFileSync } from 'node:child_process'

export interface LockedChange {
  readonly file: string
  /** The spec folder, such as 001-hooks-and-agent-rules. */
  readonly spec: string
}

const LOCK_FILE = /^specs\/([^/]+)\/tests\.lock$/
const SPEC_FILE = /^specs\/([^/]+)\/spec\.md$/

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function tryGit(...args: string[]): string | undefined {
  try {
    return git(...args)
  } catch {
    return undefined
  }
}

/** The merge base with main: origin/main, or main when there's no origin/main. */
function mainBase(): string | undefined {
  return tryGit('merge-base', 'HEAD', 'origin/main') ?? tryGit('merge-base', 'HEAD', 'main')
}

/** Each locked file, and the spec folder whose tests.lock lists it, at HEAD or in the index. */
export function lockedFiles(): Map<string, string> {
  const locked = new Map<string, string>()
  const locks = git('ls-files', '--', 'specs/*/tests.lock').split('\n').filter((file) => file !== '')
  for (const lock of locks) {
    const spec = LOCK_FILE.exec(lock)?.[1]
    if (spec === undefined) continue
    for (const text of [tryGit('show', `HEAD:${lock}`), tryGit('show', `:${lock}`)]) {
      for (const line of (text ?? '').split('\n')) {
        const file = /^[0-9a-f]{64} {2}(.+)$/.exec(line)?.[1]
        if (file !== undefined) locked.set(file, spec)
      }
    }
  }
  return locked
}

/** The spec folders whose spec.md in the index differs from the merge base with main. */
export function changedSpecs(): Set<string> {
  const base = mainBase()
  if (base === undefined) return new Set()
  const files = git('diff', '--cached', '--name-only', base, '--', 'specs/*/spec.md').split('\n')
  return new Set(files.map((file) => SPEC_FILE.exec(file)?.[1]).filter((spec) => spec !== undefined))
}

/** The staged locked files and tests.lock files whose spec the branch doesn't change. */
export function lockedChanges(staged: readonly string[]): LockedChange[] {
  const locked = lockedFiles()
  const changed = changedSpecs()
  return staged
    .filter((file) => locked.has(file))
    .map((file) => ({ file, spec: locked.get(file) ?? '' }))
    .filter((change) => !changed.has(change.spec))
}
