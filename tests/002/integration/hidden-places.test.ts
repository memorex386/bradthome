import { createHash } from 'node:crypto'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { findLine } from '../../001/helpers/messages.ts'
import type { ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, type RunResult } from '../../001/helpers/run.ts'
import { LOCKED_TEST, lockedSeed } from '../../001/helpers/seeds.ts'
import { expectNoTerm } from '../../001/helpers/terms.ts'
import { ciRepos, commitFiles, pullRequestEnv, runCi, withTerms } from '../helpers/ci-repo.ts'
import { CI } from '../helpers/paths.ts'

// The commits, secrets, hygiene and lock jobs print text from the pull
// request: subjects, the title and paths. They get the list from the same
// secret as the privacy job, and print through the output gate, so a place
// that holds a term is hidden, as the hooks hide it (D87, SC-003). The terms
// here are spec 001's made-up ones.

const scratch = ciRepos()

const HIDDEN = /^\s*\(a line that holds a private term is hidden\)$/

const FAKE_TOKEN = ['ghp', createHash('sha256').update('bradthome spec 002 made-up token').digest('hex').slice(0, 36)].join('_')

function expectHidden(result: RunResult, header: RegExp): void {
  expect(result.status, describeRun(result)).not.toBe(0)
  expect(findLine(result.stdout, header), result.stdout).toBeGreaterThanOrEqual(0)
  expect(findLine(result.stdout, HIDDEN), result.stdout).toBeGreaterThanOrEqual(0)
  expectNoTerm(result)
}

describe('D87: a place that holds a private term is hidden', () => {
  test("S3.1 S2.1 FR-008 FR-010 SC-003 K7 the commits job hides a failing subject and title that hold a term", () => {
    const repo = scratch()
    commitFiles(repo, 'update the Zorblax notes', { 'docs/notes.md': 'Notes.\n' })
    const result = runCi(repo, CI.commits, withTerms(pullRequestEnv(repo, { title: 'Zorblax notes', body: 'What and why.' })))
    expectHidden(result, /^✖ commits {2}the title and 1 of 1 commits? fails? the message rules$/)
  })

  test('S2.3 S2.1 FR-008 FR-009 SC-003 K5 the secrets job hides the path of a finding that holds a term', () => {
    const repo = scratch()
    commitFiles(repo, 'feat(002): add the deploy script', { 'scripts/zorblax-deploy.ts': `const token = "${FAKE_TOKEN}"\n` })
    const result = runCi(repo, CI.secrets, withTerms(pullRequestEnv(repo, { title: 'feat(002): add the deploy script' })))
    expectHidden(result, /^✖ secrets/)
    expect(result.stdout).not.toContain(FAKE_TOKEN)
  })

  test('S3.5 S2.1 FR-008 FR-013 SC-003 K10 the hygiene job hides a path that holds a term', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/quixmoor.md': 'Line one.\r\nLine two.\r\n' })
    const result = runCi(repo, CI.hygiene, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expectHidden(result, /^✖ hygiene {2}1 problems?$/)
  })

  test("S3.3 S2.1 FR-008 FR-011 SC-003 K8 the lock job hides a path that holds a term", () => {
    const repo: ScratchRepo = scratch({ seed: lockedSeed() })
    const folder = path.posix.dirname(LOCKED_TEST)
    const head = commitFiles(repo, 'test(001): add a test', { [`${folder}/zorblax.test.ts`]: 'export const demo = 3\n' })
    repo.gitOk(['switch', '--quiet', '--detach', 'origin/main'])
    const env = pullRequestEnv(repo, { title: 'test(001): add a test', head, headRef: '002-demo', eventName: 'pull_request_target', action: 'opened' })
    expectHidden(runCi(repo, CI.lock, withTerms(env)), /^✖ lock/)
  })
})
