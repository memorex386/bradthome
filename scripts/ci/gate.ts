import { readFileSync } from 'node:fs'
import { gateUnread, k1, PASS_GATE, PASS_GATE_DRAFT } from '../lib/messages.ts'
import { envValue } from '../lib/terms.ts'

// The gate (FR-002, FR-003, S1.1, S1.2, S1.6): one verdict for the CI
// workflow, which the ruleset requires. It passes only when every job it
// expects reports success. A failed, cancelled, skipped or missing job fails
// it, and so does a failed job it doesn't expect, so a check never reads as a
// pass by not running. Spec 003's site checks come first, in the order its
// mocks list them (C0).
//
// On GitHub it decides from GATE_NEEDS, the needs context its workflow hands
// it, and never asks GitHub's API (D115). That API answered with stale lists
// on #30 and #31, where every job had passed. needs gives one result for the
// tests matrix, failure when either runner fails, so the gate counts tests
// once, and each runner still shows as its own check. A draft pull request
// runs only the quick jobs, so its gate expects those and says the full suite
// runs once it's ready (D100). An edit to the pull request's text runs no ci
// at all, only pr-text.yml's text check.

/** Every check the gate needs, in the order the mocks list them. ci.yml's jobs must match. */
export const EXPECTED_JOBS = [
  'lint',
  'format',
  'site-types',
  'build',
  'e2e',
  'lighthouse',
  'html',
  'links',
  'types',
  'tests',
  'trace',
  'privacy',
  'secrets',
  'commits',
  'hygiene',
] as const

/** The jobs a draft pull request skips until it's ready for review. */
export const SLOW_JOBS = ['e2e', 'lighthouse', 'html', 'links'] as const

/** The jobs a draft's gate expects. */
export const DRAFT_JOBS: readonly string[] = EXPECTED_JOBS.filter((name) => !(SLOW_JOBS as readonly string[]).includes(name))

const GATE = 'gate'

/** What this run is for: a draft's quick run, or a full run. */
export interface GateMode {
  draft: boolean
}

/** The run's mode, from GitHub's event. A push to main is a full run. */
export function gateMode(event: unknown): GateMode {
  const body = (event ?? {}) as { pull_request?: { draft?: unknown } }
  return { draft: body.pull_request?.draft === true }
}

export interface JobResult {
  name: string
  result: string
}

export interface GateVerdict {
  passed: boolean
  lines: string[]
}

export function gateVerdict(results: readonly JobResult[], mode: GateMode = { draft: false }): GateVerdict {
  const latest = new Map<string, string>()
  for (const job of results) if (job.name !== GATE) latest.set(job.name, job.result)
  const expected: readonly string[] = mode.draft ? DRAFT_JOBS : EXPECTED_JOBS
  const failing: JobResult[] = []
  for (const name of expected) {
    const result = latest.get(name)
    if (result !== 'success') failing.push({ name, result: result === undefined ? 'missing' : result === '' ? 'no result' : result })
  }
  const others = [...latest].filter(([name]) => !expected.includes(name))
  for (const [name, result] of others) {
    if (result !== 'success' && result !== 'skipped') failing.push({ name, result: result === '' ? 'no result' : result })
  }
  if (failing.length === 0) return { passed: true, lines: [mode.draft ? PASS_GATE_DRAFT : PASS_GATE] }
  return { passed: false, lines: k1(failing, expected.length + others.length) }
}

function parseResults(text: string): JobResult[] {
  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error('the results file holds no list of jobs')
  return parsed.map((entry: { name?: unknown; result?: unknown }) => {
    if (typeof entry?.name !== 'string') throw new Error('a job in the results file has no name')
    return { name: entry.name, result: typeof entry.result === 'string' ? entry.result : '' }
  })
}

/** Each job and its result from the needs context, as toJSON(needs) writes it. It throws for anything else. */
export function resultsFromNeeds(text: string): JobResult[] {
  const parsed: unknown = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('GATE_NEEDS holds no needs context')
  return Object.entries(parsed as Record<string, unknown>).map(([name, value]) => {
    const result = (value as { result?: unknown } | null)?.result
    if (typeof result !== 'string') throw new Error(`GATE_NEEDS gives ${name} no result`)
    return { name, result }
  })
}

/** The run's mode from the event file GitHub writes. Without one, as for a results file, it's a full run. */
function eventMode(env: NodeJS.ProcessEnv): GateMode {
  const file = envValue(env, 'GITHUB_EVENT_PATH')
  if (!file) return { draft: false }
  try {
    return gateMode(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return { draft: false }
  }
}

function main(): number {
  let results: JobResult[]
  const file = envValue(process.env, 'GATE_RESULTS')
  const mode = eventMode(process.env)
  try {
    if (file !== undefined) results = parseResults(readFileSync(file, 'utf8'))
    else {
      const needs = envValue(process.env, 'GATE_NEEDS')
      if (!needs) throw new Error('GATE_NEEDS is not set: the gate step needs GATE_NEEDS: ${{ toJSON(needs) }}')
      results = resultsFromNeeds(needs)
    }
  } catch (error) {
    // A file's error would name its path, so it gets its own words.
    const reason =
      file !== undefined ? "GATE_RESULTS doesn't name a readable list of jobs" : error instanceof Error ? error.message : 'unknown'
    console.log(gateUnread(reason).join('\n'))
    return 1
  }
  const verdict = gateVerdict(results, mode)
  console.log(verdict.lines.join('\n'))
  return verdict.passed ? 0 : 1
}

if (import.meta.main) process.exitCode = main()
