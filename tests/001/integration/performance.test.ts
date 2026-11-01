import { performance } from 'node:perf_hooks'
import { describe, expect, test } from 'vitest'
import { slash } from '../helpers/paths.ts'
import type { ScratchRepo } from '../helpers/repo.ts'
import { describeRun, run, type RunResult } from '../helpers/run.ts'
import { scratchRepos } from '../helpers/seeds.ts'

// SC-003: what the hooks add to a commit of 50 changed files and to a push of
// 50 new commits. Each figure is the median of 3 runs, measured against the
// same git command with the hooks skipped.

const scratch = scratchRepos()

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

describe('SC-003: timing', () => {
  test('SC-003 the commit hooks add under 3 seconds to a commit of 50 changed files', () => {
    const repo = scratch()
    const added: number[] = []
    for (let round = 1; round <= 3; round += 1) {
      changeFiles(repo, 50, `with the hooks, round ${round}`)
      const withHooks = timed(() => repo.git(['commit', '-m', `docs(001): change 50 files, round ${round}`]))
      expect(withHooks.result.status, describeRun(withHooks.result)).toBe(0)
      changeFiles(repo, 50, `without the hooks, round ${round}`)
      const without = timed(() => repo.git(['commit', '--no-verify', '-m', `docs(001): change 50 files again, round ${round}`]))
      expect(without.result.status).toBe(0)
      added.push(withHooks.ms - without.ms)
    }
    expect(median(added), `added ${added.map((ms) => Math.round(ms)).join(', ')} ms`).toBeLessThan(3000)
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
