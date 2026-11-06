import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { repoPath, SCRIPTS, slash } from '../helpers/paths.ts'
import { createRepo, type ScratchRepo, writeFile } from '../helpers/repo.ts'
import { describeRun, filledLines, runMerged, runNode, type RunResult } from '../helpers/run.ts'
import {
  createSandbox,
  type Sandbox,
  type SandboxOptions,
  withoutOnPath,
  writeDefaultGhLogin,
  writeGhLogin,
} from '../helpers/sandbox.ts'
import { copiesSeed, SKILL_COPY } from '../helpers/seeds.ts'
import { EMPTY_LIST, expectNoTerm, MADE_UP_TERM_COUNT } from '../helpers/terms.ts'

// pnpm setup:check, run as `node scripts/setup-check.ts` in a scratch checkout
// on an isolated machine: a made-up term list, crafted gh logins and a
// temporary Claude Code folder.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

interface Machine {
  sandbox: Sandbox
  repo: ScratchRepo
  check(env?: NodeJS.ProcessEnv): RunResult
}

interface MachineOptions {
  sandbox?: SandboxOptions
  /** Whether git's hooks are on in the checkout. */
  hooks?: boolean
  /** Whether the checkout's local settings point gh at the working login: Brad's, while the agent's account is suspended (D160). */
  workingLogin?: boolean
  /** Whether the guard for sessions elsewhere is installed. */
  userGuard?: boolean
}

/** A machine that's set up, apart from what the options leave out. */
function machine(options: MachineOptions = {}): Machine {
  const sandbox = createSandbox(options.sandbox)
  sandboxes.push(sandbox)
  const repo = createRepo(sandbox, { seed: copiesSeed(), hooks: false })
  cpSync(repoPath('.claude', 'hooks'), path.join(repo.dir, '.claude', 'hooks'), { recursive: true })
  for (const hook of ['pre-commit', 'commit-msg', 'pre-push']) {
    cpSync(repoPath('.husky', hook), path.join(repo.dir, '.husky', hook))
  }
  if (options.hooks !== false) {
    for (const file of ['h', 'pre-commit', 'commit-msg', 'pre-push']) {
      writeFile(repo.dir, `.husky/_/${file}`, '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n')
    }
    writeFile(repo.dir, '.husky/_/.gitignore', '*\n')
    repo.gitOk(['config', 'core.hooksPath', '.husky/_'])
  }

  writeDefaultGhLogin(sandbox, 'bradthome-agent')
  const workingDir = sandbox.path('working-gh')
  writeGhLogin(workingDir, 'memorex386')
  if (options.workingLogin !== false) {
    writeFile(repo.dir, '.claude/settings.local.json', `${JSON.stringify({ env: { GH_CONFIG_DIR: slash(workingDir) } }, null, 2)}\n`)
  }
  if (options.userGuard !== false) {
    const install = runNode(SCRIPTS.guardInstall, [], { cwd: sandbox.root, env: sandbox.env })
    if (install.status !== 0) throw new Error(`pnpm guard:install failed\n${describeRun(install)}`)
  }
  return {
    sandbox,
    repo,
    check: (env = sandbox.env) => runMerged(process.execPath, [SCRIPTS.setupCheck], { cwd: repo.dir, env, scratch: sandbox.root }),
  }
}

const GITLEAKS_OK = /^✓ gitleaks \d+\.\d+\.\d+$/

/** The lines of a report, each matched whole and in order. */
function expectReport(result: RunResult, expected: readonly (string | RegExp)[]): void {
  const lines = filledLines(result.stdout)
  expect(lines.length, result.stdout).toBe(expected.length)
  for (const [index, line] of expected.entries()) {
    if (typeof line === 'string') expect(lines[index], result.stdout).toBe(line)
    else expect(lines[index], result.stdout).toMatch(line)
  }
}

/** A problem's ✖ line, followed by its Fix line. */
function expectProblem(result: RunResult, problem: RegExp, fix: RegExp): void {
  const lines = filledLines(result.stdout)
  const at = lines.findIndex((line) => line.startsWith('✖ ') && problem.test(line))
  expect(at, result.stdout).toBeGreaterThanOrEqual(0)
  const next = lines[at + 1] ?? ''
  expect(next.startsWith('  Fix: '), result.stdout).toBe(true)
  expect(next, result.stdout).toMatch(fix)
}

describe('S1: the setup check passes', () => {
  test('S1 S8.2 S2.8 FR-028 FR-018 SC-002 every line passes on a machine that is set up, gh here is the working login, and it shows how many terms, never a term', () => {
    const { check } = machine()
    const result = check()
    expect(result.status, result.stdout).toBe(0)
    expectReport(result, [
      '✓ git hooks are on',
      `✓ private-term list found: ${MADE_UP_TERM_COUNT} terms`,
      GITLEAKS_OK,
      '✓ Claude Code here runs gh as memorex386',
      '✓ the guard for sessions started elsewhere is installed',
      '✓ skill copies and template overrides match',
      'Ready.',
    ])
    expectNoTerm(result)
  })
})

describe('S2: the setup check finds problems', () => {
  test("S2 S8.3 S2.8 FR-028 FR-018 lists each problem with its fix, in the mock's words, including gh here acting as the suspended agent", () => {
    const { check } = machine({ sandbox: { terms: false }, workingLogin: false })
    const result = check()
    expect(result.status).not.toBe(0)
    expectReport(result, [
      '✓ git hooks are on',
      '✖ private-term list not found',
      '  Fix: git config --global bradthome.privateTerms <path to the list>',
      GITLEAKS_OK,
      '✖ Claude Code here runs gh as bradthome-agent, not memorex386',
      '  Fix: set GH_CONFIG_DIR in .claude/settings.local.json. AGENTS.md shows how.',
      '✓ the guard for sessions started elsewhere is installed',
      '✓ skill copies and template overrides match',
      '2 problems.',
    ])
  })

  test('S2 S8.3 FR-028 reports git hooks that are off, with pnpm install as the fix', () => {
    const { check } = machine({ hooks: false })
    const result = check()
    expect(result.status).not.toBe(0)
    expectProblem(result, /git hooks/, /pnpm install/)
    expect(filledLines(result.stdout).at(-1)).toMatch(/^1 problems?\.$/)
  })

  test("S2 S8.3 FR-028 reports gitleaks that isn't installed, with the install step", () => {
    const { sandbox, check } = machine()
    const result = check(withoutOnPath(sandbox, 'gitleaks'))
    expect(result.status).not.toBe(0)
    expectProblem(result, /gitleaks/, /install/i)
  })

  test("S2 S8.3 FR-028 reports a guard for sessions elsewhere that isn't installed, with pnpm guard:install as the fix", () => {
    const { check } = machine({ userGuard: false })
    const result = check()
    expect(result.status).not.toBe(0)
    expectProblem(result, /guard/, /pnpm guard:install/)
  })

  test('S2 S8.3 FR-028 reports copies out of date, with pnpm sync as the fix', () => {
    const { repo, check } = machine()
    repo.write(SKILL_COPY, `${repo.read(SKILL_COPY)}An edit made to the copy.\n`)
    repo.gitOk(['add', '--all'])
    const result = check()
    expect(result.status).not.toBe(0)
    expectProblem(result, /cop(?:y|ies)|overrides/, /pnpm sync/)
  })

  test('S2 S8.3 FR-028 SC-002 reports an empty list without showing anything from it', () => {
    const { check } = machine({ sandbox: { terms: EMPTY_LIST } })
    const result = check()
    expect(result.status).not.toBe(0)
    expectProblem(result, /private-term list is empty/, /bradthome\.privateTerms/)
    expectNoTerm(result)
  })

  test("S2 S8.3 FR-028 reports gh's config folder for Claude Code when it holds no login", () => {
    const { sandbox, repo, check } = machine({ workingLogin: false })
    const empty = sandbox.path('empty-gh')
    mkdirSync(empty)
    writeFileSync(
      path.join(repo.dir, '.claude', 'settings.local.json'),
      `${JSON.stringify({ env: { GH_CONFIG_DIR: slash(empty) } }, null, 2)}\n`,
    )
    const result = check()
    expect(result.status).not.toBe(0)
    expectProblem(result, /gh/, /GH_CONFIG_DIR|gh auth login|AGENTS\.md/)
  })
})
