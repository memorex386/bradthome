import { cpSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { slash } from '../../001/helpers/paths.ts'
import { createRepo, type ScratchRepo, writeFile } from '../../001/helpers/repo.ts'
import { describeRun, filledLines, runMerged, runNode, type RunResult } from '../../001/helpers/run.ts'
import { type Sandbox, withoutOnPath, writeDefaultGhLogin, writeGhLogin } from '../../001/helpers/sandbox.ts'
import { copiesSeed } from '../../001/helpers/seeds.ts'
import { expectNoTerm, MADE_UP_TERM_COUNT } from '../../001/helpers/terms.ts'
import { createCiSandbox } from '../helpers/ci-repo.ts'
import { endpointsRead, installFakeGh, ok, type Scenario } from '../helpers/fake-gh.ts'
import { S1_REPO } from '../helpers/messages.ts'
import { REPO_REMOTE, REPO_SLUG, repoPath, SCRIPTS } from '../helpers/paths.ts'

// The setup check's repo-settings line (S6.1, S1), run as
// `node scripts/setup-check.ts` in a scratch checkout of the repo on an
// isolated machine, set up the way spec 001's setup-check tests set one up.
// The checkout's origin is the repo on GitHub, which is when the line appears,
// and a fake gh replays the repo's settings. Nothing reaches GitHub.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

interface Machine {
  sandbox: Sandbox
  repo: ScratchRepo
  check(env: NodeJS.ProcessEnv): RunResult
}

/** A machine that's set up: hooks on, the made-up list, gh here as the working login, and the guard installed. */
function machine(): Machine {
  const sandbox = createCiSandbox()
  sandboxes.push(sandbox)
  const repo = createRepo(sandbox, { seed: copiesSeed(), hooks: false })
  cpSync(repoPath('.claude', 'hooks'), path.join(repo.dir, '.claude', 'hooks'), { recursive: true })
  for (const hook of ['pre-commit', 'commit-msg', 'pre-push']) cpSync(repoPath('.husky', hook), path.join(repo.dir, '.husky', hook))
  for (const file of ['h', 'pre-commit', 'commit-msg', 'pre-push']) {
    writeFile(repo.dir, `.husky/_/${file}`, '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n')
  }
  writeFile(repo.dir, '.husky/_/.gitignore', '*\n')
  repo.gitOk(['config', 'core.hooksPath', '.husky/_'])
  writeDefaultGhLogin(sandbox, 'bradthome-agent')
  const workingDir = sandbox.path('working-gh')
  writeGhLogin(workingDir, 'memorex386')
  writeFile(repo.dir, '.claude/settings.local.json', `${JSON.stringify({ env: { GH_CONFIG_DIR: slash(workingDir) } }, null, 2)}\n`)
  const install = runNode(SCRIPTS.guardInstall, [], { cwd: sandbox.root, env: sandbox.env })
  if (install.status !== 0) throw new Error(`pnpm guard:install failed\n${describeRun(install)}`)
  repo.gitOk(['remote', 'set-url', 'origin', REPO_REMOTE])
  return {
    sandbox,
    repo,
    check: (env) => runMerged(process.execPath, [SCRIPTS.setupCheck], { cwd: repo.dir, env, scratch: sandbox.root }),
  }
}

/** The repo's settings as GitHub's API returns them, the way FR-019 wants them. */
const RIGHT = {
  full_name: REPO_SLUG,
  private: true,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  allow_auto_merge: true,
  delete_branch_on_merge: true,
  squash_merge_commit_title: 'PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
}

function settings(changes: Partial<Record<keyof typeof RIGHT, unknown>> = {}): Scenario {
  return { routes: { [`repos/${REPO_SLUG}`]: ok({ ...RIGHT, ...changes }) } }
}

const GITLEAKS_OK = /^✓ gitleaks \d+\.\d+\.\d+$/

/** The repo-settings problem: its ✖ line and the lines after it, up to the next check's line. */
function repoProblem(result: RunResult): string[] {
  const lines = filledLines(result.stdout)
  const at = lines.findIndex((line) => line.startsWith('✖ repo settings'))
  expect(at, result.stdout).toBeGreaterThanOrEqual(0)
  const next = lines.findIndex((line, index) => index > at && /^(?:[✓✖] |\d+ problems?\.$|Ready\.$)/.test(line))
  return lines.slice(at, next < 0 ? undefined : next)
}

describe('S1: the repo settings are checked', () => {
  test("S6.1 FR-019 S1 a repo set the way the agreement says passes, as the last line before Ready, in the mock's words", () => {
    const { sandbox, check } = machine()
    const gh = installFakeGh(sandbox, settings())
    const result = check(gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    const lines = filledLines(result.stdout)
    expect(lines).toHaveLength(8)
    expect(lines[0]).toBe('✓ git hooks are on')
    expect(lines[1]).toBe(`✓ private-term list found: ${MADE_UP_TERM_COUNT} terms`)
    expect(lines[2]).toMatch(GITLEAKS_OK)
    expect(lines.slice(3)).toEqual([
      '✓ Claude Code here runs gh as memorex386',
      '✓ the guard for sessions started elsewhere is installed',
      '✓ skill copies and template overrides match',
      S1_REPO,
      'Ready.',
    ])
    expect(endpointsRead(gh.calls())).toContain(`repos/${REPO_SLUG}`)
    expectNoTerm(result)
  })

  test('S6.1 FR-019 S1 each setting that differs is named, with its fix', () => {
    const cases: [string, Partial<Record<keyof typeof RIGHT, unknown>>, RegExp][] = [
      ['squash merges off', { allow_squash_merge: false }, /squash/i],
      ['merge commits on', { allow_merge_commit: true }, /merge commits/i],
      ['rebase merges on', { allow_rebase_merge: true }, /rebase/i],
      ["the squash title isn't the pull request's", { squash_merge_commit_title: 'COMMIT_OR_PR_TITLE' }, /title/i],
      ['auto-merge off', { allow_auto_merge: false }, /auto-merge/i],
      ['branches kept after merging', { delete_branch_on_merge: false }, /delet/i],
    ]
    for (const [name, change, named] of cases) {
      const { sandbox, check } = machine()
      const gh = installFakeGh(sandbox, settings(change))
      const result = check(gh.env)
      expect(result.status, `${name}\n${describeRun(result)}`).not.toBe(0)
      const problem = repoProblem(result)
      expect(problem.join('\n'), name).toMatch(named)
      expect(problem.some((line) => line.startsWith('  Fix: ')), `${name}\n${problem.join('\n')}`).toBe(true)
      expect(filledLines(result.stdout).at(-1), name).toBe('1 problem.')
    }
  })

  test('S6.1 FR-019 S1 two settings that differ are both named', () => {
    const { sandbox, check } = machine()
    const gh = installFakeGh(sandbox, settings({ allow_merge_commit: true, allow_auto_merge: false }))
    const result = check(gh.env)
    expect(result.status, describeRun(result)).not.toBe(0)
    const problem = repoProblem(result).join('\n')
    expect(problem).toMatch(/merge commits/i)
    expect(problem).toMatch(/auto-merge/i)
  })

  test("S6.1 FR-019 S1 a GitHub that can't be reached is a problem with its fix, not a pass", () => {
    for (const how of ['offline', 'no gh'] as const) {
      const { sandbox, check } = machine()
      const env = how === 'offline' ? installFakeGh(sandbox, { offline: true }).env : withoutOnPath(sandbox, 'gh')
      const result = check(env)
      expect(result.status, `${how}\n${describeRun(result)}`).not.toBe(0)
      const problem = repoProblem(result)
      expect(problem.some((line) => line.startsWith('  Fix: ')), `${how}\n${problem.join('\n')}`).toBe(true)
      expect(filledLines(result.stdout)).not.toContain(S1_REPO)
    }
  })
})
