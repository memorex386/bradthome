import { readFileSync } from 'node:fs'
import { gateUnread, k1, PASS_GATE, PASS_GATE_DRAFT } from '../lib/messages.ts'
import { envValue } from '../lib/terms.ts'

// The gate (FR-002, FR-003, S1.1, S1.2): one verdict for the CI workflow,
// which the ruleset requires from slice 1.5. It passes only when every job it
// expects reports success. A failed, cancelled, skipped or missing job fails
// it, and so does a failed job it doesn't expect, so a check never reads as a
// pass by not running. needs gives one result for the tests matrix, so on
// GitHub the gate reads each check's own result from the run's jobs. Spec
// 003's site checks come first, in the order its mocks list them (C0).
//
// A draft pull request runs only the quick jobs, so its gate expects those and
// says the full suite runs once it's ready. An edit to the title or description
// runs only the jobs that read that text, so its gate adds each job's latest
// result from the earlier runs for the same commit (D100).

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
  'tests (ubuntu-24.04)',
  'tests (windows-2025)',
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

/** What this run is for: a draft's quick run, an edit to the pull request's text, or a full run. */
export interface GateMode {
  draft: boolean
  textOnly: boolean
}

/** The run's mode, from GitHub's event. A push to main is a full run. */
export function gateMode(event: unknown): GateMode {
  const body = (event ?? {}) as { action?: unknown; pull_request?: { draft?: unknown } }
  return { draft: body.pull_request?.draft === true, textOnly: body.action === 'edited' }
}

/**
 * This run's results with each job's latest result from earlier runs for the
 * same commit, for an edit's run. Jobs a run skipped don't count, so an
 * earlier edit's run never hides a code run's result. Earlier runs come
 * oldest first, and a later result wins.
 */
export function combinedResults(current: readonly JobResult[], earlier: readonly (readonly JobResult[])[]): JobResult[] {
  const latest = new Map<string, string>()
  for (const run of [...earlier, current]) {
    for (const job of run) if (job.name !== GATE && job.result !== 'skipped') latest.set(job.name, job.result)
  }
  return [...latest].map(([name, result]) => ({ name, result }))
}

export interface JobResult {
  name: string
  result: string
}

export interface GateVerdict {
  passed: boolean
  lines: string[]
}

export function gateVerdict(results: readonly JobResult[], mode: GateMode = { draft: false, textOnly: false }): GateVerdict {
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

interface ApiJob {
  name?: unknown
  conclusion?: unknown
  status?: unknown
}

function parseResults(text: string): JobResult[] {
  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error('the results file holds no list of jobs')
  return parsed.map((entry: { name?: unknown; result?: unknown }) => {
    if (typeof entry?.name !== 'string') throw new Error('a job in the results file has no name')
    return { name: entry.name, result: typeof entry.result === 'string' ? entry.result : '' }
  })
}

interface ApiRun {
  id?: unknown
  path?: unknown
  created_at?: unknown
}

async function github(url: string, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' },
  })
  if (!response.ok) throw new Error(`GitHub answered HTTP ${response.status}`)
  return response.json()
}

/** Each job's latest result in one run, from GitHub's API, with the job's read-only token. */
async function jobsOfRun(api: string, repo: string, run: string, token: string): Promise<JobResult[]> {
  const jobs: ApiJob[] = []
  for (let page = 1; page <= 10; page += 1) {
    const body = (await github(`${api}/repos/${repo}/actions/runs/${run}/jobs?filter=latest&per_page=100&page=${page}`, token)) as {
      jobs?: ApiJob[]
    }
    jobs.push(...(body.jobs ?? []))
    if ((body.jobs ?? []).length < 100) break
  }
  return jobs
    .filter((job) => typeof job.name === 'string')
    .map((job) => ({ name: String(job.name), result: typeof job.conclusion === 'string' ? job.conclusion : String(job.status ?? '') }))
}

/** The conclusions a finished job can have. Anything else is a job GitHub hasn't finished recording. */
const FINAL = new Set(['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale'])

/**
 * Whether GitHub's list of this run's jobs has caught up. The gate starts only
 * once every job it needs has finished, so a job missing from the list, or one
 * without a final conclusion, means the list is stale. GitHub's API answered
 * that way for a moment after the jobs finished, and when it copied a re-run's
 * passed jobs into the new attempt (spec 008's pull request, #30). Every
 * expected job is listed in every mode, since a draft's or an edit's run lists
 * the jobs it skips.
 */
export function settled(results: readonly JobResult[]): boolean {
  const final = new Map(results.map((job) => [job.name, FINAL.has(job.result)]))
  return EXPECTED_JOBS.every((name) => final.get(name) === true)
}

/** Reads the run's jobs until the list has settled, or the tries run out. The last read is returned either way. */
export async function readSettled(
  read: () => Promise<JobResult[]>,
  sleep: (ms: number) => Promise<void>,
  tries = 7,
  intervalMs = 10_000,
): Promise<JobResult[]> {
  let results = await read()
  for (let attempt = 1; attempt < tries && !settled(results); attempt += 1) {
    await sleep(intervalMs)
    results = await read()
  }
  return results
}

/** The results this run's gate reads: its own, and for an edit, the earlier ci runs' for the same commit. */
async function resultsFromGitHub(env: NodeJS.ProcessEnv, mode: GateMode): Promise<JobResult[]> {
  const api = envValue(env, 'GITHUB_API_URL') || 'https://api.github.com'
  const repo = envValue(env, 'GITHUB_REPOSITORY')
  const run = envValue(env, 'GITHUB_RUN_ID')
  const token = envValue(env, 'GITHUB_TOKEN')
  if (!repo || !run || !token) throw new Error('GITHUB_REPOSITORY, GITHUB_RUN_ID and GITHUB_TOKEN must be set')
  const current = await readSettled(
    () => jobsOfRun(api, repo, run, token),
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  )
  const sha = envValue(env, 'GITHUB_HEAD_SHA')
  if (!mode.textOnly || !sha) return current
  const body = (await github(`${api}/repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`, token)) as { workflow_runs?: ApiRun[] }
  const earlier = (body.workflow_runs ?? [])
    .filter((entry) => String(entry.id) !== run && entry.path === '.github/workflows/ci.yml')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  const results: JobResult[][] = []
  for (const entry of earlier) results.push(await jobsOfRun(api, repo, String(entry.id), token))
  return combinedResults(current, results)
}

/** The run's mode from the event file GitHub writes. Without one, as for a results file, it's a full run. */
function eventMode(env: NodeJS.ProcessEnv): GateMode {
  const file = envValue(env, 'GITHUB_EVENT_PATH')
  if (!file) return { draft: false, textOnly: false }
  try {
    return gateMode(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return { draft: false, textOnly: false }
  }
}

async function main(): Promise<number> {
  let results: JobResult[]
  const file = envValue(process.env, 'GATE_RESULTS')
  const mode = eventMode(process.env)
  try {
    results = file !== undefined ? parseResults(readFileSync(file, 'utf8')) : await resultsFromGitHub(process.env, mode)
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

if (import.meta.main) process.exitCode = await main()
