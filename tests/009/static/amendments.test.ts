import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { FILES, read, repoPath, withoutMotionBlocks } from '../helpers/ds.ts'

// Spec 003's motion rule (S7.1, FR-015, D122) and the docs (FR-017).

const MOTION = /@keyframes|\banimation(?:-name)?\s*:|\btransition(?:-property)?\s*:/

function lockCheck(spec: string): { status: number | null; out: string } {
  const result = spawnSync(process.execPath, [repoPath('scripts', 'lock-tests.ts'), `specs/${spec}`, '--check'], { cwd: repoPath(), encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout}${result.stderr}` }
}

describe("spec 003's motion rule", () => {
  test('S7.1 FR-015 motion inside a no-preference query passes the rule, and motion anywhere else fails it', () => {
    expect(withoutMotionBlocks('@media (prefers-reduced-motion: no-preference) { a { transition: color 1s } }').still).not.toMatch(MOTION)
    expect(withoutMotionBlocks('a { transition: color 1s }').still).toMatch(MOTION)
    expect(withoutMotionBlocks('@media (prefers-reduced-motion: reduce) { a { animation: spin 1s } }').still).toMatch(MOTION)
    expect(withoutMotionBlocks('@media (prefers-reduced-motion: no-preference) { a { color: red } } b { transition: x 1s }').still).toMatch(MOTION)
  })

  test("S7.1 FR-015 spec 003's S1.5 and its static check say so, with D122, and spec 003 is relocked", () => {
    expect(read(FILES.spec003)).toMatch(/\*\*S1\.5\*\*[^\n]*prefers-reduced-motion: no-preference[^\n]*D122/)
    const check = read(FILES.test003)
    expect(check).toMatch(/S1\.5 nothing moves with reduced motion on/)
    expect(check).toMatch(/function stillSource/)
    const lock = lockCheck('003-skeleton-and-pipeline')
    expect(lock.status, lock.out).toBe(0)
  })

  test("FR-014 spec 002 names next.yml's deploy job among the writes it allows, with D123, and is relocked", () => {
    expect(read(repoPath('specs', '002-ci-and-rulesets', 'spec.md'))).toMatch(/`next\.yml` deploy job MAY hold `id-token: write`[^\n]*D123/)
    expect(read(repoPath('tests', '002', 'static', 'workflows.test.ts'))).toMatch(/'next\.yml': \{ deploy: \{ 'id-token': 'write' \} \}/)
    const lock = lockCheck('002-ci-and-rulesets')
    expect(lock.status, lock.out).toBe(0)
  })
})

describe('the docs', () => {
  test('FR-017 AGENTS.md names the next workflow and the gallery', () => {
    const agents = read(FILES.agents)
    expect(agents).toMatch(/\*\*next\*\*[^\n]*`next` channel/)
    expect(agents).toMatch(/\/design-system/)
    expect(agents).toMatch(/components\/ds/)
  })

  test('FR-017 the release runbook says how a v1.x fix ships while main holds phase 3 work (D120)', () => {
    const release = read(FILES.release)
    expect(release).toMatch(/D120/)
    expect(release).toMatch(/v1\.x/)
    expect(release).toMatch(/next/)
  })

  test("FR-017 the plan marks slice 3.1's design system and names the gallery", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.1 Design system \|[^\n]*\/design-system/)
  })
})
