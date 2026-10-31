import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// pnpm review:eval [--case F1] [--runs 3]: measures the pinned reviewer on the
// five frozen cases, three runs each (FR-025, SC-004, D74). Each run reviews
// one diff with one planted bug, in a scratch folder that holds the spec, its
// mocks, the committed reviewer and the case, but never the case's answer. The
// runs use Claude Code's headless mode on Brad's plan, one at a time.

const HOME = path.resolve(import.meta.dirname, '..')
const SPEC = 'specs/001-hooks-and-agent-rules'
const CASES_DIR = path.join(HOME, 'tests', '001', 'frozen-cases')
const REVIEWER = path.join(HOME, '.claude', 'agents', 'reviewer.md')
const REVIEW_SKILL = path.join(HOME, '.agents', 'skills', 'review', 'SKILL.md')
const EVIDENCE = path.join(HOME, SPEC, 'evidence', 'review-eval.json')

/** The pinned model needs Claude Code 2.1.280 or later. */
const MIN_VERSION = [2, 1, 280] as const

export interface CaseInfo {
  id: string
  title: string
  file: string
  line: number
  scenario: string
  reason: string
}

export interface CaseResult {
  id: string
  title: string
  found: number
  runs: number
  invalid: number
  /** What each counted review got wrong: a finding without a file, line or ID, or a verdict. */
  flags: string[]
  /** Each run's outcome, in order. */
  outcomes: ('found' | 'missed' | 'invalid')[]
  /** The line each run that found the bug named. Recorded, not scored. */
  lines: (number | null)[]
}

export interface EvalResult {
  model: string
  cases: CaseResult[]
  found: number
  total: number
  targetMet: boolean
}

export interface EvalOptions {
  runs: number
  /** The case IDs to run, such as ['F2']. All of them when left out. */
  cases?: readonly string[]
  /** What `claude --version` printed. */
  version: string
  /** Runs one review in a folder and returns the parsed `claude -p --output-format json` result. */
  review: (workDir: string) => unknown
}

/** The model the committed reviewer is pinned to, from its front matter. */
export function pinnedModel(): string {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(REVIEWER, 'utf8'))?.[1] ?? ''
  return /^model:\s*["']?([^"'\s]+)["']?\s*$/m.exec(front)?.[1] ?? 'unknown'
}

export function loadCases(): CaseInfo[] {
  return readdirSync(CASES_DIR)
    .sort()
    .map((folder) => JSON.parse(readFileSync(path.join(CASES_DIR, folder, 'case.json'), 'utf8')) as CaseInfo)
}

function caseFolder(id: string): string {
  const folder = readdirSync(CASES_DIR).find((name) => name.startsWith(`${id}-`))
  if (folder === undefined) throw new Error(`no frozen case ${id}`)
  return path.join(CASES_DIR, folder)
}

/** The message to the reviewer, from the review skill, so the eval sends the same words a review does. */
export function reviewMessage(): string {
  const skill = readFileSync(REVIEW_SKILL, 'utf8')
  const section = skill.slice(skill.indexOf('## The message'))
  const block = /```text\r?\n([\s\S]*?)\r?\n```/.exec(section)?.[1]
  if (block === undefined) throw new Error('the review skill has no message under "## The message"')
  return block
    .replaceAll('{spec}', `${SPEC}/spec.md`)
    .replaceAll('{change}', 'the change in change.diff, whose changed files are in this folder as they are after the change,')
}

/** A scratch folder for one run: the spec, its mocks, the reviewer, the diff and the changed files. */
function buildWorkDir(info: CaseInfo): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), `bradthome-review-${info.id}-`))
  mkdirSync(path.join(dir, SPEC, 'mocks'), { recursive: true })
  cpSync(path.join(HOME, SPEC, 'spec.md'), path.join(dir, SPEC, 'spec.md'))
  cpSync(path.join(HOME, SPEC, 'mocks', 'README.md'), path.join(dir, SPEC, 'mocks', 'README.md'))
  mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true })
  cpSync(REVIEWER, path.join(dir, '.claude', 'agents', 'reviewer.md'))
  const folder = caseFolder(info.id)
  cpSync(path.join(folder, 'change.diff'), path.join(dir, 'change.diff'))
  cpSync(path.join(folder, 'files'), dir, { recursive: true })
  return dir
}

/** The headless command for one review, and its environment. */
export function reviewCommand(workDir: string, env: NodeJS.ProcessEnv): { args: string[]; env: NodeJS.ProcessEnv; cwd: string } {
  const args = [
    '-p',
    '--agent',
    'reviewer',
    '--output-format',
    'json',
    '--setting-sources',
    'project',
    '--permission-mode',
    'default',
    '--permission-prompts',
    'none',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--disable-slash-commands',
  ]
  // An API key would bill the API instead of Brad's plan, and a model
  // variable would override the reviewer's pin.
  const kept: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(env)) {
    if (/^ANTHROPIC_(?:API_KEY|AUTH_TOKEN)$/i.test(name)) continue
    if (/^(?:ANTHROPIC|CLAUDE_CODE)_/i.test(name) && /MODEL/i.test(name)) continue
    kept[name] = value
  }
  return { args, env: kept, cwd: workDir }
}

function versionAtLeast(text: string, wanted: readonly number[]): boolean {
  const found = /(\d+)\.(\d+)\.(\d+)/.exec(text)
  if (found === null) return false
  for (let i = 0; i < 3; i += 1) {
    const have = Number(found[i + 1])
    const want = wanted[i] ?? 0
    if (have !== want) return have > want
  }
  return true
}

interface ClaudeResult {
  type?: unknown
  subtype?: unknown
  is_error?: unknown
  result?: unknown
  modelUsage?: unknown
}

/** Whether a run counts: a successful result, with the pinned model doing the work. */
function counted(result: unknown, model: string): result is ClaudeResult & { result: string } {
  if (typeof result !== 'object' || result === null) return false
  const claude = result as ClaudeResult
  if (claude.type !== 'result' || claude.is_error === true || typeof claude.result !== 'string') return false
  const usage = typeof claude.modelUsage === 'object' && claude.modelUsage !== null ? Object.keys(claude.modelUsage) : []
  return usage.some((name) => name === model || name.startsWith(`${model}[`))
}

const ID = /(?<![\w.-])(S\d+\.\d+|FR-\d{3}|SC-\d{3})(?![\w-]|\.\d)/g
/** A path: one with a folder in it, or a file name with a known extension. */
const PATH = /(?:^|[\s(\[`'"])((?:[\w.@-]+\/)+[\w.@-]+|[\w.@-]+\.(?:[cm]?[jt]s|json|md|ya?ml|sh|diff|toml|txt|lock))(?::\d+)?/
const LINE = /(?::\d+\b)|\blines? \d+/i
const VERDICT =
  /\b(?:approv(?:e|ed|al|ing)|lgtm|looks good to me|ready (?:to|for) (?:merge|review|gate 3)|(?:safe|good|ok|okay|fine) to merge|can be merged|ship it)\b/i
const NEGATED = /\b(?:no|not|never|don't|do not|isn't|is not|without)\b[^.]*\b(?:approv|merge|ready)/i

/** A review's findings: its top-level Markdown list items, outside code blocks, each with its own lines. */
function readReview(text: string): { findings: string[]; prose: string[] } {
  const findings: string[] = []
  const prose: string[] = []
  let fenced = false
  let current: string[] | undefined
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      current = undefined
      continue
    }
    if (fenced) continue
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (item !== null) {
      current = [item[1] ?? '']
      findings.push(current.join('\n'))
      continue
    }
    if (current !== undefined && /^\s+\S/.test(line)) {
      current.push(line.trim())
      findings[findings.length - 1] = current.join('\n')
      continue
    }
    current = undefined
    if (line.trim() !== '' && !line.startsWith('#')) prose.push(line)
  }
  return { findings, prose }
}

function normalize(text: string): string {
  return text.replaceAll('`', '').replaceAll('\\', '/').replace(/(^|[\s(\[])\.\//g, '$1')
}

/** Scores one review against its case (S6.3). */
export function scoreReview(text: string, info: CaseInfo): { found: boolean; line: number | null; flags: string[] } {
  const { findings, prose } = readReview(text)
  const flags: string[] = []
  let found = false
  let line: number | null = null
  findings.forEach((finding, index) => {
    const plain = normalize(finding)
    const ids = [...plain.matchAll(ID)].map((match) => match[1])
    const file = PATH.exec(plain)
    if (file === null) flags.push(`finding ${index + 1} names no file`)
    if (!LINE.test(plain)) flags.push(`finding ${index + 1} names no line`)
    if (ids.length === 0) flags.push(`finding ${index + 1} names no S, FR or SC ID`)
    if (!found && plain.includes(info.file) && ids.includes(info.scenario)) {
      found = true
      const at = new RegExp(`${info.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`).exec(plain)?.[1]
      line = at === undefined ? null : Number(at)
    }
  })
  for (const sentence of prose) {
    if (VERDICT.test(sentence) && !NEGATED.test(sentence)) flags.push('the review gives a verdict')
  }
  return { found, line, flags }
}

/** Runs the cases, one review at a time, and scores them. It writes nothing. */
export async function evaluate(options: EvalOptions): Promise<EvalResult> {
  const model = pinnedModel()
  const recent = versionAtLeast(options.version, MIN_VERSION)
  const infos = loadCases().filter((info) => options.cases === undefined || options.cases.includes(info.id))
  const cases: CaseResult[] = []
  for (const info of infos) {
    const result: CaseResult = { id: info.id, title: info.title, found: 0, runs: options.runs, invalid: 0, flags: [], outcomes: [], lines: [] }
    for (let run = 1; run <= options.runs; run += 1) {
      const dir = buildWorkDir(info)
      try {
        const answer: unknown = await options.review(dir)
        if (!recent || !counted(answer, model)) {
          result.invalid += 1
          result.outcomes.push('invalid')
          continue
        }
        const score = scoreReview(answer.result, info)
        for (const flag of score.flags) result.flags.push(`run ${run}: ${flag}`)
        result.outcomes.push(score.found ? 'found' : 'missed')
        if (score.found) {
          result.found += 1
          result.lines.push(score.line)
        }
      } finally {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      }
    }
    cases.push(result)
  }
  const found = cases.reduce((sum, c) => sum + c.found, 0)
  const total = cases.reduce((sum, c) => sum + c.runs, 0)
  const targetMet =
    total > 0 && found * 5 >= total * 4 && cases.every((c) => c.found * 3 >= c.runs * 2)
  return { model, cases, found, total, targetMet }
}

/** The E1 report. */
export function formatReport(result: EvalResult): string {
  const runs = result.cases[0]?.runs ?? 0
  const width = Math.max(0, ...result.cases.map((c) => c.title.length)) + 4
  const lines = [`Reviewer: ${result.model} · ${result.cases.length} frozen cases × ${runs} runs`]
  for (const c of result.cases) {
    const invalid = c.invalid > 0 ? `  (${c.invalid} invalid)` : ''
    lines.push(`  ${c.id}  ${c.title.padEnd(width)}${c.found}/${c.runs}${invalid}`)
  }
  const percent = result.total === 0 ? 0 : Math.round((result.found / result.total) * 100)
  const need = Math.ceil((runs * 2) / 3)
  const overall = `Overall ${result.found}/${result.total} (${percent}%).`
  if (result.targetMet) {
    lines.push(`${overall} Every case found at least ${need} of ${runs} times: target met.`)
  } else {
    const short = result.cases.filter((c) => c.found * 3 < c.runs * 2).map((c) => c.id)
    const reasons = [
      ...(short.length > 0 ? [`${short.join(', ')} found fewer than ${need} of ${runs} times`] : []),
      ...(result.found * 5 < result.total * 4 ? [`under ${Math.ceil((result.total * 4) / 5)} of ${result.total} overall`] : []),
      ...(result.cases.some((c) => c.invalid > 0) ? ['some runs were invalid'] : []),
    ]
    lines.push(`${overall} ${reasons.join('; ')}: target missed.`)
  }
  return `${lines.join('\n')}\n`
}

function claude(args: readonly string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string }) {
  // On Windows, claude is a .cmd shim, which needs a shell. Every argument
  // here is a plain word, and the prompt goes in on stdin.
  return spawnSync('claude', args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 15 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const cases: string[] = []
  let runs = 3
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--case') cases.push(args[(i += 1)] ?? '')
    else if (args[i] === '--runs') runs = Number(args[(i += 1)])
  }
  const versionRun = claude(['--version'], {})
  const version = versionRun.status === 0 ? versionRun.stdout.trim() : ''
  if (!versionAtLeast(version, MIN_VERSION)) {
    console.error(`✖ review:eval  Claude Code ${version || 'not found'} can't run the pinned reviewer.`)
    console.error(`  Fix: put Claude Code ${MIN_VERSION.join('.')} or later on PATH as claude, then run it again.`)
    return 1
  }
  const message = reviewMessage()
  const logs = mkdtempSync(path.join(os.tmpdir(), 'bradthome-review-eval-'))
  let count = 0
  const result = await evaluate({
    runs,
    cases: cases.length > 0 ? cases : undefined,
    version,
    review: (workDir) => {
      count += 1
      const command = reviewCommand(workDir, process.env)
      const ran = claude(command.args, { cwd: command.cwd, env: command.env, input: message })
      writeFileSync(path.join(logs, `run-${String(count).padStart(2, '0')}.json`), ran.stdout ?? '')
      process.stderr.write(`  run ${count} done\n`)
      try {
        return JSON.parse(ran.stdout) as unknown
      } catch {
        return { type: 'error' }
      }
    },
  })
  process.stdout.write(formatReport(result))
  console.error(`  Each run's raw result is in the temp folder, under ${path.basename(logs)}.`)
  if (cases.length === 0) {
    mkdirSync(path.dirname(EVIDENCE), { recursive: true })
    const evidence = {
      model: result.model,
      claudeCodeVersion: version,
      date: new Date().toISOString().slice(0, 10),
      runsPerCase: runs,
      cases: result.cases,
      found: result.found,
      total: result.total,
      targetMet: result.targetMet,
    }
    writeFileSync(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`)
    console.error(`  Wrote ${path.relative(HOME, EVIDENCE).replaceAll('\\', '/')}.`)
  }
  return result.targetMet ? 0 : 1
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  process.exitCode = await main()
}
