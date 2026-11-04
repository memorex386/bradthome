import { describe, expect, test } from 'vitest'
import { type ScratchRepo, textWithLineAt } from '../../001/helpers/repo.ts'
import { describeRun, type RunResult } from '../../001/helpers/run.ts'
import { setEnv } from '../../001/helpers/sandbox.ts'
import { expectNoTerm } from '../../001/helpers/terms.ts'
import { ciRepos, commitFiles, pullRequestEnv, runCi, withTerms } from '../helpers/ci-repo.ts'
import { CI } from '../helpers/paths.ts'

// The privacy and commits scripts' two modes (S2.6, FR-003, FR-005, FR-010,
// FR-022, D115). pr-text.yml's text check runs them with PR_TEXT=only, on the
// pull request's title and description alone. ci.yml runs them with
// PR_TEXT=skip, on the commits and the branch name alone, so an edit to the
// text never needs ci to run again.

const scratch = ciRepos()

function run(repo: ScratchRepo, script: string, mode: string, pr: { title: string; body?: string | null }, terms = true): RunResult {
  const base = pullRequestEnv(repo, pr)
  const env = terms ? withTerms(base) : base
  setEnv(env, 'PR_TEXT', mode)
  return runCi(repo, script, env)
}

describe('the text check: PR_TEXT=only', () => {
  test('S2.6 FR-022 FR-005 privacy fails on a term in the title or description, naming the place, never the term', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Ordinary words only.\n' })
    const title = run(repo, CI.privacy, 'only', { title: 'docs(002): notes from Quixmoor', body: 'Notes.' })
    expect(title.status, describeRun(title)).not.toBe(0)
    expect(title.stdout).toMatch(/the pull request's title/)
    expectNoTerm(title)
    const body = run(repo, CI.privacy, 'only', { title: 'docs(002): add notes', body: 'Why:\n\nThe zorblax notes.\n' })
    expect(body.status, describeRun(body)).not.toBe(0)
    expect(body.stdout).toMatch(/the pull request's description, line 3/)
    expectNoTerm(body)
  })

  test("S2.6 FR-022 privacy reads only the text, so a term in a commit isn't the text check's to report", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': textWithLineAt(2, 'Zorblax again.') })
    const result = run(repo, CI.privacy, 'only', { title: 'docs(002): add notes', body: 'Notes.' })
    expect(result.status, describeRun(result)).toBe(0)
    expect(result.stdout).toMatch(/^✓ privacy {2}the title and the description checked$/m)
  })

  test('S2.6 FR-022 FR-010 commits fails on a title that breaks the rules, and passes once the title is fixed, with the Refs line from the description', () => {
    const repo = scratch()
    commitFiles(repo, 'update hooks', { 'docs/notes.md': 'Notes.\n' })
    const bad = run(repo, CI.commits, 'only', { title: 'Update hooks', body: 'What and why.' }, false)
    expect(bad.status, describeRun(bad)).not.toBe(0)
    expect(bad.stdout).toMatch(/^✖ commits {2}the title fails the message rules$/m)
    const fixed = run(repo, CI.commits, 'only', { title: 'docs(release): record the release', body: 'What and why.\n\nRefs: #29\n' }, false)
    expect(fixed.status, describeRun(fixed)).toBe(0)
    expect(fixed.stdout).toMatch(/^✓ commits {2}the title follows the message rules$/m)
  })
})

describe('ci.yml: PR_TEXT=skip', () => {
  test('S2.1 FR-005 FR-003 privacy skips the title and description, and still checks the commits', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Ordinary words only.\n' })
    const clean = run(repo, CI.privacy, 'skip', { title: 'docs(002): notes from Quixmoor', body: 'The zorblax notes.' })
    expect(clean.status, describeRun(clean)).toBe(0)
    expect(clean.stdout).toMatch(/^✓ privacy {2}1 commit and the branch name checked$/m)
    commitFiles(repo, 'docs(002): more notes', { 'docs/more.md': textWithLineAt(2, 'Zorblax again.') })
    const leak = run(repo, CI.privacy, 'skip', { title: 'docs(002): add notes' })
    expect(leak.status, describeRun(leak)).not.toBe(0)
    expectNoTerm(leak)
  })

  test('S3.1 FR-010 FR-003 commits skips the title, and still checks every commit', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    const clean = run(repo, CI.commits, 'skip', { title: 'Update hooks', body: 'What and why.' }, false)
    expect(clean.status, describeRun(clean)).toBe(0)
    expect(clean.stdout).toMatch(/^✓ commits {2}1 commit follows the message rules$/m)
    commitFiles(repo, 'update hooks', { 'docs/more.md': 'More.\n' })
    const bad = run(repo, CI.commits, 'skip', { title: 'docs(002): add notes' }, false)
    expect(bad.status, describeRun(bad)).not.toBe(0)
    expect(bad.stdout).toMatch(/^✖ commits {2}1 of 2 commits fails the message rules$/m)
  })

  test("S2.6 FR-022 a PR_TEXT value the scripts don't know fails them, and never reads as a pass", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    for (const script of [CI.privacy, CI.commits]) {
      const result = run(repo, script, 'sometimes', { title: 'docs(002): add notes' })
      expect(result.status, describeRun(result)).not.toBe(0)
      expect(result.stdout).not.toMatch(/^✓ /m)
    }
  })
})
