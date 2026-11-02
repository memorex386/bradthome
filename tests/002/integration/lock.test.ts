import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { expectBlock, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import type { ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, type RunResult } from '../../001/helpers/run.ts'
import { LOCK_FILE, LOCKED_SPEC, LOCKED_TEST, lockedSeed } from '../../001/helpers/seeds.ts'
import { ciRepos, commitFiles, pullRequestEnv, runCi } from '../helpers/ci-repo.ts'
import { k8, K8_HEADER, K8_MAINS_COPY, PASS } from '../helpers/messages.ts'
import { CI, REPO_ROOT } from '../helpers/paths.ts'

// The lock job's script, run the way locked-tests.yml runs it: from main's
// checkout, on a pull_request_target event, with the pull request's head
// there only as git objects (S3.3). It reads the head with git and runs
// nothing from it.

const scratch = ciRepos()

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Main with spec 001-demo's locked test, and the branch's changes committed on top. */
function pullRequest(files: Record<string, string>, seed: Record<string, string> = {}): { repo: ScratchRepo; head: string } {
  const repo = scratch({ seed: { ...lockedSeed(), ...seed } })
  const head = commitFiles(repo, 'test(001): change the demo', files)
  return { repo, head }
}

/** Runs a lock script from main's checkout, as the workflow does. */
function runFromMain(repo: ScratchRepo, head: string, script = CI.lock): RunResult {
  repo.gitOk(['switch', '--quiet', '--detach', 'origin/main'])
  const env = pullRequestEnv(repo, { title: 'test(001): change the demo', head, headRef: '002-demo', eventName: 'pull_request_target', action: 'opened' })
  const result = runCi(repo, script, env)
  expect(repo.gitOk(['rev-parse', 'HEAD']), "the checkout stays on main's commit").toBe(repo.gitOk(['rev-parse', 'origin/main']))
  expect(repo.gitOk(['status', '--porcelain', '--untracked-files=all']), 'the checkout is left as it was').toBe('')
  return result
}

/** Every file under the repo's scripts/ folder, as text, keyed by its repo path. */
function scriptsFolder(): Record<string, string> {
  const root = path.join(REPO_ROOT, 'scripts')
  const files: Record<string, string> = {}
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const file = path.join(entry.parentPath, entry.name)
    files[path.relative(REPO_ROOT, file).replaceAll('\\', '/')] = readFileSync(file, 'utf8')
  }
  return files
}

describe('K8: a locked test changed without its spec', () => {
  test("S3.3 FR-011 K8 a changed locked test fails the check, in the mock's words", () => {
    const { repo, head } = pullRequest({ [LOCKED_TEST]: 'export const demo = 2\n' })
    const result = runFromMain(repo, head)
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, k8(LOCKED_TEST, '001', LOCKED_SPEC))
  })

  test('S3.3 FR-011 K8 a changed tests.lock fails the check too', () => {
    const { repo, head } = pullRequest({ [LOCK_FILE]: `${sha256('export const demo = 2\n')}  ${LOCKED_TEST}\n` })
    const result = runFromMain(repo, head)
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, K8_HEADER), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, `  ${LOCK_FILE} is locked by spec 001.`), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, K8_MAINS_COPY), result.stdout).toBeGreaterThanOrEqual(0)
  })

  test('S3.3 FR-011 K8 a locked test changed along with its spec and a matching lock passes', () => {
    const text = 'export const demo = 2\n'
    const { repo, head } = pullRequest({
      [LOCKED_TEST]: text,
      [LOCKED_SPEC]: '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works twice.\n',
      [LOCK_FILE]: `${sha256(text)}  ${LOCKED_TEST}\n`,
    })
    const result = runFromMain(repo, head)
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.lock)
  })

  test("S3.3 FR-011 K8 a locked test changed with its spec fails while the head's tests.lock doesn't match it", () => {
    const { repo, head } = pullRequest({
      [LOCKED_TEST]: 'export const demo = 2\n',
      [LOCKED_SPEC]: '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works twice.\n',
    })
    const result = runFromMain(repo, head)
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, /^✖ lock {2}/), result.stdout).toBeGreaterThanOrEqual(0)
    expect(result.stdout).toContain(LOCKED_TEST)
  })

  test('S3.3 FR-011 a pull request that changes no locked file passes in one line', () => {
    const { repo, head } = pullRequest({ 'docs/notes.md': 'Notes.\n' })
    const result = runFromMain(repo, head)
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.lock)
  })

  test("S3.3 FR-011 a new spec's lock is checked against the head's files: a match passes and a mismatch fails", () => {
    const text = 'export const other = 1\n'
    const matching = pullRequest({
      'specs/009-other/spec.md': '# Spec 009: Another\n',
      'tests/009/unit/other.test.ts': text,
      'specs/009-other/tests.lock': `${sha256(text)}  tests/009/unit/other.test.ts\n`,
    })
    const passed = runFromMain(matching.repo, matching.head)
    expect(passed.status, describeRun(passed)).toBe(0)

    const stale = pullRequest({
      'specs/009-other/spec.md': '# Spec 009: Another\n',
      'tests/009/unit/other.test.ts': text,
      'specs/009-other/tests.lock': `${sha256('something else\n')}  tests/009/unit/other.test.ts\n`,
    })
    const failed = runFromMain(stale.repo, stale.head)
    expect(failed.status, describeRun(failed)).not.toBe(0)
    expect(failed.stdout).toContain('tests/009/unit/other.test.ts')
  })
})

describe("K8: the check is main's copy", () => {
  test("S3.3 FR-011 K8 a pull request that edits the lock check itself doesn't change the verdict, and its code never runs", () => {
    const main = scriptsFolder()
    expect(Object.keys(main)).toContain('scripts/ci/lock.ts')
    const { repo, head } = pullRequest(
      {
        [LOCKED_TEST]: 'export const demo = 2\n',
        'scripts/ci/lock.ts': [
          "import { writeFileSync } from 'node:fs'",
          "writeFileSync('ran-the-pull-request.txt', 'the head ran')",
          "console.log('✓ lock  nothing to check')",
          '',
        ].join('\n'),
      },
      main,
    )
    const result = runFromMain(repo, head, path.join(repo.dir, 'scripts', 'ci', 'lock.ts'))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, k8(LOCKED_TEST, '001', LOCKED_SPEC))
    expect(existsSync(path.join(repo.dir, 'ran-the-pull-request.txt'))).toBe(false)
    expect(existsSync(path.join(repo.sandbox.root, 'ran-the-pull-request.txt'))).toBe(false)
  })
})
