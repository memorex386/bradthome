import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { writeFile } from '../../001/helpers/repo.ts'
import type { RunResult } from '../../001/helpers/run.ts'
import { describeRun } from '../../001/helpers/run.ts'
import type { Sandbox } from '../../001/helpers/sandbox.ts'
import { createCiSandbox } from '../helpers/ci-repo.ts'
import { fixturePath, GITHUB, REPO_ROOT } from '../helpers/paths.ts'
import { jobsOf, readYaml, stepsOf, type Workflow } from '../helpers/workflows.ts'

// The types and tests jobs run the repo's own commands (S1.3, S3.6, K2). Here
// each job's command, as ci.yml writes it, runs in a scratch copy of the
// project with a planted failure, and fails. The scratch copy uses this
// checkout's installed packages, so nothing is downloaded.

const sandboxes: Sandbox[] = []
const links: string[] = []
afterEach(() => {
  // The link goes first, on its own, so removing the sandbox can never reach
  // this checkout's packages.
  for (const link of links.splice(0)) {
    try {
      rmdirSync(link)
    } catch {
      unlinkSync(link)
    }
  }
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

const PROJECT_FILES = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vitest.config.ts', '.nvmrc']

/** A scratch copy of the project's config, with no code and no tests of its own. */
function project(): { dir: string; sandbox: Sandbox } {
  const sandbox = createCiSandbox({ terms: false })
  sandboxes.push(sandbox)
  const dir = sandbox.path('project')
  mkdirSync(dir, { recursive: true })
  for (const file of PROJECT_FILES) {
    if (existsSync(path.join(REPO_ROOT, file))) copyFileSync(path.join(REPO_ROOT, file), path.join(dir, file))
  }
  // pnpm would otherwise install before running a script, into this
  // checkout's packages through the link.
  const workspace = path.join(dir, 'pnpm-workspace.yaml')
  writeFile(dir, 'pnpm-workspace.yaml', `${existsSync(workspace) ? readFileSync(workspace, 'utf8') : ''}\nverifyDepsBeforeRun: false\n`)
  symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'junction')
  links.push(path.join(dir, 'node_modules'))
  writeFile(dir, 'scripts/clean.ts', readFileSync(fixturePath('ci-jobs', 'clean.ts.txt'), 'utf8'))
  writeFile(dir, 'tests/900/unit/passing.test.ts', readFileSync(fixturePath('ci-jobs', 'passing.test.ts.txt'), 'utf8'))
  return { dir, sandbox }
}

/** The line of a job's steps that runs a command, as ci.yml writes it. */
function commandIn(jobId: string, pattern: RegExp): string {
  const job = jobsOf(readYaml<Workflow>(GITHUB.ci))[jobId]
  const lines = stepsOf(job)
    .flatMap((step) => (step.run ?? '').split('\n'))
    .map((line) => line.trim())
    .filter((line) => pattern.test(line))
  expect(lines, `${jobId} runs ${String(pattern)}`).toHaveLength(1)
  return lines[0] ?? ''
}

function runLine(line: string, dir: string, sandbox: Sandbox): RunResult {
  const result = spawnSync(line, {
    cwd: dir,
    env: sandbox.env,
    encoding: 'utf8',
    shell: true,
    timeout: 300_000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const TYPECHECK = /\bpnpm (?:run )?typecheck\b/
const TEST = /\bpnpm (?:run )?test(?![:\w-])/

describe('K2: types or tests fail', () => {
  test("S3.6 K2 the types job's command fails on a type error, and passes without one", () => {
    const line = commandIn('types', TYPECHECK)
    const { dir, sandbox } = project()
    const clean = runLine(line, dir, sandbox)
    expect(clean.status, describeRun(clean)).toBe(0)
    writeFile(dir, 'scripts/planted.ts', readFileSync(fixturePath('ci-jobs', 'type-error.ts.txt'), 'utf8'))
    const planted = runLine(line, dir, sandbox)
    expect(planted.status, describeRun(planted)).not.toBe(0)
  })

  test("S1.3 K2 the tests job's command fails on a failing test, and passes without one", () => {
    const line = commandIn('tests', TEST)
    const { dir, sandbox } = project()
    const clean = runLine(line, dir, sandbox)
    expect(clean.status, describeRun(clean)).toBe(0)
    writeFile(dir, 'tests/900/unit/failing.test.ts', readFileSync(fixturePath('ci-jobs', 'failing.test.ts.txt'), 'utf8'))
    const planted = runLine(line, dir, sandbox)
    expect(planted.status, describeRun(planted)).not.toBe(0)
  })

  test("S1.3 K2 a test that fails only on Windows fails the tests job on Windows and passes it on Linux", () => {
    const line = commandIn('tests', TEST)
    const { dir, sandbox } = project()
    writeFile(dir, 'tests/900/unit/windows-only.test.ts', readFileSync(fixturePath('ci-jobs', 'windows-only.test.ts.txt'), 'utf8'))
    const result = runLine(line, dir, sandbox)
    if (process.platform === 'win32') expect(result.status, describeRun(result)).not.toBe(0)
    else expect(result.status, describeRun(result)).toBe(0)
  })
})
