import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { REPO_ROOT } from '../helpers/fake-cloud.ts'

// The runbook, the records, the locked specs' amendments and the rehearsal's
// evidence (spec 008, issue #29: S2.3, S4.1, S4.2, FR-008, FR-009, SC-001 to
// SC-003).

const read = (...parts: string[]): string => {
  const file = path.join(REPO_ROOT, ...parts)
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

describe('the runbook', () => {
  const runbook = (): string => read('docs', 'release.md')

  test('S4.1 FR-009 docs/release.md covers releasing, the check, three ways to roll back, and v0 as the fallback', () => {
    const text = runbook()
    expect(text).toMatch(/^# /m)
    for (const needed of [
      'release.yml',
      'rollback.yml',
      'pnpm release:rollback',
      'pnpm release:check',
      'Firebase console',
      'production',
      'v0',
    ]) {
      expect(text, needed).toContain(needed)
    }
  })

  test('FR-009 the runbook says how to tell which version is live', () => {
    expect(runbook()).toContain('pnpm release:status')
    expect(JSON.parse(read('package.json')).scripts).toMatchObject({
      'release:status': 'node scripts/release/status.ts',
      'release:rollback': 'node scripts/release/rollback.ts',
      'release:check': 'node scripts/release/check.ts',
    })
  })

  test('S4.2 the runbook records the release: a vX.Y.Z tag on main and a GitHub release', () => {
    const text = runbook()
    expect(text).toMatch(/git tag -s v\d+\.\d+\.\d+/)
    expect(text).toMatch(/gh release create/)
  })

  test('S4.1 the runbook names no machine path, billing account or personal address', () => {
    const text = runbook()
    expect(text).not.toMatch(/[A-Z]:\\|\/Users\/|billingAccounts\/|@gmail\.com/)
  })
})

describe('the records', () => {
  test('FR-008 D113 and D114 are recorded and indexed, and AGENTS.md lists the two workflows', () => {
    const records = readdirSync(path.join(REPO_ROOT, 'docs', 'decisions'))
    expect(records.some((file) => file.startsWith('0113-'))).toBe(true)
    expect(records.some((file) => file.startsWith('0114-'))).toBe(true)
    const index = read('docs', 'decisions', 'README.md')
    expect(index).toMatch(/0113-/)
    expect(index).toMatch(/0114-/)
    const agents = read('AGENTS.md')
    expect(agents).toMatch(/release \/ /)
    expect(agents).toMatch(/rollback/)
  })

  test("FR-008 spec 002's FR-014 and spec 003's S3.5 and FR-017 name spec 008's release jobs, citing D114", () => {
    const two = read('specs', '002-ci-and-rulesets', 'spec.md')
    const three = read('specs', '003-skeleton-and-pipeline', 'spec.md')
    expect(two).toMatch(/FR-014[^\n]*spec 008[^\n]*0114-/)
    expect(three).toMatch(/\*\*S3\.5\*\*[^\n]*spec 008/)
    expect(three).toMatch(/FR-017[^\n]*spec 008/)
    expect(read('tests', '002', 'static', 'workflows.test.ts')).toMatch(/'release\.yml'/)
    expect(read('tests', '003', 'static', 'preview.test.ts')).toMatch(/release\.yml/)
  })
})

describe('the rehearsal', () => {
  const evidence = (): string => read('docs', 'releases', 'rehearsal.md')

  test('S2.3 SC-002 ran on preview channels, never live: release A, release B, roll back, and the served files matched A', () => {
    const text = evidence()
    expect(text).toMatch(/^# /m)
    const channels = [...text.matchAll(/channel `([^`]+)`/g)].map((match) => match[1])
    expect(channels.length).toBeGreaterThan(0)
    expect(channels).not.toContain('live')
    const a = /version A: `([0-9a-f]{16})`/.exec(text)?.[1]
    const b = /version B: `([0-9a-f]{16})`/.exec(text)?.[1]
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
    expect(text).toMatch(new RegExp(`✓ release .*${b ?? 'missing'}`))
    expect(text).toMatch(new RegExp(`✓ rollback .*${a ?? 'missing'}.* is served`))
    expect(text).toMatch(/as `release-deployer@/)
  })

  test("SC-003 the rehearsal's rollback was served within 10 minutes of starting", () => {
    const seconds = Number(/rollback served after (\d+) s/.exec(evidence())?.[1] ?? 'NaN')
    expect(seconds).toBeGreaterThanOrEqual(0)
    expect(seconds).toBeLessThan(600)
  })

  test('SC-001 the runbook has the cutover check against v0, and the production record, once written, shows both passed', () => {
    expect(read('docs', 'release.md')).toMatch(
      /pnpm release:check --live https:\/\/bradthome--v0-[^ ]* --candidate https:\/\/bradthome\.com/,
    )
    // SC-001 itself is met only at the production release, after the merge.
    // Its evidence goes in docs/releases/v1.0.0.md, in the follow-up pull request.
    const record = read('docs', 'releases', 'v1.0.0.md')
    if (record === '') return
    expect(record).toMatch(/✓ release {2}version [0-9a-f]{16} is served on live at https:\/\/bradthome\.com/)
    expect(record).toMatch(/✓ check {2}https:\/\/bradthome\.com serves every URL/)
  })
})
