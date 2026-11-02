import { git } from './git.ts'

// Reads a range of commits and what each one adds, for the pre-push hook and
// the CI jobs. A range is rev-list arguments, such as base..head or
// sha --not --remotes=origin.

export interface Commit {
  sha: string
  short: string
  authorName: string
  authorEmail: string
  committerName: string
  committerEmail: string
  /** How many parents it has: more than one for a merge commit. */
  parents: number
  message: string
}

/**
 * git log -p shows no diff for a merge commit unless asked, so a conflict
 * resolution would go unchecked. Against the first parent, a merge shows every
 * line it brings in, its own changes included.
 */
export const MERGE_DIFFS = '--diff-merges=first-parent'

/** The range's commits, newest first, as git log lists them. */
export function readCommits(range: readonly string[], root: string): Commit[] {
  const format = ['%H', '%h', '%an', '%ae', '%cn', '%ce', '%P', '%B'].join('%x1f')
  const output = git(['log', '--abbrev=7', `--format=${format}%x1e`, ...range], { cwd: root })
  return output
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record !== '')
    .map((record) => {
      const [sha = '', short = '', authorName = '', authorEmail = '', committerName = '', committerEmail = '', parents = '', message = ''] =
        record.split('\x1f')
      const parentCount = parents.split(' ').filter((parent) => parent !== '').length
      return { sha, short, authorName, authorEmail, committerName, committerEmail, parents: parentCount, message }
    })
}

/** Each commit's patch: the lines it adds, by commit. */
export function readPatches(range: readonly string[], root: string): Map<string, string> {
  const output = git(
    [
      '-c',
      'core.quotePath=false',
      'log',
      '-p',
      MERGE_DIFFS,
      '-U0',
      '--no-color',
      '--no-ext-diff',
      '--no-renames',
      '--no-relative',
      '--src-prefix=a/',
      '--dst-prefix=b/',
      '--format=%x01%H',
      ...range,
    ],
    { cwd: root },
  )
  const patches = new Map<string, string>()
  for (const chunk of output.split(/^\x01/m)) {
    const newline = chunk.indexOf('\n')
    if (newline < 0) continue
    patches.set(chunk.slice(0, newline).trim(), chunk.slice(newline + 1))
  }
  return patches
}
