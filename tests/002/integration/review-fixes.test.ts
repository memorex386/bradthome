import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { findLine } from '../../001/helpers/messages.ts'
import { createRepo, type ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, runMerged, type RunResult } from '../../001/helpers/run.ts'
import type { Sandbox } from '../../001/helpers/sandbox.ts'
import { ciRepos, commitFiles, createCiSandbox, DEPENDABOT, DEPENDABOT_LOGIN, pullRequestEnv, runCi, withTerms } from '../helpers/ci-repo.ts'
import { installFakeGh, ok, type Scenario } from '../helpers/fake-gh.ts'
import { PASS, R2_HEADER } from '../helpers/messages.ts'
import { CI, GITHUB, REPO_REMOTE, REPO_SLUG, SCRIPTS } from '../helpers/paths.ts'

// What slice 1.4's review found and fixed: merge commits in the commits job,
// who gets Dependabot's exemptions, and the empty defaults GitHub's live
// ruleset can list.

const scratch = ciRepos()

describe('merge commits', () => {
  test('S3.1 FR-010 a merge commit that git writes passes the commits job, as it passes the commit-msg hook', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    const branch = repo.gitOk(['branch', '--show-current'])
    repo.gitOk(['switch', '--quiet', '--create', 'side', 'origin/main'])
    commitFiles(repo, 'docs(002): add more notes', { 'docs/more.md': 'More notes.\n' })
    repo.gitOk(['switch', '--quiet', branch])
    repo.gitOk(['merge', '--quiet', '--no-ff', '--no-edit', 'side'])
    expect(repo.gitOk(['log', '-1', '--format=%P']).split(' ')).toHaveLength(2)
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'docs(002): add notes' }))
    expect(result.status, describeRun(result)).toBe(0)
    expect(result.stdout).toMatch(PASS.commits)
  })
})

describe("Dependabot's exemptions need Dependabot's pull request", () => {
  const title = 'build(deps-dev): Bump the dev-dependencies group with 3 updates'

  test("S3.2 FR-010 D1 a commit with Dependabot's address on a pull request someone else opened gets no exemption", () => {
    const repo = scratch()
    commitFiles(repo, title, { 'docs/notes.md': 'Notes.\n' }, { author: DEPENDABOT, committer: DEPENDABOT })
    const result = runCi(repo, CI.commits, pullRequestEnv(repo, { title: 'build(002): bump the dev dependencies', user: 'test-agent' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(result.stdout).toMatch(/\[subject-case\]/)
  })

  test("S2.5 FR-006 D1 Dependabot's sign-off passes only on a pull request Dependabot opened", () => {
    const message = `${title}\n\nBumps the group.\n\nSigned-off-by: dependabot[bot] <support@github.com>\n`
    const theirs = scratch()
    commitFiles(theirs, message, { 'docs/notes.md': 'Notes.\n' }, { author: DEPENDABOT, committer: DEPENDABOT })
    const passed = runCi(theirs, CI.privacy, withTerms(pullRequestEnv(theirs, { title, user: DEPENDABOT_LOGIN })))
    expect(passed.status, describeRun(passed)).toBe(0)

    const someone = scratch()
    commitFiles(someone, message, { 'docs/notes.md': 'Notes.\n' }, { author: DEPENDABOT, committer: DEPENDABOT })
    const failed = runCi(someone, CI.privacy, withTerms(pullRequestEnv(someone, { title: 'build(002): bump the group', user: 'test-agent' })))
    expect(failed.status, describeRun(failed)).not.toBe(0)
    expect(findLine(failed.stdout, /^ {2}\S+ {2}trailer {3}/), failed.stdout).toBeGreaterThanOrEqual(0)
    expect(failed.stdout).not.toContain('support@github.com')
  })
})

describe("the live ruleset's empty defaults", () => {
  const sandboxes: Sandbox[] = []
  afterEach(() => {
    for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
  })

  interface Ruleset {
    rules?: { type: string; parameters?: Record<string, unknown> }[]
    [key: string]: unknown
  }

  function checkout(): ScratchRepo {
    const sandbox = createCiSandbox({ terms: false })
    sandboxes.push(sandbox)
    const seed = {
      '.github/rulesets/main.json': readFileSync(GITHUB.ruleset, 'utf8'),
      '.github/CODEOWNERS': readFileSync(GITHUB.codeowners, 'utf8'),
    }
    const repo = createRepo(sandbox, { seed, branch: false, hooks: false })
    repo.gitOk(['remote', 'set-url', 'origin', REPO_REMOTE])
    return repo
  }

  function served(ruleset: Ruleset): Scenario {
    const id = 4242
    return {
      routes: {
        [`repos/${REPO_SLUG}/rulesets`]: ok([{ id, name: ruleset.name, target: ruleset.target }]),
        [`repos/${REPO_SLUG}/rulesets/${id}`]: ok({ id, ...ruleset }),
      },
    }
  }

  function withPullRequestParameters(extra: Record<string, unknown>): Ruleset {
    const ruleset = JSON.parse(readFileSync(GITHUB.ruleset, 'utf8')) as Ruleset
    const pullRequest = ruleset.rules?.find((rule) => rule.type === 'pull_request')
    if (pullRequest === undefined) throw new Error('the file has no pull_request rule')
    pullRequest.parameters = { ...pullRequest.parameters, ...extra }
    return ruleset
  }

  function check(live: Ruleset): RunResult {
    const repo = checkout()
    const gh = installFakeGh(repo.sandbox, served(live))
    return runMerged(process.execPath, [SCRIPTS.rulesetCheck], { cwd: repo.dir, env: gh.env, scratch: repo.sandbox.root })
  }

  test('S5.3 SC-005 FR-018 parameters GitHub lists at their empty defaults, which the file leaves out, still match', () => {
    const result = check(withPullRequestParameters({ automatic_copilot_code_review_enabled: false, required_reviewers: [] }))
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, /^✓ live ruleset\b/), result.stdout).toBeGreaterThanOrEqual(0)
  })

  test('S5.3 FR-018 R2 a parameter the file leaves out, set on the live ruleset, is a difference', () => {
    const result = check(withPullRequestParameters({ automatic_copilot_code_review_enabled: true }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, R2_HEADER), result.stdout).toBeGreaterThan(0)
    expect(result.stdout).toMatch(/automatic_copilot_code_review_enabled/)
  })
})
