import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { edit, type HookInput, processDecision, runHook, write } from '../helpers/hook-input.ts'
import { C } from '../helpers/messages.ts'
import { SCRIPTS } from '../helpers/paths.ts'
import { type ScratchRepo, writeFile } from '../helpers/repo.ts'
import { describeRun } from '../helpers/run.ts'
import { LOCKED_SPEC, LOCKED_TEST, lockedSeed, scratchRepos } from '../helpers/seeds.ts'

// C6: the guard denies a Claude Code edit to a locked test before it happens,
// unless the branch already changes the test's spec. It runs as the process
// Claude Code starts, on scratch repos whose main locks a test.

const scratch = scratchRepos()

function lockedRepo(): ScratchRepo {
  return scratch({ repo: { seed: lockedSeed(), hooks: false } })
}

function abs(dir: string, file: string): string {
  return path.join(dir, ...file.split('/'))
}

/**
 * Runs the guard the way a desktop session does: from the project's folder,
 * with CLAUDE_PROJECT_DIR pointing there, whatever folder the input names.
 */
function guard(repo: ScratchRepo, input: HookInput, projectDir = repo.dir): { decision: string; reason: string | undefined } {
  const result = runHook(SCRIPTS.guard, input, { ...repo.sandbox.env, CLAUDE_PROJECT_DIR: projectDir }, projectDir)
  expect(result.status === 0 || result.status === 2, describeRun(result)).toBe(true)
  return processDecision(result)
}

const CHANGED_SPEC = '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works better.\n'

describe('C6: an edit to a locked test', () => {
  test("C6 S3.4 FR-020 denies an edit to a locked test when the branch doesn't change its spec", () => {
    const repo = lockedRepo()
    expect(guard(repo, edit(abs(repo.dir, LOCKED_TEST), repo.dir))).toEqual({ decision: 'deny', reason: C.locked(LOCKED_TEST) })
  })

  test('C6 S3.4 FR-020 denies a Write to a locked test too', () => {
    const repo = lockedRepo()
    expect(guard(repo, write(abs(repo.dir, LOCKED_TEST), repo.dir))).toEqual({ decision: 'deny', reason: C.locked(LOCKED_TEST) })
  })

  test("S3.4 FR-020 allows the edit once the branch changes the spec, counting a change that isn't committed yet", () => {
    const repo = lockedRepo()
    repo.write(LOCKED_SPEC, CHANGED_SPEC)
    expect(guard(repo, edit(abs(repo.dir, LOCKED_TEST), repo.dir)).decision).toBe('allow')
  })

  test("S3.4 FR-020 allows the edit when the branch's commits change the spec", () => {
    const repo = lockedRepo()
    repo.write(LOCKED_SPEC, CHANGED_SPEC)
    repo.gitOk(['add', '--all'])
    repo.gitOk(['commit', '--quiet', '-m', 'docs(001): change the scenario'])
    expect(guard(repo, edit(abs(repo.dir, LOCKED_TEST), repo.dir)).decision).toBe('allow')
  })

  test('S3.4 FR-020 allows an edit to a test that no tests.lock lists', () => {
    const repo = lockedRepo()
    expect(guard(repo, edit(abs(repo.dir, 'tests/001/unit/other.test.ts'), repo.dir)).decision).toBe('allow')
  })

  test("C6 S3.4 FR-020 finds the checkout from the session's folder and the file, never from CLAUDE_PROJECT_DIR", () => {
    const repo = lockedRepo()
    const other = lockedRepo()
    other.write(LOCKED_SPEC, CHANGED_SPEC)
    const input = edit(abs(repo.dir, LOCKED_TEST), repo.dir)
    expect(guard(repo, input, other.dir)).toEqual({ decision: 'deny', reason: C.locked(LOCKED_TEST) })
  })

  test('C6 S3.4 FR-020 guards a git worktree of the repo the same way', () => {
    const repo = lockedRepo()
    const worktree = repo.sandbox.path('worktree')
    repo.gitOk(['worktree', 'add', '--quiet', '-b', '001-worktree', worktree, '001-demo'])
    const input = edit(abs(worktree, LOCKED_TEST), worktree)
    expect(guard(repo, input, repo.dir)).toEqual({ decision: 'deny', reason: C.locked(LOCKED_TEST) })
    writeFile(worktree, LOCKED_SPEC, CHANGED_SPEC)
    expect(guard(repo, input, repo.dir).decision).toBe('allow')
  })
})
