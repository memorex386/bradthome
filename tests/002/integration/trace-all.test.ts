import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { expectBlock, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import type { ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, type RunResult } from '../../001/helpers/run.ts'
import { ciRepos, runCi } from '../helpers/ci-repo.ts'
import { K9_FIX, PASS } from '../helpers/messages.ts'
import { CI, fixturePath } from '../helpers/paths.ts'

// The trace job's script, run in a scratch repo laid out like this one (S3.4).
// A spec with a tests.lock is traced. A spec without one is listed as not
// traced yet, and doesn't fail. The fixtures' test files are stored as .txt,
// so nothing reads them as spec 002's own tests.

const scratch = ciRepos()

const LOCK = `${'0'.repeat(64)}  tests/007/unit/demo.test.ts\n`

function fixture(name: string): string {
  return readFileSync(fixturePath('trace', name), 'utf8')
}

function specs(files: Record<string, string>): ScratchRepo {
  return scratch({ seed: files, branch: false })
}

function trace(repo: ScratchRepo): RunResult {
  return runCi(repo, CI.traceAll, repo.sandbox.env)
}

describe('K9: an ID with no test', () => {
  test("S3.4 FR-012 K9 a spec with a tests.lock fails for each ID no test name leads, naming each one, in the mock's words", () => {
    const repo = specs({
      'specs/007-demo/spec.md': fixture('spec.md'),
      'specs/007-demo/tests.lock': LOCK,
      'tests/007/unit/demo.test.ts': fixture('partial.test.ts.txt'),
    })
    const result = trace(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, ['✖ trace  2 of the 5 IDs in specs/007-demo/spec.md lead no test name', '  S1.2  FR-002', K9_FIX])
  })

  test('S3.4 FR-012 K9 a spec with no tests.lock is listed as not traced yet, and doesn\'t fail', () => {
    const repo = specs({
      'specs/007-demo/spec.md': fixture('spec.md'),
      'specs/007-demo/tests.lock': LOCK,
      'tests/007/unit/demo.test.ts': fixture('full.test.ts.txt'),
      'specs/008-draft/spec.md': fixture('spec.md').replace('Spec 007', 'Spec 008'),
    })
    const result = trace(repo)
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, /specs\/008-draft\b.*\bnot traced yet\b/), result.stdout).toBeGreaterThanOrEqual(0)
    expectOneLine(result.stdout, PASS.trace)
  })

  test('S3.4 FR-012 K9 every spec with a lock is traced, and each failing one is named', () => {
    const repo = specs({
      'specs/007-demo/spec.md': fixture('spec.md'),
      'specs/007-demo/tests.lock': LOCK,
      'tests/007/unit/demo.test.ts': fixture('partial.test.ts.txt'),
      'specs/011-more/spec.md': fixture('spec.md').replace('Spec 007', 'Spec 011'),
      'specs/011-more/tests.lock': LOCK.replace('tests/007', 'tests/011'),
      'tests/011/unit/demo.test.ts': fixture('first-two-missing.test.ts.txt'),
      'specs/012-fine/spec.md': fixture('spec.md').replace('Spec 007', 'Spec 012'),
      'specs/012-fine/tests.lock': LOCK.replace('tests/007', 'tests/012'),
      'tests/012/unit/demo.test.ts': fixture('full.test.ts.txt'),
    })
    const result = trace(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, '✖ trace  2 of the 5 IDs in specs/007-demo/spec.md lead no test name'), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, '✖ trace  2 of the 5 IDs in specs/011-more/spec.md lead no test name'), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, /^✖ trace .*specs\/012-fine/)).toBe(-1)
  })

  test('S3.4 FR-012 passes when every locked spec is covered, and when no spec has a lock yet', () => {
    const covered = trace(
      specs({
        'specs/007-demo/spec.md': fixture('spec.md'),
        'specs/007-demo/tests.lock': LOCK,
        'tests/007/unit/demo.test.ts': fixture('full.test.ts.txt'),
      }),
    )
    expect(covered.status, describeRun(covered)).toBe(0)
    expectOneLine(covered.stdout, PASS.trace)

    const none = trace(specs({ 'specs/008-draft/spec.md': fixture('spec.md') }))
    expect(none.status, describeRun(none)).toBe(0)
    expect(findLine(none.stdout, /specs\/008-draft\b.*\bnot traced yet\b/), none.stdout).toBeGreaterThanOrEqual(0)
  })
})
