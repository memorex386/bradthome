import { createHash } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createLayout, type Layout } from '../helpers/layout.ts'
import { SCRIPTS } from '../helpers/paths.ts'
import { describeRun, runNode, type RunResult } from '../helpers/run.ts'
import { createSandbox, type Sandbox } from '../helpers/sandbox.ts'

// pnpm lock <spec-dir> [--check], run as `node scripts/lock-tests.ts` from the
// root of a scratch folder laid out like the repo.

const SPEC = 'specs/007-demo'

const TEST_FILES: Record<string, string> = {
  'tests/007/unit/a.test.ts': 'export const a = 1\n',
  'tests/007/unit/B.test.ts': 'export const b = 2\n',
  'tests/007/helpers/scratch.ts': 'export const scratch = true\n',
  'tests/007/fixtures/data.txt': 'made-up data\r\nwith a CRLF line\n',
  'tests/007/fixtures/.gitkeep': '',
  'tests/007/frozen-cases/F1-demo/change.diff': '--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-old\n+new\n',
  'tests/007/frozen-cases/F1-demo/files/.claude/hooks/x.ts': 'export {}\n',
}

const OTHER_FILES: Record<string, string> = {
  [`${SPEC}/spec.md`]: '# Spec 007: Demo\n',
  'tests/008/unit/other.test.ts': 'export const other = 3\n',
  'tests/README.md': 'Tests live in a folder per spec.\n',
}

interface Fixture {
  where: Layout
  lock(...args: string[]): RunResult
}

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const created of sandboxes.splice(0)) created.cleanup()
})

function fixture(): Fixture {
  const sandbox = createSandbox()
  sandboxes.push(sandbox)
  const where = createLayout(sandbox, { ...TEST_FILES, ...OTHER_FILES })
  return { where, lock: (...args) => runNode(SCRIPTS.lock, [SPEC, ...args], { cwd: where.root, env: sandbox.env }) }
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function byteOrder(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a), Buffer.from(b))
}

function expectedLock(where: Layout, files: readonly string[]): string {
  return [...files]
    .sort(byteOrder)
    .map((file) => `${sha256(path.join(where.root, file))}  ${file}\n`)
    .join('')
}

function lockText(where: Layout): Buffer {
  return readFileSync(path.join(where.root, SPEC, 'tests.lock'))
}

describe('pnpm lock', () => {
  test("S3.5 FR-012 writes one SHA-256 and path line for every file in the spec's test folder, in byte order", () => {
    const { where, lock } = fixture()
    const result = lock()
    expect(result.status, describeRun(result)).toBe(0)
    expect(lockText(where).toString('utf8')).toBe(expectedLock(where, Object.keys(TEST_FILES)))
  })

  test('S3.5 FR-012 writes the same tests.lock, byte for byte, when it runs twice with no change', () => {
    const { where, lock } = fixture()
    expect(lock().status).toBe(0)
    const first = lockText(where)
    expect(lock().status).toBe(0)
    expect(lockText(where).equals(first)).toBe(true)
    expect(first.includes(Buffer.from('\r'))).toBe(false)
  })

  test("FR-012 lists only the spec's own test folder", () => {
    const { where, lock } = fixture()
    expect(lock().status).toBe(0)
    const text = lockText(where).toString('utf8')
    expect(text).not.toContain('tests/008/')
    expect(text).not.toContain('tests/README.md')
    expect(text).not.toContain('spec.md')
  })

  test('FR-012 --check passes while the lock matches, and names each file that changed, appeared or went missing', () => {
    const { where, lock } = fixture()
    expect(lock().status).toBe(0)
    const clean = lock('--check')
    expect(clean.status, describeRun(clean)).toBe(0)

    where.write('tests/007/unit/a.test.ts', 'export const a = 10\n')
    where.stage()
    const changed = lock('--check')
    expect(changed.status).not.toBe(0)
    expect(changed.stdout + changed.stderr).toContain('tests/007/unit/a.test.ts')

    where.write('tests/007/unit/new.test.ts', 'export const fresh = 4\n')
    where.stage()
    const appeared = lock('--check')
    expect(appeared.status).not.toBe(0)
    expect(appeared.stdout + appeared.stderr).toContain('tests/007/unit/new.test.ts')

    rmSync(path.join(where.root, 'tests/007/helpers/scratch.ts'))
    where.stage()
    const missing = lock('--check')
    expect(missing.status).not.toBe(0)
    expect(missing.stdout + missing.stderr).toContain('tests/007/helpers/scratch.ts')
  })
})
