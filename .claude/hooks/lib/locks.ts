import { existsSync } from 'node:fs'
import path from 'node:path'
import { runGit, topLevel } from './git.ts'

// Locked tests, for an edit before it happens (FR-020, D21). A file is locked
// when a spec's tests.lock lists it, at HEAD or in the index. The edit may go
// ahead once the branch changes that spec's spec.md compared with where it
// left main, counting changes that aren't committed yet.

const LOCK_FILE = /^specs\/([^/]+)\/tests\.lock$/
const LOCK_LINE = /^[0-9a-f]{64} {2}(.+)$/

export interface Locked {
  /** The file's path in its checkout, with forward slashes. */
  file: string
  /** The spec's number, such as 001. */
  spec: string
}

function slash(p: string): string {
  return p.replaceAll('\\', '/')
}

/** The checkout a file is in: found from the file's own folder, or else the session's. */
function checkoutOf(file: string, cwd: string): string | undefined {
  let dir = path.dirname(file)
  while (!existsSync(dir) && path.dirname(dir) !== dir) dir = path.dirname(dir)
  return topLevel(dir) ?? topLevel(cwd)
}

function lockText(root: string, name: string): string | undefined {
  const result = runGit(['cat-file', 'blob', name], root)
  return result.status === 0 ? result.stdout : undefined
}

function mergeBase(root: string): string | undefined {
  for (const main of ['origin/main', 'main']) {
    const result = runGit(['merge-base', 'HEAD', main], root)
    if (result.status === 0) return result.stdout.trim()
  }
  return undefined
}

function specChanged(root: string, spec: string): boolean {
  const base = mergeBase(root)
  if (base === undefined) return false
  const file = `specs/${spec}/spec.md`
  for (const args of [
    ['diff', '--cached', '--name-only', base, '--', file],
    ['diff', '--name-only', base, '--', file],
  ]) {
    const result = runGit(args, root)
    if (result.status === 0 && result.stdout.trim() !== '') return true
  }
  return false
}

/** The lock an edit would break: the file and its spec, when the branch doesn't change that spec. */
export function lockedEdit(filePath: string, cwd: string): Locked | undefined {
  const full = path.resolve(cwd, filePath)
  const root = checkoutOf(full, cwd)
  if (root === undefined) return undefined
  const file = slash(path.relative(root, full))
  // Every locked file sits in a spec's test folder, tests/NNN/ (D78).
  if (file.startsWith('..') || (!file.startsWith('tests/') && !LOCK_FILE.test(file))) return undefined

  let specFolder = LOCK_FILE.exec(file)?.[1]
  const locks = new Set<string>()
  for (const [args, prefix] of [
    [['ls-files', '--', 'specs'], ':'],
    [['ls-tree', '-r', '--name-only', 'HEAD', '--', 'specs'], 'HEAD:'],
  ] as const) {
    const result = runGit(args, root)
    if (result.status !== 0) continue
    for (const lock of result.stdout.split('\n')) if (LOCK_FILE.test(lock)) locks.add(`${prefix}${lock}`)
  }
  if (specFolder !== undefined && ![...locks].some((name) => name.endsWith(`:${file}`))) specFolder = undefined
  if (specFolder === undefined) {
    for (const name of locks) {
      const text = lockText(root, name)
      if (text === undefined) continue
      const listed = text.split('\n').some((line) => LOCK_LINE.exec(line.replace(/\r$/, ''))?.[1] === file)
      if (listed) {
        specFolder = LOCK_FILE.exec(name.slice(name.indexOf(':') + 1))?.[1]
        break
      }
    }
  }
  if (specFolder === undefined || specChanged(root, specFolder)) return undefined
  return { file, spec: /^(\d+)/.exec(specFolder)?.[1] ?? specFolder }
}
