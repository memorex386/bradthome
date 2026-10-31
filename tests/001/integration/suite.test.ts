import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { REPO_ROOT, repoPath, slash } from '../helpers/paths.ts'
import { describeRun, run, runNode } from '../helpers/run.ts'

// The suite itself: every locked test runs, in the project the Stop hook or CI
// runs it in, and the suite runs where the checks must run.

interface Listed {
  file: string
  projectName: string
}

/** Every file a spec's tests.lock lists, from the repo's root. Spec 001's lock is always there. */
function lockedFiles(): string[] {
  const specs = repoPath('specs')
  const locked = readdirSync(specs).filter((spec) => existsSync(path.join(specs, spec, 'tests.lock')))
  expect(locked).toContain('001-hooks-and-agent-rules')
  return locked
    .flatMap((spec) =>
      readFileSync(path.join(specs, spec, 'tests.lock'), 'utf8')
        .split('\n')
        .map((line) => /^[0-9a-f]{64} {2}(.+)$/.exec(line)?.[1])
        .filter((file): file is string => file !== undefined),
    )
}

describe('the suite', () => {
  test('FR-011 every locked test file is in a Vitest project, so none can drop out of the run', () => {
    const result = runNode(repoPath('node_modules', 'vitest', 'vitest.mjs'), ['list', '--filesOnly', '--json'], {
      cwd: REPO_ROOT,
      env: process.env,
    })
    expect(result.status, describeRun(result)).toBe(0)
    const listed = JSON.parse(result.stdout.slice(result.stdout.indexOf('['))) as Listed[]
    const projects = new Map(listed.map((entry) => [slash(path.relative(REPO_ROOT, entry.file)), entry.projectName]))
    const tests = lockedFiles().filter((file) => file.endsWith('.test.ts'))
    expect(tests.length).toBeGreaterThan(0)
    for (const file of tests) {
      const expected = /\/integration\//.test(file) ? 'integration' : 'unit'
      expect(projects.get(file), file).toBe(expected)
    }
  })

  test("FR-011 FR-022 the unit project is what pnpm test:unit runs, and so what the Stop hook runs", () => {
    const pkg = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.['test:unit'] ?? '').toMatch(/--project[ =]unit\b/)
  })

  test('FR-011 no locked test is skipped, focused or left as a todo', () => {
    for (const file of lockedFiles().filter((name) => name.endsWith('.test.ts'))) {
      const source = readFileSync(repoPath(file), 'utf8')
      expect(source, file).not.toMatch(/\b(?:test|it|describe)\.(?:skip|only|todo|skipIf|runIf|fails)\b/)
      expect(source, file).not.toMatch(/\bx(?:it|test|describe)\(/)
    }
  })

  test('FR-029 the checks run here on Windows with Git for Windows, or on Linux', () => {
    expect(['win32', 'linux']).toContain(process.platform)
    const version = run('git', ['--version'], { cwd: REPO_ROOT, env: process.env })
    expect(version.status).toBe(0)
    if (process.platform === 'win32') expect(version.stdout).toMatch(/windows/i)
  })
})
