import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { runGit } from './git.ts'

// What changed in a turn (FR-022, S5.2). The turn-start hook records the
// working tree when a prompt arrives: HEAD, and a hash of each file git shows
// as changed. The Stop hook compares the tree with that record, so changes
// left from before the turn don't count. Records live in the checkout's git
// folder, one per session, and old ones are cleared away.

export interface Snapshot {
  head: string
  files: Record<string, string>
}

const KEEP_DAYS = 7

function hashFile(file: string): string {
  try {
    return createHash('sha1').update(readFileSync(file)).digest('hex')
  } catch {
    return 'missing'
  }
}

export function takeSnapshot(root: string): Snapshot {
  const head = runGit(['rev-parse', '--verify', '--quiet', 'HEAD'], root).stdout.trim()
  const status = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules'], root)
  const files: Record<string, string> = {}
  const entries = status.stdout.split('\0')
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i] ?? ''
    if (entry.length < 4) continue
    const file = entry.slice(3)
    // A rename or copy is followed by its original path.
    if (entry[0] === 'R' || entry[0] === 'C') i += 1
    files[file] = hashFile(path.join(root, file))
  }
  return { head, files }
}

export function snapshotFile(root: string, sessionId: string): string | undefined {
  const gitDir = runGit(['rev-parse', '--absolute-git-dir'], root).stdout.trim()
  if (gitDir === '') return undefined
  return path.join(gitDir, 'bradthome-turns', `${sessionId.replace(/[^\w.-]/g, '_') || 'session'}.json`)
}

export function saveSnapshot(file: string, snapshot: Snapshot): void {
  const dir = path.dirname(file)
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, JSON.stringify(snapshot))
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
  for (const name of readdirSync(dir)) {
    const other = path.join(dir, name)
    try {
      if (other !== file && statSync(other).mtimeMs < cutoff) rmSync(other, { force: true })
    } catch {
      // Another session may have cleared it already.
    }
  }
}

export function loadSnapshot(file: string): Snapshot | undefined {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Snapshot
    return typeof parsed.head === 'string' && typeof parsed.files === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * The paths that changed since the snapshot: files whose content changed, and
 * files that commits made in the turn changed. With no snapshot, as in a turn
 * that began before the hooks were installed, every uncommitted change counts.
 */
export function changedSince(root: string, before: Snapshot | undefined): string[] {
  const now = takeSnapshot(root)
  if (before === undefined) return Object.keys(now.files)
  const changed = new Set<string>()
  for (const file of new Set([...Object.keys(before.files), ...Object.keys(now.files)])) {
    if (before.files[file] !== now.files[file]) changed.add(file)
  }
  if (before.head !== now.head && now.head !== '') {
    const range = before.head === '' ? ['ls-tree', '-r', '-z', '--name-only', now.head] : ['diff', '--name-only', '-z', before.head, now.head]
    for (const file of runGit(range, root).stdout.split('\0')) if (file !== '') changed.add(file)
  }
  return [...changed]
}
