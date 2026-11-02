import { createHash } from 'node:crypto'
import { git, readBlobBuffers, readBlobs, splitZ, topLevel } from '../lib/git.ts'
import { LOCK_FILE, type LockedChange, lockedFiles, specNumber } from '../lib/locks.ts'
import { k8, k8Stale } from '../lib/messages.ts'
import { readEvent } from './lib/event.ts'

// The lock job (FR-011, S3.3), run by locked-tests.yml on pull_request_target
// from main's checkout. The pull request's head is only git objects here: this
// script reads them with git and runs nothing from them, so a pull request
// that edits this check doesn't change its verdict. It uses Node's built-ins
// and lib/ only, since the job installs nothing.
//
// A locked test, or a tests.lock, may change only along with its spec's
// spec.md, and each tests.lock at the head must match the head's test files.

const SPEC_FILE = /^specs\/([^/]+)\/spec\.md$/
const LOCK_LINE = /^([0-9a-f]{64}) {2}(.+)$/

function byteOrder(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b))
}

function readLock(text: string): Map<string, string> {
  const entries = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = LOCK_LINE.exec(line.replace(/\r$/, ''))
    if (match !== null) entries.set(match[2] ?? '', match[1] ?? '')
  }
  return entries
}

/** Each tests.lock at the head that doesn't match the head's test files, as K8's stale block. */
function staleLocks(root: string, head: string): string[][] {
  const locks = splitZ(git(['ls-tree', '-r', '-z', '--name-only', head, '--', 'specs'], { cwd: root })).filter((file) => LOCK_FILE.test(file))
  const texts = readBlobs(locks.map((lock) => `${head}:${lock}`), { cwd: root })
  const blocks: string[][] = []
  for (const lock of locks) {
    const spec = LOCK_FILE.exec(lock)?.[1] ?? ''
    const folder = `tests/${specNumber(spec)}`
    const files = splitZ(git(['ls-tree', '-r', '-z', '--name-only', head, '--', folder], { cwd: root })).sort(byteOrder)
    const blobs = readBlobBuffers(files.map((file) => `${head}:${file}`), { cwd: root })
    const text = files
      .map((file) => `${createHash('sha256').update(blobs.get(`${head}:${file}`) ?? Buffer.alloc(0)).digest('hex')}  ${file}\n`)
      .join('')
    const current = texts.get(`${head}:${lock}`) ?? ''
    if (current === text) continue
    const locked = readLock(current)
    const now = readLock(text)
    const lines: string[] = []
    for (const [file, hash] of now) {
      if (!locked.has(file)) lines.push(`new      ${file}`)
      else if (locked.get(file) !== hash) lines.push(`changed  ${file}`)
    }
    for (const file of locked.keys()) if (!now.has(file)) lines.push(`missing  ${file}`)
    if (lines.length === 0) lines.push('The files match, but the lock is out of order or has a stray line.')
    blocks.push(k8Stale(lock, folder, lines))
  }
  return blocks
}

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const event = readEvent()
  if (event.pullRequest === undefined || event.base === undefined) throw new Error('the lock check runs on pull requests')
  const changed = splitZ(git(['diff', '--name-only', '-z', '--no-renames', `${event.base}...${event.head}`], { cwd: root }))

  // Main's locks: this checkout is main's commit.
  const locked = lockedFiles({ cwd: root })
  const specs = new Set(changed.map((file) => SPEC_FILE.exec(file)?.[1]).filter((spec) => spec !== undefined))
  const changes: LockedChange[] = changed
    .map((file) => ({ file, spec: LOCK_FILE.exec(file)?.[1] ?? locked.get(file) }))
    .filter((change): change is LockedChange => change.spec !== undefined && !specs.has(change.spec))

  const blocks = [...(changes.length > 0 ? [k8(changes)] : []), ...staleLocks(root, event.head)]
  if (blocks.length > 0) {
    console.log(blocks.flat().join('\n'))
    return 1
  }
  console.log(`✓ lock  ${changed.length} changed ${changed.length === 1 ? 'file' : 'files'} checked against main's locks`)
  return 0
}

try {
  process.exitCode = main()
} catch {
  console.log(
    ["✖ lock  the check couldn't run", '  The job fails until it can, so nothing slips through.', '  Fix: re-run the job. If it fails again, open its log for the step that failed.'].join('\n'),
  )
  process.exitCode = 1
}
