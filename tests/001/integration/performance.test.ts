import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, test } from 'vitest'
import { slash } from '../helpers/paths.ts'
import type { ScratchRepo } from '../helpers/repo.ts'
import { describeRun, run, type RunResult } from '../helpers/run.ts'
import { scratchRepos } from '../helpers/seeds.ts'

// SC-003: what the hooks add to a commit of 50 changed files and to a push of
// 50 new commits, measured against the same git command with the hooks
// skipped. The push figure is the median of 3 runs.
//
// The commit figure is the median of 5 rounds, after one warm-up commit that
// isn't counted. The hooks start about ten processes to git's one, so on a
// slow or busy machine what they add grows with it. The 3-second budget is for
// a machine as fast as Brad's PC, where a commit with no hooks takes about
// 130 ms. On a slower machine it grows in step with that commit's median, and
// it's never under 3 seconds (#34).

const scratch = scratchRepos()

const COMMIT_BUDGET_MS = 3000
/** A commit of 50 files with no hooks on Brad's PC, with some room. */
const REFERENCE_BASELINE_MS = 150
const COMMIT_ROUNDS = 5

/** The commit budget on a machine whose commits with no hooks took these times. */
function commitBudget(baselines: readonly number[]): number {
  return COMMIT_BUDGET_MS * Math.max(1, median(baselines) / REFERENCE_BASELINE_MS)
}

interface CommitTiming {
  added: number[]
  baselines: number[]
  budget: number
}

function describeTiming(timing: CommitTiming): string {
  const ms = (values: readonly number[]): string => values.map((value) => Math.round(value)).join(', ')
  return `added ${ms(timing.added)} ms; commits with no hooks ${ms(timing.baselines)} ms; budget ${Math.round(timing.budget)} ms`
}

/** Hundreds of git commands, which take a while on Windows. The budgets are the assertions, not this. */
const TIMING_TIMEOUT = 600_000

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN
}

function timed(action: () => RunResult): { ms: number; result: RunResult } {
  const start = performance.now()
  const result = action()
  return { ms: performance.now() - start, result }
}

function changeFiles(repo: ScratchRepo, count: number, label: string): void {
  for (let n = 1; n <= count; n += 1) {
    const lines = Array.from({ length: 30 }, (_, line) => `Line ${line + 1} of file ${n}, ${label}.`)
    repo.write(`docs/timing/file-${String(n).padStart(2, '0')}.md`, `${lines.join('\n')}\n`)
  }
  repo.gitOk(['add', '--all'])
}

/** Times the hooks on commits of 50 changed files, each against the same commit with --no-verify. */
function timeCommits(repo: ScratchRepo, rounds: number): CommitTiming {
  changeFiles(repo, 50, 'the warm-up')
  const warmUp = repo.git(['commit', '-m', 'docs(001): change 50 files to warm up'])
  expect(warmUp.status, describeRun(warmUp)).toBe(0)
  const added: number[] = []
  const baselines: number[] = []
  for (let round = 1; round <= rounds; round += 1) {
    changeFiles(repo, 50, `with the hooks, round ${round}`)
    const withHooks = timed(() => repo.git(['commit', '-m', `docs(001): change 50 files, round ${round}`]))
    expect(withHooks.result.status, describeRun(withHooks.result)).toBe(0)
    changeFiles(repo, 50, `without the hooks, round ${round}`)
    const without = timed(() => repo.git(['commit', '--no-verify', '-m', `docs(001): change 50 files again, round ${round}`]))
    expect(without.result.status).toBe(0)
    added.push(withHooks.ms - without.ms)
    baselines.push(without.ms)
  }
  return { added, baselines, budget: commitBudget(baselines) }
}

describe('SC-003: timing', () => {
  test('SC-003 the commit hooks add under 3 seconds to a commit of 50 changed files', () => {
    const timing = timeCommits(scratch(), COMMIT_ROUNDS)
    // The figures, pass or fail, for reading a slow runner's log.
    console.info(`SC-003 commit timing: ${describeTiming(timing)}`)
    expect(median(timing.added), describeTiming(timing)).toBeLessThan(timing.budget)
  }, TIMING_TIMEOUT)

  test("SC-003 the commit budget is 3 seconds on a machine as fast as Brad's PC, and grows in step on a slower one", () => {
    expect(commitBudget([120, 130, 140])).toBe(3000)
    expect(commitBudget([150, 150, 150])).toBe(3000)
    expect(commitBudget([300, 450, 600])).toBe(9000)
    expect(commitBudget([450, 100, 2000, 400, 500])).toBe(9000)
  })

  test('SC-003 hooks that add more than the budget fail the commit timing', () => {
    const repo = scratch()
    // A commit with no hooks sizes this machine's budget, with room for it to
    // slow down. pre-commit then waits longer than that before it runs.
    changeFiles(repo, 50, 'the baseline')
    const baseline = timed(() => repo.git(['commit', '--no-verify', '-m', 'docs(001): change 50 files for the baseline']))
    expect(baseline.result.status).toBe(0)
    const wait = Math.ceil(commitBudget([baseline.ms * 2]) / 1000) + 1
    const stub = path.join(repo.gitOk(['config', 'core.hooksPath']), 'pre-commit')
    writeFileSync(stub, readFileSync(stub, 'utf8').replace('exec ', `sleep ${wait}\nexec `))
    const timing = timeCommits(repo, 1)
    expect(median(timing.added), describeTiming(timing)).toBeGreaterThanOrEqual(timing.budget)
  }, TIMING_TIMEOUT)

  test('SC-003 pre-push takes under 10 seconds for 50 new commits', () => {
    const repo = scratch({ repo: { hooks: ['pre-push'] } })
    const plain = repo.sandbox.path('plain.git')
    expect(run('git', ['init', '--quiet', '--bare', plain], { cwd: repo.sandbox.root, env: repo.sandbox.env }).status).toBe(0)
    repo.gitOk(['remote', 'add', 'plain', slash(plain)])
    const added: number[] = []
    for (let round = 1; round <= 3; round += 1) {
      const branch = `001-timing-${round}`
      repo.gitOk(['switch', '--quiet', '--create', branch, 'main'])
      for (let n = 1; n <= 50; n += 1) {
        repo.write(`docs/timing/round-${round}.md`, `Commit ${n} of round ${round}.\n`)
        repo.gitOk(['add', '--all'])
        repo.gitOk(['commit', '--quiet', '--no-verify', '-m', `docs(001): timing commit ${n} of round ${round}`])
      }
      const withHook = timed(() => repo.git(['push', '--quiet', 'origin', branch]))
      expect(withHook.result.status, describeRun(withHook.result)).toBe(0)
      const without = timed(() => repo.git(['push', '--quiet', '--no-verify', 'plain', branch]))
      expect(without.result.status).toBe(0)
      added.push(withHook.ms - without.ms)
    }
    expect(median(added), `added ${added.map((ms) => Math.round(ms)).join(', ')} ms`).toBeLessThan(10_000)
  }, TIMING_TIMEOUT)
})
