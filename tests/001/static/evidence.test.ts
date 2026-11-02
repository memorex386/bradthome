import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { SPEC_DIR } from '../helpers/paths.ts'

// The evidence from real runs that the build commits under
// specs/001-hooks-and-agent-rules/evidence/ (D78).

const EVIDENCE_DIR = path.join(SPEC_DIR, 'evidence')
// A drive letter that starts a path, such as C:\ or C:/, but not the s:/ in https://.
const MACHINE_PATH = /(?<![A-Za-z])[A-Za-z]:[\\/]|\/Users\/|\/home\//

interface ReviewEval {
  model?: string
  claudeCodeVersion?: string
  cases?: { id?: string; found?: number; runs?: number; invalid?: number; flags?: unknown[] }[]
  found?: number
  total?: number
  targetMet?: boolean
}

function version(text: string | undefined): [number, number, number] {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(text ?? '')
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0), Number(match?.[3] ?? 0)]
}

function atLeast(actual: [number, number, number], wanted: [number, number, number]): boolean {
  for (let i = 0; i < 3; i += 1) {
    if ((actual[i] ?? 0) !== (wanted[i] ?? 0)) return (actual[i] ?? 0) > (wanted[i] ?? 0)
  }
  return true
}

describe('the frozen-case report', () => {
  const text = readFileSync(path.join(EVIDENCE_DIR, 'review-eval.json'), 'utf8')
  const report = JSON.parse(text) as ReviewEval

  test('SC-004 the reviewer found the planted bug in at least 12 of 15 runs, and 2 of 3 for every case', () => {
    expect(report.model).toBe('claude-opus-5-5')
    expect(atLeast(version(report.claudeCodeVersion), [2, 1, 280]), report.claudeCodeVersion).toBe(true)
    const cases = report.cases ?? []
    expect(cases.map((c) => c.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5'])
    for (const c of cases) {
      expect(c.runs, c.id).toBe(3)
      expect(c.found ?? 0, c.id).toBeGreaterThanOrEqual(2)
      expect((c.found ?? 0) + (c.invalid ?? 0), c.id).toBeLessThanOrEqual(c.runs ?? 0)
    }
    expect(report.total).toBe(15)
    expect(report.found).toBe(cases.reduce((sum, c) => sum + (c.found ?? 0), 0))
    expect(report.found ?? 0).toBeGreaterThanOrEqual(12)
    expect(report.targetMet).toBe(true)
  })

  test('S6.3 FR-024 SC-004 every counted review named a file, a line and an ID for each finding, and gave no verdict', () => {
    for (const c of report.cases ?? []) {
      expect(c.flags, `${c.id}'s flags`).toEqual([])
    }
  })

  test('SC-004 the report holds no machine paths', () => {
    expect(text).not.toMatch(MACHINE_PATH)
  })
})

describe('the real-session checks', () => {
  const text = readFileSync(path.join(EVIDENCE_DIR, 'claude-code-checks.md'), 'utf8')
  const EXPECTED: Record<string, RegExp> = {
    C0: /\b(?:allowed|ran|passed)\b/i,
    C1: /\b(?:denied|blocked)\b/i,
    C2: /\b(?:denied|blocked)\b/i,
    C3: /\b(?:denied|blocked)\b/i,
    C4: /\blogged\b/i,
    C5: /\b(?:denied|blocked)\b/i,
    C6: /\b(?:denied|blocked)\b/i,
    C7: /\b(?:sent (?:the agent )?back|blocked)\b/i,
    C8: /\b(?:denied|blocked)\b/i,
    C9: /\b(?:asked|prompted)\b/i,
  }

  test('SC-006 each Claude Code state from C0 to C9 was tried in a real session, and its result recorded', () => {
    for (const [state, result] of Object.entries(EXPECTED)) {
      const rows = text.split(/\r?\n/).filter((line) => new RegExp(`^\\|\\s*\\**${state}\\**\\s*\\|`).test(line))
      expect(rows.length, `${state} has a row`).toBeGreaterThan(0)
      expect(rows.some((row) => result.test(row)), `${state}'s row records its result`).toBe(true)
    }
  })

  test("SC-006 S5.3 the C7 check records that Claude Code's limit ended the turn", () => {
    const rows = text.split(/\r?\n/).filter((line) => /^\|\s*\**C7\**\s*\|/.test(line))
    expect(rows.some((row) => /\blimit\b/i.test(row)), 'the C7 row mentions the limit').toBe(true)
  })

  test('SC-006 the checks record the Claude Code version, the permission mode and the date', () => {
    expect(atLeast(version(/Claude Code\D{0,40}(\d+\.\d+\.\d+)/.exec(text)?.[1]), [2, 1, 272])).toBe(true)
    expect(text).toMatch(/\bbypass/i)
    expect(text).toMatch(/\b20\d{2}-\d{2}-\d{2}\b/)
  })

  test('SC-006 the checks hold no machine paths', () => {
    expect(text).not.toMatch(MACHINE_PATH)
  })
})
