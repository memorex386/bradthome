import { stagedCopyProblems } from '../lib/copies.ts'
import { git, runGit, splitZ, topLevel } from '../lib/git.ts'
import { ciCrashed, k10 } from '../lib/messages.ts'
import { print } from '../lib/output.ts'
import { diffRange, readEvent } from './lib/event.ts'
import { termsFromSecret } from './lib/terms.ts'

// The hygiene job (FR-013, S3.5): text files stored with CRLF line endings,
// whitespace errors in the pull request's or push's changes, and skill copies
// or template overrides that don't match their sources. The checkout's index
// is the commit being checked. A path that holds a private term is hidden
// (D87).

/** Files the index stores with CRLF endings, from git ls-files --eol. */
function crlfFiles(root: string): string[] {
  const problems: string[] = []
  for (const entry of splitZ(git(['ls-files', '--eol', '-z'], { cwd: root }))) {
    const tab = entry.indexOf('\t')
    const index = entry.slice(0, tab).split(/\s+/)[0] ?? ''
    if (index === 'i/crlf' || index === 'i/mixed') problems.push(entry.slice(tab + 1))
  }
  return problems
}

/**
 * git diff --check's findings, as file:line  what. A CR before a line's end
 * is the CRLF check's to report, so it isn't counted again as whitespace.
 */
function whitespaceErrors(root: string, range: string): string[] {
  const result = runGit(['-c', 'core.quotePath=false', '-c', 'core.whitespace=cr-at-eol', 'diff', '--check', '--no-color', range], {
    cwd: root,
  })
  if (result.status === null || result.status > 2) throw new Error(`git diff --check failed with exit ${result.status}`)
  const problems: string[] = []
  for (const line of result.stdout.split('\n')) {
    const found = /^(.+?):(\d+): (.+?)\.?$/.exec(line)
    if (found !== null && !line.startsWith('+') && !line.startsWith('-')) problems.push(`${found[1]}:${found[2]}  ${found[3]}`)
  }
  return problems
}

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const terms = termsFromSecret()
  const range = diffRange(readEvent())
  const crlf = crlfFiles(root)
  const width = Math.max(0, ...crlf.map((file) => file.length))
  const problems = [
    ...crlf.map((file) => `${file.padEnd(width)}  CRLF line endings`),
    ...whitespaceErrors(root, range),
    ...stagedCopyProblems({ cwd: root }).map((problem) =>
      problem.source === undefined ? `${problem.copy} has no source in .agents/skills` : `${problem.copy} doesn't match ${problem.source}`,
    ),
  ]
  if (problems.length > 0) {
    print(k10(problems), terms, process.stdout)
    return 1
  }
  print(['✓ hygiene  line endings, whitespace and copies in order'], terms, process.stdout)
  return 0
}

try {
  process.exitCode = main()
} catch {
  console.log(ciCrashed('hygiene').join('\n'))
  process.exitCode = 1
}
