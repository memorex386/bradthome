import { git, type GitOptions, mergeBaseWithMain, readBlobs, runGit, splitZ } from './git.ts'

// Locked tests (FR-011, D21). A file is locked when a spec's tests.lock lists
// it, at HEAD or in the index. It may change only on a branch that also
// changes that spec's spec.md, compared with where the branch left main.

export const LOCK_FILE = /^specs\/([^/]+)\/tests\.lock$/
const SPEC_FILE = /^specs\/([^/]+)\/spec\.md$/
const LOCK_LINE = /^[0-9a-f]{64} {2}(.+)$/

export interface LockedChange {
  file: string
  /** The spec's folder under specs/, such as 001-hooks-and-agent-rules. */
  spec: string
}

/** A spec folder's number: 001 for 001-hooks-and-agent-rules. */
export function specNumber(spec: string): string {
  return /^(\d+)/.exec(spec)?.[1] ?? spec
}

/** Every locked file, with the spec folder whose tests.lock lists it. */
export function lockedFiles(options: GitOptions): Map<string, string> {
  const names = splitZ(git(['ls-files', '-z', '--', 'specs'], options))
    .filter((file) => LOCK_FILE.test(file))
    .map((file) => `:${file}`)
  const head = runGit(['ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', 'specs'], options)
  if (head.status === 0) {
    for (const file of splitZ(head.stdout)) if (LOCK_FILE.test(file)) names.push(`HEAD:${file}`)
  }
  const locked = new Map<string, string>()
  for (const [name, text] of readBlobs(names, options)) {
    const spec = LOCK_FILE.exec(name.slice(name.indexOf(':') + 1))?.[1]
    if (spec === undefined) continue
    for (const line of text.split('\n')) {
      const file = LOCK_LINE.exec(line.replace(/\r$/, ''))?.[1]
      if (file !== undefined) locked.set(file, spec)
    }
  }
  return locked
}

/**
 * The spec folders whose spec.md the branch changes. At a commit, that's what's
 * staged. Where there's no main to compare with, no spec counts as changed.
 */
export function changedSpecs(options: GitOptions, withWorkingTree = false): Set<string> {
  const base = mergeBaseWithMain(options)
  const changed = new Set<string>()
  if (base === undefined) return changed
  const diffs = [['diff', '--cached', '--name-only', '-z', '--no-renames', base, '--', 'specs']]
  if (withWorkingTree) diffs.push(['diff', '--name-only', '-z', '--no-renames', base, '--', 'specs'])
  for (const args of diffs) {
    for (const file of splitZ(git(args, options))) {
      const spec = SPEC_FILE.exec(file)?.[1]
      if (spec !== undefined) changed.add(spec)
    }
  }
  return changed
}

/** The staged changes to locked tests, or to a tests.lock, whose spec the branch doesn't change (G5). */
export function lockedChanges(staged: readonly string[], options: GitOptions): LockedChange[] {
  const locked = lockedFiles(options)
  const touched = staged
    .map((file) => ({ file, spec: LOCK_FILE.exec(file)?.[1] ?? locked.get(file) }))
    .filter((change): change is LockedChange => change.spec !== undefined)
  if (touched.length === 0) return []
  const changed = changedSpecs(options)
  return touched.filter((change) => !changed.has(change.spec))
}
