import { readFileSync } from 'node:fs'
import { gateUnread, k1, PASS_GATE } from '../lib/messages.ts'
import { envValue } from '../lib/terms.ts'

// The gate (FR-002, FR-003, S1.1, S1.2): one verdict for the CI workflow,
// which the ruleset requires from slice 1.5. It passes only when every job it
// expects reports success. A failed, cancelled, skipped or missing job fails
// it, and so does a failed job it doesn't expect, so a check never reads as a
// pass by not running. needs gives one result for the tests matrix, so on
// GitHub the gate reads each check's own result from the run's jobs.

/** Every check the gate needs, in the order the mocks list them. ci.yml's jobs must match. */
export const EXPECTED_JOBS = [
  'types',
  'tests (ubuntu-24.04)',
  'tests (windows-2025)',
  'trace',
  'privacy',
  'secrets',
  'commits',
  'hygiene',
] as const

const GATE = 'gate'

export interface JobResult {
  name: string
  result: string
}

export interface GateVerdict {
  passed: boolean
  lines: string[]
}

export function gateVerdict(results: readonly JobResult[]): GateVerdict {
  const latest = new Map<string, string>()
  for (const job of results) if (job.name !== GATE) latest.set(job.name, job.result)
  const expected: readonly string[] = EXPECTED_JOBS
  const failing: JobResult[] = []
  for (const name of expected) {
    const result = latest.get(name)
    if (result !== 'success') failing.push({ name, result: result === undefined ? 'missing' : result === '' ? 'no result' : result })
  }
  const others = [...latest].filter(([name]) => !expected.includes(name))
  for (const [name, result] of others) {
    if (result !== 'success' && result !== 'skipped') failing.push({ name, result: result === '' ? 'no result' : result })
  }
  if (failing.length === 0) return { passed: true, lines: [PASS_GATE] }
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

/** Each job's latest result in this run, from GitHub's API, with the job's read-only token. */
async function resultsFromGitHub(env: NodeJS.ProcessEnv): Promise<JobResult[]> {
  const api = envValue(env, 'GITHUB_API_URL') || 'https://api.github.com'
  const repo = envValue(env, 'GITHUB_REPOSITORY')
  const run = envValue(env, 'GITHUB_RUN_ID')
  const token = envValue(env, 'GITHUB_TOKEN')
  if (!repo || !run || !token) throw new Error('GITHUB_REPOSITORY, GITHUB_RUN_ID and GITHUB_TOKEN must be set')
  const jobs: ApiJob[] = []
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`${api}/repos/${repo}/actions/runs/${run}/jobs?filter=latest&per_page=100&page=${page}`, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' },
    })
    if (!response.ok) throw new Error(`GitHub answered HTTP ${response.status}`)
    const body = (await response.json()) as { jobs?: ApiJob[]; total_count?: number }
    jobs.push(...(body.jobs ?? []))
    if ((body.jobs ?? []).length < 100) break
  }
  return jobs
    .filter((job) => typeof job.name === 'string')
    .map((job) => ({ name: String(job.name), result: typeof job.conclusion === 'string' ? job.conclusion : String(job.status ?? '') }))
}

async function main(): Promise<number> {
  let results: JobResult[]
  const file = envValue(process.env, 'GATE_RESULTS')
  try {
    results = file !== undefined ? parseResults(readFileSync(file, 'utf8')) : await resultsFromGitHub(process.env)
  } catch (error) {
    // A file's error would name its path, so it gets its own words.
    const reason = file !== undefined ? "GATE_RESULTS doesn't name a readable list of jobs" : error instanceof Error ? error.message : 'unknown'
    console.log(gateUnread(reason).join('\n'))
    return 1
  }
  const verdict = gateVerdict(results)
  console.log(verdict.lines.join('\n'))
  return verdict.passed ? 0 : 1
}

if (import.meta.main) process.exitCode = await main()
