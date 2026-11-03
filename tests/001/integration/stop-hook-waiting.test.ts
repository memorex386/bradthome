import { mkdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { waitingSpecs } from '../../../.claude/hooks/stop.ts'
import { runHook, stop, userPrompt } from '../helpers/hook-input.ts'
import { fixturePath, repoPath, SCRIPTS } from '../helpers/paths.ts'
import type { ScratchRepo } from '../helpers/repo.ts'
import { describeRun } from '../helpers/run.ts'
import { scratchRepos } from '../helpers/seeds.ts'

// Which specs' tests wait for their build (S5.4, D96), on scratch repos with
// real git: a branch for spec 003 off a main that holds spec 001, with its
// tests stage, lock and build made as commits. Then one real turn, where the
// Stop hook lets a tests stage end.

const scratch = scratchRepos()

const SPEC = 'specs/003-demo/spec.md'
const LOCK = 'specs/003-demo/tests.lock'
const TEST = 'tests/003/unit/site.test.ts'

/** A repo whose main has spec 001, locked, on branch 003-demo with spec 003's spec. */
function repo(seed: Record<string, string> = {}): ScratchRepo {
  const scratchRepo = scratch({
    repo: {
      hooks: false,
      branch: false,
      seed: {
        'specs/001-hooks/spec.md': '# Spec 001\n',
        'specs/001-hooks/tests.lock': 'abc  tests/001/unit/a.test.ts\n',
        'tests/001/unit/a.test.ts': 'export {}\n',
        'scripts/terms.ts': 'export const terms: string[] = []\n',
        ...seed,
      },
    },
  })
  scratchRepo.gitOk(['switch', '--quiet', '--create', '003-demo'])
  scratchRepo.write(SPEC, '# Spec 003\n')
  commit(scratchRepo, 'docs(003): add the spec')
  return scratchRepo
}

function commit(scratchRepo: ScratchRepo, message: string): void {
  scratchRepo.gitOk(['add', '--all'])
  scratchRepo.gitOk(['commit', '--quiet', '--no-verify', '-m', message])
}

/** The tests stage: tests, a harness change to the root config, then the lock. */
function testsStage(scratchRepo: ScratchRepo, lock = true): void {
  scratchRepo.write(TEST, 'export {}\n')
  scratchRepo.write('vitest.config.ts', 'export default {}\n')
  commit(scratchRepo, 'test(003): add the tests')
  if (!lock) return
  scratchRepo.write(LOCK, `abc  ${TEST}\n`)
  commit(scratchRepo, 'test(003): lock the tests')
}

describe('S5.4: the specs whose tests wait for their build', () => {
  test('S5.4 FR-022 a spec waits while its tests stage runs, before and after the lock, harness changes included', () => {
    const scratchRepo = repo()
    testsStage(scratchRepo, false)
    expect(waitingSpecs(scratchRepo.dir)).toEqual(['003'])
    scratchRepo.write(LOCK, `abc  ${TEST}\n`)
    expect(waitingSpecs(scratchRepo.dir), 'lock not committed').toEqual(['003'])
    commit(scratchRepo, 'test(003): lock the tests')
    expect(waitingSpecs(scratchRepo.dir), 'lock committed').toEqual(['003'])
  })

  test('S5.4 FR-022 changes to its own tests, specs and docs after the lock leave it waiting', () => {
    const scratchRepo = repo()
    testsStage(scratchRepo)
    scratchRepo.write(TEST, 'export const changed = 1\n')
    scratchRepo.write(SPEC, '# Spec 003, amended\n')
    scratchRepo.write('docs/notes.md', 'Notes.\n')
    commit(scratchRepo, 'test(003): fix a test')
    scratchRepo.write('tests/003/static/new.test.ts', 'export {}\n')
    expect(waitingSpecs(scratchRepo.dir)).toEqual(['003'])
  })

  test('S5.4 FR-022 the first code change outside its tests after the lock, committed or not, starts the build', () => {
    for (const file of ['scripts/site-report.ts', 'package.json', 'tests/001/unit/a.test.ts']) {
      const committed = repo()
      testsStage(committed)
      committed.write(file, 'export const built = 1\n')
      commit(committed, 'feat(003): build it')
      expect(waitingSpecs(committed.dir), `${file}, committed`).toEqual([])

      const uncommitted = repo()
      testsStage(uncommitted)
      uncommitted.write(file, 'export const built = 1\n')
      expect(waitingSpecs(uncommitted.dir), `${file}, uncommitted`).toEqual([])
    }
  })

  test('S5.4 FR-022 code merged in from main after the lock leaves it waiting', () => {
    const scratchRepo = repo()
    testsStage(scratchRepo)
    scratchRepo.gitOk(['switch', '--quiet', 'main'])
    scratchRepo.write('scripts/terms.ts', 'export const terms: string[] = ["from main"]\n')
    commit(scratchRepo, 'fix(repo): change the terms')
    scratchRepo.gitOk(['push', '--quiet', 'origin', 'main'])
    scratchRepo.gitOk(['switch', '--quiet', '003-demo'])
    scratchRepo.gitOk(['merge', '--quiet', '--no-ff', '--no-edit', 'main'])
    expect(waitingSpecs(scratchRepo.dir)).toEqual(['003'])
  })

  test('S5.4 FR-022 a spec locked on main, or tests with no spec folder, never wait', () => {
    const scratchRepo = repo()
    expect(waitingSpecs(scratchRepo.dir), 'spec 001 is locked on main').toEqual([])
    scratchRepo.write('tests/004/unit/x.test.ts', 'export {}\n')
    expect(waitingSpecs(scratchRepo.dir), 'tests/004 has no spec').toEqual([])
  })

  test('S5.4 FR-022 with no main to compare with, no spec waits', () => {
    const scratchRepo = repo()
    testsStage(scratchRepo, false)
    scratchRepo.gitOk(['branch', '--quiet', '-D', 'main'])
    scratchRepo.gitOk(['update-ref', '-d', 'refs/remotes/origin/main'])
    expect(waitingSpecs(scratchRepo.dir)).toEqual([])
  })
})

/** The repo's own pnpm, so the scratch project runs the same pnpm with no download. */
const PACKAGE_MANAGER = (JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as { packageManager?: string })
  .packageManager

/** pnpm runs twice in each turn. */
const TURN_TIMEOUT = 300_000

describe('S5.4: the Stop hook in a real tests-stage turn', () => {
  test("S5.4 FR-022 lets a tests-stage turn end with a notice when only the spec's own tests fail", () => {
    const scripts = { typecheck: 'node --version', 'test:unit': 'node fake-vitest.mjs' }
    const manifest = { name: 'scratch-project', private: true, packageManager: PACKAGE_MANAGER, scripts }
    const scratchRepo = repo({
      'package.json': `${JSON.stringify(manifest, null, 2)}\n`,
      'fake-vitest.mjs': readFileSync(fixturePath('stop', 'fake-vitest-waiting.mjs'), 'utf8'),
    })
    const sessionId = `stop-waiting-${process.pid}`
    const elsewhere = scratchRepo.sandbox.path('elsewhere')
    mkdirSync(elsewhere, { recursive: true })
    const env = { ...scratchRepo.sandbox.env, CLAUDE_PROJECT_DIR: elsewhere }
    const started = runHook(SCRIPTS.turnStart, userPrompt(scratchRepo.dir, sessionId), env, scratchRepo.dir)
    expect(started.status, describeRun(started)).toBe(0)
    scratchRepo.write(TEST, 'export const failing = true\n')
    const result = runHook(SCRIPTS.stop, stop(scratchRepo.dir, sessionId), env, scratchRepo.dir)
    expect(result.status, describeRun(result)).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      systemMessage: "Stop hook: the only failures are in spec 003's tests, which wait for the build, so the turn ends.",
    })
  }, TURN_TIMEOUT)
})
