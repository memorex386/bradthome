import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { REPO_ROOT } from '../helpers/fake-cloud.ts'

// Spec 008 is a light change, so its spec is issue #29, not a spec folder the
// trace job reads. This test is its trace: every ID the issue names leads at
// least one test name in tests/008.

const IDS = [
  ...['S1.1', 'S1.2', 'S1.3', 'S1.4', 'S2.1', 'S2.2', 'S2.3', 'S3.1', 'S3.2', 'S3.3', 'S3.4', 'S3.5', 'S4.1', 'S4.2'],
  ...Array.from({ length: 9 }, (_, index) => `FR-00${index + 1}`),
  ...['SC-001', 'SC-002', 'SC-003'],
]

function testNames(): string[] {
  const dir = path.join(REPO_ROOT, 'tests', '008')
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .flatMap((entry) =>
      [...readFileSync(path.join(entry.parentPath, entry.name), 'utf8').matchAll(/\btest\(\s*(['"`])(.*?)\1/g)].map(
        (match) => match[2] ?? '',
      ),
    )
}

describe('trace', () => {
  test('every ID in issue #29 leads a test name', () => {
    const names = testNames()
    const leading = (name: string): string[] =>
      name
        .match(/^(?:(?:S\d+\.\d+|FR-\d{3}|SC-\d{3}|D\d+|V\d+)\s+)+/)?.[0]
        .trim()
        .split(/\s+/) ?? []
    const covered = new Set(names.flatMap(leading))
    expect(IDS.filter((id) => !covered.has(id))).toEqual([])
  })
})
