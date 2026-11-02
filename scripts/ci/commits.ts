import * as nodeModule from 'node:module'
import { loadLinter } from '../commitlint.ts'
import { readCommits } from '../lib/commits.ts'
import { topLevel } from '../lib/git.ts'
import { ciCrashed, type FailingMessage, k7 } from '../lib/messages.ts'
import { commitRange, readEvent } from './lib/event.ts'

// The commits job (FR-010, S3.1, S3.2): the pull request's title, which
// becomes the squash commit on main, and every commit, linted with the repo's
// commitlint config. The title is linted with the Refs: #N line from the
// description when it has one, and not with the whole description, whose long
// lines commitlint's body rules would reject. Dependabot's commits and titles
// skip the spec-or-issue, subject-case and header-length rules only (D84):
// Dependabot writes "Bump" with a capital, and its group titles run long.

nodeModule.enableCompileCache?.()

const DEPENDABOT_LOGIN = 'dependabot[bot]'
const DEPENDABOT_EMAIL = '49699333+dependabot[bot]@users.noreply.github.com'
const DEPENDABOT_SKIPS = ['spec-or-issue', 'subject-case', 'header-max-length']
const REFS_LINE = /^Refs: #\d+$/m

async function main(): Promise<number> {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const event = readEvent()
  const lint = await loadLinter()
  if (lint === undefined) {
    console.log(
      ['✖ commits  commitlint not installed', '  The message rules can\'t be checked, so the job fails.', '  Fix: check the job runs pnpm install --frozen-lockfile first.'].join('\n'),
    )
    return 1
  }

  const failing: FailingMessage[] = []
  const errorsOf = (problems: readonly { level: number; name: string; message: string }[]): string[] =>
    problems.filter((problem) => problem.level >= 2).map((problem) => `✖ ${problem.message} [${problem.name}]`)

  let titleFails = false
  const pr = event.pullRequest
  if (pr !== undefined) {
    const refs = REFS_LINE.exec(pr.body.replaceAll('\r', ''))?.[0]
    const message = `${pr.title}\n${refs === undefined ? '' : `\n${refs}\n`}`
    const without = pr.user === DEPENDABOT_LOGIN ? DEPENDABOT_SKIPS : []
    const result = await lint(message, { without })
    if (!result.valid) {
      titleFails = true
      failing.push({ label: 'title', subject: pr.title, problems: errorsOf(result.problems) })
    }
  }

  const commits = readCommits(commitRange(event), root).reverse()
  let commitsFailing = 0
  for (const commit of commits) {
    const byDependabot = commit.authorEmail.toLowerCase() === DEPENDABOT_EMAIL
    const result = await lint(`${commit.message.trimEnd()}\n`, { without: byDependabot ? DEPENDABOT_SKIPS : [] })
    if (result.valid) continue
    commitsFailing += 1
    failing.push({ label: commit.short, subject: commit.message.split(/\r?\n/)[0] ?? '', problems: errorsOf(result.problems) })
  }

  if (failing.length > 0) {
    console.log(k7(failing, titleFails, commitsFailing, commits.length).join('\n'))
    return 1
  }
  const what = pr === undefined ? '' : 'the title and '
  console.log(`✓ commits  ${what}${commits.length} ${commits.length === 1 ? 'commit' : 'commits'} follow the message rules`)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  console.log(ciCrashed('commits').join('\n'))
  process.exitCode = 1
}
