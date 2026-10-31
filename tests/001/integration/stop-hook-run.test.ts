import { mkdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { runHook, stop, userPrompt } from '../helpers/hook-input.ts'
import { C7 } from '../helpers/messages.ts'
import { fixturePath, repoPath, SCRIPTS } from '../helpers/paths.ts'
import type { ScratchRepo } from '../helpers/repo.ts'
import { describeRun, type RunResult } from '../helpers/run.ts'
import { scratchRepos } from '../helpers/seeds.ts'

// The turn-start and Stop hooks as Claude Code runs them, on a scratch project
// whose typecheck and test:unit scripts fail the way the mock shows. The hooks
// run pnpm for real.

const scratch = scratchRepos()

/** The repo's own pnpm, so the scratch project runs the same pnpm with no download. */
const PACKAGE_MANAGER = (JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as { packageManager?: string })
  .packageManager

/** pnpm runs twice in each turn. */
const TURN_TIMEOUT = 300_000

function project(): ScratchRepo {
  const scripts = { typecheck: 'node fake-tsc.mjs', 'test:unit': 'node fake-vitest.mjs' }
  const manifest = { name: 'scratch-project', private: true, packageManager: PACKAGE_MANAGER, scripts }
  return scratch({
    repo: {
      hooks: false,
      seed: {
        'package.json': `${JSON.stringify(manifest, null, 2)}\n`,
        'fake-tsc.mjs': readFileSync(fixturePath('stop', 'fake-tsc.mjs'), 'utf8'),
        'fake-vitest.mjs': readFileSync(fixturePath('stop', 'fake-vitest.mjs'), 'utf8'),
        'scripts/private-terms.ts': 'export const terms: string[] = []\n',
        'tests/private-terms.test.ts': 'export {}\n',
        'docs/notes.md': 'Ordinary notes.\n',
      },
    },
  })
}

let sessions = 0

/** Runs one turn: the turn-start hook, the agent's changes, then the Stop hook. */
function turn(repo: ScratchRepo, changes: () => void): RunResult {
  sessions += 1
  const sessionId = `stop-run-${process.pid}-${sessions}`
  // A desktop session runs hooks from its project's folder, which needn't be
  // the checkout the turn works in.
  const elsewhere = repo.sandbox.path('elsewhere')
  mkdirSync(elsewhere, { recursive: true })
  const env = { ...repo.sandbox.env, CLAUDE_PROJECT_DIR: elsewhere }
  const started = runHook(SCRIPTS.turnStart, userPrompt(repo.dir, sessionId), env, repo.dir)
  expect(started.status, describeRun(started)).toBe(0)
  changes()
  return runHook(SCRIPTS.stop, stop(repo.dir, sessionId), env, repo.dir)
}

describe('C7: the Stop hook in a real turn', () => {
  test('C7 S5.1 FR-022 sends the agent back when the turn changed code and the checks fail', () => {
    const repo = project()
    const result = turn(repo, () => repo.write('scripts/private-terms.ts', 'export const terms: string[] = ["changed"]\n'))
    expect(result.status, describeRun(result)).toBe(0)
    const output = JSON.parse(result.stdout) as { decision?: string; reason?: string }
    expect(output.decision).toBe('block')
    expect((output.reason ?? '').replace(/\n+$/, '').split('\n')).toEqual(C7)
  }, TURN_TIMEOUT)

  test('S5.2 FR-022 lets a turn end that changed no code', () => {
    const repo = project()
    const result = turn(repo, () => repo.write('docs/notes.md', 'Changed notes.\n'))
    expect(result.status, describeRun(result)).toBe(0)
    expect(result.stdout.trim()).toBe('')
  }, TURN_TIMEOUT)

  test('S5.2 FR-022 lets a turn end that changed nothing', () => {
    const repo = project()
    const result = turn(repo, () => {})
    expect(result.status, describeRun(result)).toBe(0)
    expect(result.stdout.trim()).toBe('')
  }, TURN_TIMEOUT)

  test('S5.2 FR-022 counts only what changed during the turn, not changes left from before it', () => {
    const repo = project()
    repo.write('scripts/private-terms.ts', 'export const terms: string[] = ["left from an earlier turn"]\n')
    const result = turn(repo, () => {})
    expect(result.status, describeRun(result)).toBe(0)
    expect(result.stdout.trim()).toBe('')
  }, TURN_TIMEOUT)
})
