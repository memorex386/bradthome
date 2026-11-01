import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { REPO_ROOT, repoPath, SCRIPTS, SPEC_DIR, TESTS_DIR } from '../helpers/paths.ts'
import { describeRun, runNode } from '../helpers/run.ts'
import { createSandbox } from '../helpers/sandbox.ts'
import { idsLeadingTestNames, testFilesUnder, testNamesIn } from '../helpers/test-names.ts'

// Coverage of spec 001, and the locks of every spec that has locked tests.

const SPECS_DIR = repoPath('specs')

/**
 * The spec folders that have a tests.lock, such as 001-hooks-and-agent-rules.
 * Spec 001's is always among them, so no check here passes for want of a lock.
 */
function lockedSpecs(): string[] {
  const specs = readdirSync(SPECS_DIR)
    .filter((name) => existsSync(path.join(SPECS_DIR, name, 'tests.lock')))
    .sort()
  expect(specs).toContain('001-hooks-and-agent-rules')
  return specs
}

function testFolderOf(spec: string): string {
  const number = /^(\d{3})-/.exec(spec)?.[1]
  if (number === undefined) throw new Error(`${spec} has no spec number`)
  return path.join('tests', number)
}

/** The files git sees under a folder: tracked, or new and not ignored. */
function filesGitSees(folder: string): string[] {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', folder], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(result.stderr)
  return [...new Set(result.stdout.split('\0').filter((file) => file !== ''))].sort()
}

function byteOrder(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b))
}

describe('coverage', () => {
  test('SC-001 each of the 29 states in the mocks leads at least one test name', () => {
    const mocks = readFileSync(path.join(SPEC_DIR, 'mocks', 'README.md'), 'utf8')
    const states = [...mocks.matchAll(/^\| \[([A-Z]\d+)\]\(#[a-z0-9]+\) \|/gm)].map((match) => match[1] ?? '')
    expect(states).toHaveLength(29)
    const covered = idsLeadingTestNames(TESTS_DIR)
    expect(states.filter((state) => !covered.has(state))).toEqual([])
  })

  test('SC-001 FR-013 every S, FR and SC ID in spec 001 leads at least one test name', () => {
    const spec = readFileSync(path.join(SPEC_DIR, 'spec.md'), 'utf8')
    const ids = [...spec.matchAll(/\*\*(S\d+\.\d+|FR-\d{3}|SC-\d{3})\*\*/g)].map((match) => match[1] ?? '')
    expect(new Set(ids).size).toBe(81)
    const covered = idsLeadingTestNames(TESTS_DIR)
    expect(ids.filter((id) => !covered.has(id))).toEqual([])
  })

  test('SC-001 every test name in spec 001 starts with the IDs it covers', () => {
    for (const file of testFilesUnder(TESTS_DIR)) {
      for (const name of testNamesIn(readFileSync(file, 'utf8'))) {
        expect(name, path.relative(TESTS_DIR, file)).toMatch(/^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3}|[GSCE]\d+) /)
      }
    }
  })
})

describe('locks', () => {
  test("FR-011 FR-012 every spec's tests.lock matches the files in its test folder", () => {
    for (const spec of lockedSpecs()) {
      const lock = readFileSync(path.join(SPECS_DIR, spec, 'tests.lock'), 'utf8')
      expect(lock.includes('\r'), `${spec}'s lock has CRLF line endings`).toBe(false)
      expect(lock.endsWith('\n'), `${spec}'s lock ends with a newline`).toBe(true)
      const entries = lock
        .slice(0, -1)
        .split('\n')
        .map((line) => {
          const match = /^([0-9a-f]{64}) {2}(\S(?:.*\S)?)$/.exec(line)
          if (match === null) throw new Error(`${spec}'s lock has a malformed line: ${line}`)
          return { hash: match[1] ?? '', file: match[2] ?? '' }
        })
      const listed = entries.map((entry) => entry.file)
      expect(listed, `${spec}'s lock is in byte order`).toEqual([...listed].sort(byteOrder))
      expect(listed, `${spec}'s lock lists every file in its test folder`).toEqual(
        filesGitSees(testFolderOf(spec)).sort(byteOrder),
      )
      for (const entry of entries) {
        const actual = createHash('sha256').update(readFileSync(repoPath(entry.file))).digest('hex')
        expect(actual, `${entry.file} changed since it was locked`).toBe(entry.hash)
      }
    }
  })

  test('S3.5 FR-012 the lock script reproduces each tests.lock byte for byte', () => {
    const sandbox = createSandbox()
    try {
      for (const spec of lockedSpecs()) {
        const root = mkdtempSync(path.join(sandbox.root, 'relock-'))
        mkdirSync(path.join(root, 'specs', spec), { recursive: true })
        cpSync(path.join(SPECS_DIR, spec, 'spec.md'), path.join(root, 'specs', spec, 'spec.md'))
        for (const file of filesGitSees(testFolderOf(spec))) {
          mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
          cpSync(repoPath(file), path.join(root, file))
        }
        for (const args of [['init', '--quiet'], ['add', '--all']]) {
          expect(spawnSync('git', args, { cwd: root, env: sandbox.env }).status).toBe(0)
        }
        const result = runNode(SCRIPTS.lock, [`specs/${spec}`], { cwd: root, env: sandbox.env })
        expect(result.status, describeRun(result)).toBe(0)
        const made = readFileSync(path.join(root, 'specs', spec, 'tests.lock'))
        expect(made.equals(readFileSync(path.join(SPECS_DIR, spec, 'tests.lock'))), spec).toBe(true)
      }
    } finally {
      sandbox.cleanup()
    }
  })

  test('FR-012 pnpm lock --check passes on every spec with locked tests', () => {
    for (const spec of lockedSpecs()) {
      const result = runNode(SCRIPTS.lock, [`specs/${spec}`, '--check'], { cwd: REPO_ROOT, env: process.env })
      expect(result.status, `${spec}\n${describeRun(result)}`).toBe(0)
    }
  })

  test('FR-013 pnpm trace passes on every spec with locked tests', () => {
    for (const spec of lockedSpecs()) {
      const result = runNode(SCRIPTS.trace, [`specs/${spec}`], { cwd: REPO_ROOT, env: process.env })
      expect(result.status, `${spec}\n${describeRun(result)}`).toBe(0)
    }
  })
})
