import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { repoPath } from '../helpers/serve.ts'

// Spec 043's records: spec 003's FR-012 and its relocked test read 2.0 s
// again, D30's note says why, D245 and D246 are indexed, slice 5.16 is in the
// plan, AGENTS.md says how Lighthouse is served, and the plan records the
// runs that SC-001, S2.3, S2.4 and S3.2 are measured by (FR-006).

const read = (...parts: string[]): string => readFileSync(repoPath(...parts), 'utf8')
const SPEC_003 = ['specs', '003-skeleton-and-pipeline']
const LOCKED = 'tests/003/static/lighthouse.test.ts'

describe("spec 043's records", () => {
  test("S2.2 FR-006 spec 003's locked Lighthouse test reads 2,000 ms, and its lock matches it", () => {
    const text = read(LOCKED)
    expect(text).toMatch(/\['largest-contentful-paint', 'maxNumericValue', 2000\]/)
    expect(text).not.toMatch(/2100/)
    const hash = createHash('sha256')
      .update(readFileSync(repoPath(LOCKED)))
      .digest('hex')
    expect(read(...SPEC_003, 'tests.lock')).toContain(`${hash}  ${LOCKED}`)
  })

  test("S2.2 FR-006 spec 003's FR-012 reads 2.0 s again, and its change note names spec 043", () => {
    const spec = read(...SPEC_003, 'spec.md')
    const fr = spec.split('\n').find((line) => line.startsWith('- **FR-012**')) ?? ''
    expect(fr).toMatch(/LCP 2\.0 s/)
    expect(fr).not.toMatch(/2\.1 s/)
    expect(spec).toMatch(
      /Changed in spec 043 \(slice 5\.16\), on 2026-11-18:[^\n]*2\.0 s[^\n]*0245-lighthouse-ci-serves-the-build-as-firebase-does/,
    )
  })

  test("FR-006 D30's note says the budget is 2.0 s again, and D245 and D246 are indexed", () => {
    expect(read('docs', 'decisions', '0030-success-criteria-for-quality-and-process.md')).toMatch(/2026-11-18[^\n]*2\.0 s[^\n]*D245/)
    const index = read('docs', 'decisions', 'README.md')
    expect(index).toContain('| [0245](0245-lighthouse-ci-serves-the-build-as-firebase-does.md) |')
    expect(index).toContain('| [0246](0246-a-byte-budget-for-the-homes-html.md) |')
    for (const name of ['0245-lighthouse-ci-serves-the-build-as-firebase-does.md', '0246-a-byte-budget-for-the-homes-html.md'])
      expect(read('docs', 'decisions', name)).toMatch(/^status: accepted$/m)
  })

  test('FR-006 the plan lists slice 5.16, and AGENTS.md says Lighthouse loads the build as Firebase serves it', () => {
    expect(read('docs', 'plan.md')).toMatch(/^\| 5\.16 [^\n]*spec 043/m)
    const line =
      read('AGENTS.md')
        .split('\n')
        .find((text) => text.startsWith('- **ci / lighthouse:**')) ?? ''
    expect(line).toMatch(/brotli/)
    expect(line).toMatch(/scripts\/site\/serve\.ts/)
  })

  const measured = (): string =>
    read('specs', '043-lighthouse-as-served', 'plan.md').split('## Measured on this build')[1]?.split('\n## ')[0] ?? ''
  const item = (id: string): string =>
    measured()
      .split('\n')
      .find((line) => line.startsWith(`- **${id}`)) ?? ''

  test("SC-001 the plan records the home's median LCP at 2,000 ms or less in each local run", () => {
    const medians = [...item('SC-001').matchAll(/median of ([\d,]+) ms/g)].map((match) => Number((match[1] ?? '').replaceAll(',', '')))
    expect(medians.length).toBeGreaterThan(0)
    for (const median of medians) expect(median).toBeLessThanOrEqual(2000)
  })

  test("SC-002 S2.4 S3.2 the plan records production's bytes and both planted failures", () => {
    expect(item('SC-002')).toMatch(/13,099/)
    expect(item('S3.2')).toMatch(/over the 14,000-byte budget/)
    expect(item('S2.4')).toMatch(/largest-contentful-paint 2\.\d s, budget 2\.0 s/)
  })

  test("S2.3 every budget passing is main's lighthouse job, and the plan says so until it records the run", () => {
    expect(item('S2.3')).toMatch(/open until main's run|main's lighthouse job[^\n]*every budget met/)
  })
})
