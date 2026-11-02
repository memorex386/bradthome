import { describe, expect, test } from 'vitest'
import { expectInOrder, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import { describeRun, filledLines, type RunResult } from '../../001/helpers/run.ts'
import { ciRepos, commitFiles, DEPENDABOT, DEPENDABOT_LOGIN, pullRequestEnv, runCi, short } from '../helpers/ci-repo.ts'
import { K7_FIX, K7_SPEC_OR_ISSUE, K7_TYPE_EMPTY, PASS } from '../helpers/messages.ts'
import { CI } from '../helpers/paths.ts'

// The commits job's script: the pull request's title, with its Refs: #N line
// when the description has one, and every commit, linted with the repo's
// commitlint config (S3.1). Dependabot's commits and titles skip the
// spec-or-issue rule only (S3.2).

const scratch = ciRepos()

let files = 0
function change(): Record<string, string> {
  files += 1
  return { [`docs/change-${files}.md`]: `Change ${files}.\n` }
}

/** The lines of a commit's or the title's report: from its line to the next one at the same indent. */
function reportFor(result: RunResult, line: string): string[] {
  const lines = filledLines(result.stdout)
  const start = lines.indexOf(line)
  expect(start, `${line}\n${result.stdout}`).toBeGreaterThanOrEqual(0)
  const end = lines.findIndex((candidate, index) => index > start && /^ {2}\S/.test(candidate))
  return lines.slice(start + 1, end < 0 ? undefined : end)
}

describe('K7: a message that breaks the rules', () => {
  test("S3.1 FR-010 FR-020 K7 reports the title and each failing commit with commitlint's words, in the mock's shape", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', change())
    commitFiles(repo, 'feat(002): add the gate', change())
    const bad = commitFiles(repo, 'update hooks', change())
    commitFiles(repo, 'fix(002): tidy the gate', change())
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'Update hooks', body: 'What and why.' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [
      '✖ commits  the title and 1 of 4 commits fail the message rules',
      '  title    Update hooks',
      K7_TYPE_EMPTY,
      `  ${short(bad)}  update hooks`,
      K7_TYPE_EMPTY,
      K7_SPEC_OR_ISSUE,
      K7_FIX,
    ])
    expect(reportFor(result, `  ${short(bad)}  update hooks`)).toContain(K7_SPEC_OR_ISSUE)
  })

  test('S3.1 FR-010 K7 a commit that names no spec or issue fails the spec-or-issue rule', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', change())
    const bad = commitFiles(repo, 'docs(repo): tidy the notes', change())
    commitFiles(repo, 'docs(002): more notes', change())
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'docs(002): add notes' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, /^✖ commits {2}1 of 3 commits? fails? the message rules$/), result.stdout).toBeGreaterThanOrEqual(0)
    expect(reportFor(result, `  ${short(bad)}  docs(repo): tidy the notes`)).toEqual([K7_SPEC_OR_ISSUE])
    expect(findLine(result.stdout, /^ {2}title {4}/)).toBe(-1)
  })

  test('S3.1 FR-010 K7 a title that names no spec, with no Refs: #N line in the description, fails', () => {
    const repo = scratch()
    commitFiles(repo, 'fix(repo): tidy the hooks\n\nRefs: #12\n', change())
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'fix(repo): tidy the hooks', body: 'Tidies the hooks.' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, /^✖ commits {2}the title fails the message rules$/), result.stdout).toBeGreaterThanOrEqual(0)
    expect(reportFor(result, '  title    fix(repo): tidy the hooks')).toEqual([K7_SPEC_OR_ISSUE])
  })
})

describe('messages that follow the rules', () => {
  test('S3.1 FR-010 passes in one line when the title and every commit follow the rules', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', change())
    commitFiles(repo, 'feat(002): add the gate\n\nA body line.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n', change())
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'feat(002): add the gate', body: 'What and why.' }))
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.commits)
    expect(filledLines(result.stdout)).toHaveLength(1)
  })

  test("S3.1 FR-010 a light change's title passes with the Refs: #N line from its description", () => {
    const repo = scratch()
    commitFiles(repo, 'fix(repo): tidy the hooks\n\nRefs: #12\n', change())
    const body = '## What and why\n\nTidies the hooks. This line is long enough that commitlint would reject it as a body line, which is why the description is not linted.\n\nRefs: #12\n'
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'fix(repo): tidy the hooks', body }))
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.commits)
  })
})

describe("D1: Dependabot's commits and titles", () => {
  const title = 'build(deps-dev): bump the dev-dependencies group with 3 updates'

  function dependabotRepo() {
    return scratch({ branch: 'dependabot/npm_and_yarn/dev-dependencies-1a2b3c4d5e' })
  }

  test("S3.2 FR-010 D1 Dependabot's commits and title skip the spec-or-issue rule", () => {
    const repo = dependabotRepo()
    commitFiles(repo, `${title}\n\nBumps the dev-dependencies group with 3 updates.\n`, change(), { author: DEPENDABOT, committer: DEPENDABOT })
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title, user: DEPENDABOT_LOGIN, body: 'Bumps the group.' }))
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.commits)
  })

  test("S3.2 FR-010 D1 the same message from anyone else still needs a spec or issue", () => {
    const repo = dependabotRepo()
    const sha = commitFiles(repo, title, change())
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title, user: 'test-agent' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(reportFor(result, `  ${short(sha)}  ${title}`)).toEqual([K7_SPEC_OR_ISSUE])
    expect(reportFor(result, `  title    ${title}`)).toEqual([K7_SPEC_OR_ISSUE])
  })

  test("S3.2 FR-010 D1 Dependabot's commits still follow the format rules", () => {
    const repo = dependabotRepo()
    const sha = commitFiles(repo, 'bump the group', change(), { author: DEPENDABOT, committer: DEPENDABOT })
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'bump the group', user: DEPENDABOT_LOGIN }))
    expect(result.status, describeRun(result)).not.toBe(0)
    const commit = reportFor(result, `  ${short(sha)}  bump the group`)
    expect(commit).toContain(K7_TYPE_EMPTY)
    expect(commit).not.toContain(K7_SPEC_OR_ISSUE)
    const titleReport = reportFor(result, '  title    bump the group')
    expect(titleReport).toContain(K7_TYPE_EMPTY)
    expect(titleReport).not.toContain(K7_SPEC_OR_ISSUE)
  })
})
