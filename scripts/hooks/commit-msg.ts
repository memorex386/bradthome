import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { isAllowedTrailer, maskAddress, trailerAddresses } from '../lib/addresses.ts'
import { runGit, topLevel } from '../lib/git.ts'
import { COMMITLINT_MISSING, crashed, g8, g9, passCommitMsg, s3 } from '../lib/messages.ts'
import { print, seconds, shown } from '../lib/output.ts'
import { loadTerms, termLines } from '../lib/terms.ts'

// commit-msg: the message's format, private terms and trailer addresses
// (FR-006, FR-008, FR-010, FR-016). Merge commits that git writes skip only the
// format rule.

const start = performance.now()

// The repo this script lives in. Its commitlint config and packages check the
// message, whichever repo is committing.
const HOME = path.resolve(import.meta.dirname, '..', '..')
const SCISSORS = /^# -+ >8 -+$/
const ADDRESS_HIDDEN = '(an address that holds a private term, not shown)'

/** commitlint's report for a message that breaks the format, nothing for one that follows it. */
async function formatReport(message: string): Promise<string[] | 'missing'> {
  let modules
  try {
    modules = await Promise.all([import('@commitlint/load'), import('@commitlint/lint'), import('@commitlint/format')])
  } catch {
    return 'missing'
  }
  const [{ default: load }, { default: lint }, { default: format }] = modules
  const config = await load({}, { cwd: HOME })
  const result = await lint(message, config.rules, {
    parserOpts: config.parserPreset?.parserOpts as NonNullable<Parameters<typeof lint>[2]>['parserOpts'],
    plugins: config.plugins,
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores,
    helpUrl: config.helpUrl,
  })
  if (result.valid) return []
  return format({ results: [result] }, { color: false, helpUrl: config.helpUrl, legacyOutput: true }).split('\n')
}

/** Where git left the draft, as the person committing would find it: .git/COMMIT_EDITMSG. */
function draftName(file: string, root: string): string {
  const relative = path.relative(root, path.resolve(file)).replaceAll('\\', '/')
  return relative.startsWith('..') || path.isAbsolute(relative) ? `.git/${path.basename(file)}` : relative
}

async function main(): Promise<number> {
  const file = process.argv[2]
  if (file === undefined) throw new Error('commit-msg needs the message file')
  const root = topLevel(process.cwd()) ?? process.cwd()
  const loaded = loadTerms(process.env, root)
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

  const mergeHead = runGit(['rev-parse', '--git-path', 'MERGE_HEAD'], { cwd: root }).stdout.trim()
  const merging = mergeHead !== '' && existsSync(path.resolve(root, mergeHead))
  const message = `${lines.filter((line) => !line.startsWith('#')).join('\n').trimEnd()}\n`
  const report = merging ? [] : await formatReport(message)
  if (report === 'missing') {
    print(COMMITLINT_MISSING, terms)
    return 1
  }

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
