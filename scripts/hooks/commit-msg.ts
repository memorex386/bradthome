import { existsSync, readFileSync } from 'node:fs'
import * as nodeModule from 'node:module'
import path from 'node:path'
import { loadLinter } from '../commitlint.ts'
import { isAllowedTrailer, maskAddress, trailerAddresses } from '../lib/addresses.ts'
import { COMMITLINT_MISSING, crashed, g8, g9, passCommitMsg, s3 } from '../lib/messages.ts'
import { print, seconds, shown } from '../lib/output.ts'
import { loadTermsAsync, termLines } from '../lib/terms.ts'

// commit-msg: the message's format, private terms and trailer addresses
// (FR-006, FR-008, FR-010, FR-016). Merge commits that git writes skip only the
// format rule. commitlint starts loading first, since it's the slowest part
// and the hooks have a time budget (SC-003).

const start = performance.now()
// Node keeps compiled code for commitlint's many modules between runs.
nodeModule.enableCompileCache?.()

const SCISSORS = /^# -+ >8 -+$/
const ADDRESS_HIDDEN = '(an address that holds a private term, not shown)'

/** Where git left the draft, as the person committing would find it: .git/COMMIT_EDITMSG. */
function draftName(file: string, root: string): string {
  const relative = path.relative(root, path.resolve(file)).replaceAll('\\', '/')
  return relative.startsWith('..') || path.isAbsolute(relative) ? `.git/${path.basename(file)}` : relative
}

async function main(): Promise<number> {
  const file = process.argv[2]
  if (file === undefined) throw new Error('commit-msg needs the message file')
  // git runs hooks from the root of the working tree, and leaves MERGE_HEAD
  // beside the message file while it makes a merge commit.
  const root = process.cwd()
  const merging = existsSync(path.join(path.dirname(path.resolve(file)), 'MERGE_HEAD'))
  const linter = merging ? undefined : loadLinter()
  // A config that fails to load is reported where the linter is awaited.
  linter?.catch(() => {})

  const loaded = await loadTermsAsync(process.env, root)
  if ('problem' in loaded) {
    print(s3('commit-msg', loaded.problem, loaded.source), undefined)
    return 1
  }
  const terms = loaded.terms

  // Everything below the scissors line is the diff that git commit -v shows,
  // which pre-commit has already checked.
  const all = readFileSync(file, 'utf8').split(/\r?\n/)
  const scissors = all.findIndex((line) => SCISSORS.test(line))
  const lines = scissors < 0 ? all : all.slice(0, scissors)

  const lint = await linter
  if (!merging && lint === undefined) {
    print(COMMITLINT_MISSING, terms)
    return 1
  }
  const report = lint === undefined ? [] : (await lint(`${lines.filter((line) => !line.startsWith('#')).join('\n').trimEnd()}\n`)).report

  const blocks: string[][] = []
  if (report.length > 0) blocks.push(report)
  const termsAt = termLines(lines.join('\n'), terms)
  if (termsAt.length > 0) blocks.push(g8(termsAt, draftName(file, root)))
  const trailers = trailerAddresses(lines)
    .filter((trailer) => !isAllowedTrailer(trailer.address))
    .map((trailer) => `line ${trailer.line}  ${trailer.key}: ${shown(maskAddress(trailer.address), terms, ADDRESS_HIDDEN)}`)
  if (trailers.length > 0) blocks.push(g9(trailers))
  if (blocks.length > 0) {
    print(blocks.flat(), terms)
    return 1
  }
  print([passCommitMsg(seconds(start))], terms)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  print(crashed('commit-msg'), undefined)
  process.exitCode = 1
}
