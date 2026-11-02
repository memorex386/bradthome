import { describe, expect, test } from 'vitest'
import { expectInOrder, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import type { ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, type RunResult } from '../../001/helpers/run.ts'
import { copiesSeed, SKILL_COPY, SKILL_SOURCE, SPEC_OVERRIDE, SPEC_TEMPLATE } from '../../001/helpers/seeds.ts'
import { ciRepos, commitFiles, pullRequestEnv, pushEnv, runCi } from '../helpers/ci-repo.ts'
import { K10_FIX, k10Copy, PASS } from '../helpers/messages.ts'
import { CI } from '../helpers/paths.ts'

// The hygiene job's script (S3.5): CRLF line endings in the index, whitespace
// errors in the pull request's changes, and skill copies or template overrides
// that don't match their sources. The scratch repos have core.autocrlf off, so
// a CRLF file is stored as it's written.

const scratch = ciRepos()

function repoWithCopies(): ScratchRepo {
  return scratch({ seed: copiesSeed() })
}

function hygiene(repo: ScratchRepo): RunResult {
  return runCi(repo, CI.hygiene, pullRequestEnv(repo, { title: 'docs(002): add notes' }))
}

const CRLF_LINE = /^ {2}docs\/notes\.md +CRLF line endings$/
const WHITESPACE_LINE = /^ {2}docs\/spaces\.md(?::\d+)?\b.*whitespace/i

describe('K10: line endings, whitespace or copies out of order', () => {
  test("S3.5 FR-013 K10 names each file with CRLF endings, a whitespace error or a drifted copy, in the mock's words", () => {
    const repo = repoWithCopies()
    commitFiles(repo, 'docs(002): add notes', {
      'docs/notes.md': 'Line one.\r\nLine two.\r\n',
      'docs/spaces.md': 'A clean line.\nA line with trailing spaces.   \n',
      [SKILL_COPY]: `${repo.read(SKILL_COPY)}An edit made to the copy.\n`,
    })
    const result = hygiene(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [/^✖ hygiene {2}3 problems$/, K10_FIX])
    expect(findLine(result.stdout, CRLF_LINE), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, WHITESPACE_LINE), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, k10Copy(SKILL_COPY, SKILL_SOURCE)), result.stdout).toBeGreaterThanOrEqual(0)
  })

  test('S3.5 FR-013 K10 CRLF endings alone fail the job', () => {
    const repo = repoWithCopies()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Line one.\r\nLine two.\r\n' })
    const result = hygiene(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [/^✖ hygiene {2}1 problems?$/, CRLF_LINE, K10_FIX])
  })

  test("S3.5 FR-013 K10 a whitespace error in the pull request's changes alone fails the job", () => {
    const repo = repoWithCopies()
    commitFiles(repo, 'docs(002): add notes', { 'docs/spaces.md': 'A clean line.\nA line with a tab before the end.\t\n' })
    const result = hygiene(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [/^✖ hygiene {2}1 problems?$/, WHITESPACE_LINE, K10_FIX])
  })

  test("S3.5 FR-013 K10 a template override that doesn't match its template alone fails the job", () => {
    const repo = repoWithCopies()
    commitFiles(repo, 'docs(002): change the spec template', { [SPEC_TEMPLATE]: '# Spec NNN: [Name]\n\nA new section.\n' })
    const result = hygiene(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [/^✖ hygiene {2}1 problems?$/, k10Copy(SPEC_OVERRIDE, SPEC_TEMPLATE), K10_FIX])
  })

  test("FR-001 FR-013 K10 a push to main checks the pushed changes the same way", () => {
    const repo = scratch({ seed: copiesSeed(), branch: false })
    const before = repo.gitOk(['rev-parse', 'origin/main'])
    const after = commitFiles(repo, 'docs(002): add notes (#6)', { 'docs/spaces.md': 'A line with trailing spaces.   \n' })
    const result = runCi(repo, CI.hygiene, pushEnv(repo, { before, after }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectInOrder(result.stdout, [/^✖ hygiene {2}1 problems?$/, WHITESPACE_LINE, K10_FIX])
  })

  test('S3.5 FR-013 passes in one line when line endings, whitespace and copies are in order', () => {
    const repo = repoWithCopies()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Line one.\nLine two.\n' })
    const result = hygiene(repo)
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.hygiene)
  })
})
