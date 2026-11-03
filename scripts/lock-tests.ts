import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { git, splitZ, topLevel } from './lib/git.ts'

// pnpm lock <spec-dir> [--check]: writes a spec's tests.lock, or checks it
// (FR-012, D78). The lock lists every file in the spec's test folder,
// tests/NNN/, as `<sha256>  <path>` lines in byte order with LF endings, the
// format `sha256sum --check` reads. The same files always give the same lock.

const LOCK_LINE = /^([0-9a-f]{64}) {2}(.+)$/

function byteOrder(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b))
}

/** The files git sees in the folder, tracked or new and not ignored. */
function testFiles(root: string, folder: string): string[] {
  const listed = splitZ(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', folder], { cwd: root }))
  return [...new Set(listed)]
    .filter((file) => {
      try {
        return statSync(path.join(root, file)).isFile()
      } catch {
        return false
      }
    })
    .sort(byteOrder)
}

function lockText(root: string, files: readonly string[]): string {
  return files
    .map(
      (file) =>
        `${createHash('sha256')
          .update(readFileSync(path.join(root, file)))
          .digest('hex')}  ${file}\n`,
    )
    .join('')
}

function readLock(text: string): Map<string, string> {
  const entries = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = LOCK_LINE.exec(line)
    if (match !== null) entries.set(match[2] ?? '', match[1] ?? '')
  }
  return entries
}

function main(): number {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const specArg = args.find((arg) => !arg.startsWith('--'))
  if (specArg === undefined) {
    console.error('Usage: pnpm lock <spec-dir> [--check], as in pnpm lock specs/001-hooks-and-agent-rules')
    return 2
  }
  const root = topLevel(process.cwd()) ?? process.cwd()
  const spec = path.relative(root, path.resolve(specArg)).replaceAll('\\', '/')
  const number = /^(\d{3})-/.exec(path.basename(spec))?.[1]
  if (number === undefined) {
    console.error(`✖ lock  ${spec} isn't a spec folder: its name starts with a three-digit number, as in specs/001-name`)
    return 2
  }
  const folder = `tests/${number}`
  const lockFile = path.join(root, spec, 'tests.lock')
  const files = testFiles(root, folder)
  const text = lockText(root, files)

  if (!check) {
    writeFileSync(lockFile, text)
    console.log(`✓ lock  wrote ${spec}/tests.lock: ${files.length} files in ${folder}/`)
    return 0
  }

  const current = existsSync(lockFile) ? readFileSync(lockFile, 'utf8') : ''
  const locked = readLock(current)
  const now = readLock(text)
  const lines: string[] = []
  for (const [file, hash] of now) {
    if (!locked.has(file)) lines.push(`  new      ${file}`)
    else if (locked.get(file) !== hash) lines.push(`  changed  ${file}`)
  }
  for (const file of locked.keys()) if (!now.has(file)) lines.push(`  missing  ${file}`)
  if (lines.length === 0 && current === text) {
    console.log(`✓ lock  ${spec}/tests.lock matches its ${files.length} files`)
    return 0
  }
  console.error(
    [
      `✖ lock  ${spec}/tests.lock doesn't match ${folder}/`,
      ...(lines.length > 0 ? lines : ['  The files match, but the lock is out of order or has a stray line.']),
      '  A locked test changes only with its spec, and Brad approves both.',
      `  Fix: undo the change, or, once Brad approves it, run pnpm lock ${spec} and change its spec.`,
    ].join('\n'),
  )
  return 1
}

process.exitCode = main()
