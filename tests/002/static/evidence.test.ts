import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { SPEC_DIR } from '../helpers/paths.ts'

// The evidence of real runs on GitHub, which only GitHub can show (D78, D82).
// The build records it in specs/002-ci-and-rulesets/evidence/ci-runs.md, in
// this shape:
//
//   ## Planted failures
//   | State | Planted | Failing job | Required check | First try | Run |
//   one row per planted failure, in the private sandbox repo. The required
//   check is ci / gate: failure, or locked-tests / lock: failure for K8, since
//   the lock check runs in its own workflow beside the gate
//
//   ## Other runs
//   | State | What | Result | Run |
//   K0 for this pull request's own run, and S1.5 for the run a newer push cancelled
//
//   ## Timings
//   | Run | From push to gate |
//
//   ## Log sweep
//   one line saying how many logs from how many runs were swept, with no
//   made-up term and no unmasked address found
//
//   ## Minutes
//   the cost of a run, and a month's projection inside the free plan's $12
//
// A Run cell is a Markdown link to the run on GitHub.

const FILE = path.join(SPEC_DIR, 'evidence', 'ci-runs.md')
const SANDBOX_RUN = /\]\(https:\/\/github\.com\/bradthome-agent\/bradthome-ci-sandbox\/actions\/runs\/\d+(?:\/job\/\d+)?\)/
const THIS_REPO_RUN = /\]\(https:\/\/github\.com\/memorex386\/bradthome\/actions\/runs\/\d+(?:\/job\/\d+)?\)/
const ANY_RUN = /\]\(https:\/\/github\.com\/(?:bradthome-agent\/bradthome-ci-sandbox|memorex386\/bradthome)\/actions\/runs\/\d+(?:\/job\/\d+)?\)/

function evidence(): string {
  return readFileSync(FILE, 'utf8')
}

function section(heading: string): string {
  const lines = evidence().split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === heading)
  expect(start, `${heading} in ${path.basename(FILE)}`).toBeGreaterThanOrEqual(0)
  const end = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line))
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n')
}

/** A section's table rows, as trimmed cells, without the header and divider rows. */
function rows(heading: string, columns: readonly string[]): string[][] {
  const table = section(heading)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
  expect(table[0], `${heading} header`).toEqual([...columns])
  return table.slice(2)
}

const PLANTED = ['State', 'Planted', 'Failing job', 'Required check', 'First try', 'Run'] as const
const STORIES_1_TO_3 = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10']

describe('planted failures in the sandbox', () => {
  test('SC-001 every planted failure in Stories 1 to 3 failed the gate on the first try, with a link to its run', () => {
    const planted = rows('## Planted failures', PLANTED)
    expect(planted.length).toBeGreaterThanOrEqual(STORIES_1_TO_3.length + 1)
    for (const state of STORIES_1_TO_3) expect(planted.some((row) => row[0] === state), state).toBe(true)
    for (const row of planted) {
      const [state = '', , jobName = '', required = '', firstTry = '', run = ''] = row
      expect(STORIES_1_TO_3, row.join(' | ')).toContain(state)
      expect(jobName, state).not.toBe('')
      expect(required, `${state}: the required check`).toBe(state === 'K8' ? 'locked-tests / lock: failure' : 'ci / gate: failure')
      expect(firstTry, `${state}: on the first try`).toBe('yes')
      expect(run, state).toMatch(SANDBOX_RUN)
    }
  })

  test("SC-001 K2's rows show a type error and a test that fails only on Windows, each failing its own job", () => {
    const k2 = rows('## Planted failures', PLANTED).filter((row) => row[0] === 'K2')
    expect(k2.map((row) => row[2]).sort()).toEqual(['tests (windows-2025)', 'types'])
  })

  test("SC-001 K8 failed the lock check, which runs beside the gate from the sandbox's default branch", () => {
    const k8 = rows('## Planted failures', PLANTED).filter((row) => row[0] === 'K8')
    expect(k8.length).toBeGreaterThan(0)
    for (const row of k8) expect(row[2]).toBe('lock')
  })
})

describe('the other runs', () => {
  test("SC-001 SC-002 this pull request's own run passed, and a newer push cancelled an older run", () => {
    const other = rows('## Other runs', ['State', 'What', 'Result', 'Run'])
    const k0 = other.filter((row) => row[0] === 'K0')
    expect(k0.length).toBeGreaterThan(0)
    expect(k0.some((row) => row[2] === 'success' && THIS_REPO_RUN.test(row[3] ?? ''))).toBe(true)
    const cancelled = other.filter((row) => row[0] === 'S1.5')
    expect(cancelled.some((row) => row[2] === 'cancelled' && ANY_RUN.test(row[3] ?? ''))).toBe(true)
  })

  test('SC-002 the evidence records how long the real runs took, from push to gate', () => {
    const timings = rows('## Timings', ['Run', 'From push to gate'])
    expect(timings.length).toBeGreaterThan(0)
    for (const [run = '', took = ''] of timings) {
      expect(run).toMatch(ANY_RUN)
      expect(took).toMatch(/^(?:\d+m )?\d{1,2}s$/)
    }
  })
})

describe('the logs and the minutes', () => {
  test("SC-003 the sandbox's logs were swept for the made-up terms and for unmasked addresses, and held none", () => {
    const sweep = section('## Log sweep')
    expect(sweep).toMatch(/\b[1-9]\d* logs? from [1-9]\d* runs?\b/)
    expect(sweep).toMatch(/no made-up term/)
    expect(sweep).toMatch(/no unmasked address/)
  })

  test('SC-003 the evidence itself holds no address but allowed or masked ones, and no machine path', () => {
    const text = evidence()
    for (const address of text.match(/[\w.+*[\]-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []) {
      expect(/@users\.noreply\.github\.com$|^brad@bradthome\.com$|^noreply@anthropic\.com$|\*\*\*@/.test(address), address).toBe(true)
    }
    expect(text).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\/|AppData/)
  })

  test("SC-004 the minutes per run project a month's use inside the free plan's $12, and say when Brad reads GitHub's report", () => {
    const minutes = section('## Minutes')
    expect(minutes).toMatch(/\$\d+\.\d{2} a run\b/)
    const month = /\$(\d+\.\d{2}) a month\b/.exec(minutes)
    expect(month, minutes).not.toBeNull()
    expect(Number(month?.[1])).toBeLessThanOrEqual(12)
    expect(minutes).toContain('$12')
    expect(minutes).toMatch(/usage report/)
    expect(minutes).toMatch(/slice 1\.5/)
  })
})
