import { readFileSync } from 'node:fs'
import path from 'node:path'
import { type ApiAnswer, answerProblem, ghApi, githubSlug, REPO_SLUG } from './lib/gh.ts'
import { runGit, topLevel } from './lib/git.ts'
import { R1_CODEOWNERS_PASS, R1_FILE_PASS, R1_PENDING, R1_READY, R2_FIX, R2_HEADER } from './lib/messages.ts'

// pnpm ruleset:check (FR-017, FR-018, S5.1–S5.4): checks .github/rulesets/main.json
// for every rule main needs and .github/CODEOWNERS for Brad on every path, then
// compares the file with the ruleset GitHub serves. Until the repo is public,
// GitHub refuses to serve rulesets, which reads as pending, not a failure
// (D80). With no network or no gh, the live ruleset isn't checked. It only
// reads, through gh api.

const RULESET = '.github/rulesets/main.json'
const CODEOWNERS = '.github/CODEOWNERS'
const BRAD = '@memorex386'
const ACTIONS_APP = 15368
const REFUSED = /upgrade to github pro|make this repository public/i
/** Fields only GitHub sets, which the file never holds. */
const SERVER_FIELDS = ['id', 'source', 'source_type', 'node_id', 'created_at', 'updated_at', '_links', 'current_user_can_bypass']

interface Rule {
  type?: unknown
  parameters?: Record<string, unknown>
}

interface Ruleset {
  name?: unknown
  target?: unknown
  enforcement?: unknown
  bypass_actors?: unknown
  conditions?: { ref_name?: { include?: unknown; exclude?: unknown } }
  rules?: unknown
  [key: string]: unknown
}

function rulesOf(ruleset: Ruleset): Rule[] {
  return Array.isArray(ruleset.rules) ? (ruleset.rules as Rule[]) : []
}

function ruleOf(ruleset: Ruleset, type: string): Rule | undefined {
  return rulesOf(ruleset).find((rule) => rule.type === type)
}

function sameList(value: unknown, wanted: readonly string[]): boolean {
  return Array.isArray(value) && value.length === wanted.length && wanted.every((item, index) => value[index] === item)
}

/** The rules S5.1 lists that the file lacks, in R1's words. */
function missingRules(ruleset: Ruleset): string[] {
  const missing: string[] = []
  const include = ruleset.conditions?.ref_name?.include
  const exclude = ruleset.conditions?.ref_name?.exclude
  if (ruleset.target !== 'branch' || !sameList(include, ['refs/heads/main']) || (Array.isArray(exclude) && exclude.length > 0)) {
    missing.push('targets main (refs/heads/main) and nothing else')
  }
  if (ruleset.enforcement !== 'active') missing.push('enforced (enforcement: active)')
  const pr = ruleOf(ruleset, 'pull_request')
  if (pr === undefined) missing.push('pull requests only')
  else {
    const p = pr.parameters ?? {}
    if (!sameList(p.allowed_merge_methods, ['squash'])) missing.push('squash merges only')
    if (typeof p.required_approving_review_count !== 'number' || p.required_approving_review_count < 1) missing.push('1 approval')
    if (p.require_code_owner_review !== true) missing.push("a code owner's approval")
    if (p.dismiss_stale_reviews_on_push !== true) missing.push('stale approvals dismissed')
  }
  if (ruleOf(ruleset, 'required_linear_history') === undefined) missing.push('linear history')
  if (ruleOf(ruleset, 'required_signatures') === undefined) missing.push('signed commits')
  const checks = ruleOf(ruleset, 'required_status_checks')?.parameters?.required_status_checks
  const contexts = (Array.isArray(checks) ? (checks as { context?: unknown; integration_id?: unknown }[]) : []).filter(
    (check) => check.integration_id === ACTIONS_APP,
  )
  if (!contexts.some((check) => check.context === 'gate')) missing.push('the gate passing (gate, from GitHub Actions)')
  if (!contexts.some((check) => check.context === 'lock')) missing.push('the lock check passing (lock, from GitHub Actions)')
  if (ruleOf(ruleset, 'non_fast_forward') === undefined) missing.push('no force pushes')
  if (ruleOf(ruleset, 'deletion') === undefined) missing.push('no deletions')
  if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length > 0) missing.push('no bypass actors')
  return missing
}

function checkFile(root: string): { lines: string[]; ruleset: Ruleset | undefined } {
  let ruleset: Ruleset
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(root, RULESET), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object')
    ruleset = parsed as Ruleset
  } catch {
    return {
      lines: [`✖ ruleset file  ${RULESET} can't be read as a ruleset`, '  Fix: restore it from main, then change it in a pull request.'],
      ruleset: undefined,
    }
  }
  const missing = missingRules(ruleset)
  if (missing.length === 0) return { lines: R1_FILE_PASS, ruleset }
  return {
    lines: [
      `✖ ruleset file  ${RULESET} is missing ${missing.length === 1 ? 'a rule' : `${missing.length} rules`}`,
      ...missing.map((rule) => `  ${rule}`),
      '  Fix: add each rule back in a pull request. Spec 002 lists them (S5.1).',
    ],
    ruleset: undefined,
  }
}

function checkCodeowners(root: string): string[] {
  let text: string
  try {
    text = readFileSync(path.join(root, CODEOWNERS), 'utf8')
  } catch {
    return [`✖ code owners  ${CODEOWNERS} is missing`, `  Fix: add it with one line: * ${BRAD} (D81).`]
  }
  const problems: string[] = []
  let everyPath = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim()
    if (line === '' || line.startsWith('#')) continue
    const [pattern = '', ...owners] = line.split(/\s+/)
    if (owners.length !== 1 || owners[0]?.toLowerCase() !== BRAD) problems.push(`${pattern}  owned by ${owners.join(' ') || 'no one'}`)
    else if (pattern === '*') everyPath = true
  }
  if (!everyPath) problems.unshift(`no * ${BRAD} line, so not every path is Brad's`)
  if (problems.length === 0) return [R1_CODEOWNERS_PASS]
  return [
    `✖ code owners  ${CODEOWNERS} doesn't name Brad for every path`,
    ...problems.map((problem) => `  ${problem}`),
    `  Fix: make the file one line: * ${BRAD} (D81).`,
  ]
}

function withoutServerFields(ruleset: Ruleset): Ruleset {
  return Object.fromEntries(Object.entries(ruleset).filter(([key]) => !SERVER_FIELDS.includes(key)))
}

/** A value in a difference's line. */
function shownValue(value: unknown): string {
  if (value === undefined || value === null) return 'none'
  if (Array.isArray(value)) return value.length === 0 ? 'none' : value.map(shownValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(sortedKeys(value))
  return String(value)
}

function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sortedKeys(v)]))
  }
  return value
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortedKeys(a)) === JSON.stringify(sortedKeys(b))
}

const ROLES: Record<number, string> = { 1: 'Repository read', 2: 'Repository triage', 3: 'Repository write', 4: 'Repository maintain', 5: 'Repository admin' }

function bypassActors(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'none'
  return value
    .map((actor: { actor_id?: unknown; actor_type?: unknown }) =>
      actor.actor_type === 'RepositoryRole' && typeof actor.actor_id === 'number' && ROLES[actor.actor_id] !== undefined
        ? ROLES[actor.actor_id]
        : `${String(actor.actor_type)} ${String(actor.actor_id)}`,
    )
    .join(', ')
}

const PARAMETER_LABELS: Record<string, string> = {
  required_approving_review_count: 'required approvals',
  allowed_merge_methods: 'merge methods',
  require_code_owner_review: 'code owner review',
  dismiss_stale_reviews_on_push: 'stale approvals dismissed',
  require_last_push_approval: 'last push approval',
  required_review_thread_resolution: 'threads resolved',
  required_status_checks: 'required checks',
  strict_required_status_checks_policy: 'branch up to date',
  do_not_enforce_on_create: 'not enforced on create',
}

/** Each difference between the file and the live ruleset, as [label, file, live]. */
function differences(file: Ruleset, live: Ruleset): [string, string, string][] {
  const found: [string, string, string][] = []
  for (const key of ['name', 'target', 'enforcement', 'conditions']) {
    if (!same(file[key], live[key])) found.push([key === 'conditions' ? 'branches' : key, shownValue(file[key]), shownValue(live[key])])
  }
  // GitHub shows bypass actors only to an account that can edit the ruleset.
  if ('bypass_actors' in live && !same(file.bypass_actors ?? [], live.bypass_actors ?? [])) {
    found.push(['bypass actors', bypassActors(file.bypass_actors), bypassActors(live.bypass_actors)])
  }
  const types = [...new Set([...rulesOf(file), ...rulesOf(live)].map((rule) => String(rule.type)))].sort()
  for (const type of types) {
    const ours = ruleOf(file, type)
    const theirs = ruleOf(live, type)
    if (ours === undefined || theirs === undefined) {
      found.push([`rule ${type}`, ours === undefined ? 'none' : 'present', theirs === undefined ? 'none' : 'present'])
      continue
    }
    const keys = [...new Set([...Object.keys(ours.parameters ?? {}), ...Object.keys(theirs.parameters ?? {})])].sort()
    for (const key of keys) {
      const a = ours.parameters?.[key]
      const b = theirs.parameters?.[key]
      if (same(a, b)) continue
      const label = PARAMETER_LABELS[key] ?? `${type} ${key}`
      const show = key === 'required_status_checks' ? (v: unknown) => shownValue(Array.isArray(v) ? v.map((c: { context?: unknown }) => c.context) : v) : shownValue
      found.push([label, show(a), show(b)])
    }
  }
  return found
}

function liveLines(answer: Exclude<ApiAnswer, { kind: 'ok' }>, endpoint: string): { lines: string[]; failed: boolean } {
  if (answer.kind === 'http' && answer.status === 403 && REFUSED.test(answer.message)) return { lines: [R1_PENDING], failed: false }
  if (answer.kind === 'no-gh' || answer.kind === 'offline' || answer.kind === 'signed-out') {
    return { lines: [`… live ruleset  not checked: ${answerProblem(answer)}`], failed: false }
  }
  return {
    lines: [`✖ live ruleset  can't be read: ${answerProblem(answer)}`, `  Fix: run gh api ${endpoint} to see GitHub's answer, then run the check again.`],
    failed: true,
  }
}

function checkLive(root: string, file: Ruleset | undefined): { lines: string[]; failed: boolean; pending: boolean } {
  const origin = runGit(['remote', 'get-url', 'origin'], { cwd: root })
  const slug = (origin.status === 0 ? githubSlug(origin.stdout) : undefined) ?? REPO_SLUG
  const endpoint = `repos/${slug}/rulesets`
  const list = ghApi(endpoint, process.env, root)
  if (list.kind !== 'ok') {
    const { lines, failed } = liveLines(list, endpoint)
    return { lines, failed, pending: lines[0] === R1_PENDING }
  }
  if (!Array.isArray(list.body)) return { ...liveLines({ kind: 'not-json' }, endpoint), pending: false }
  const summaries = list.body as { id?: unknown; name?: unknown; target?: unknown }[]
  const chosen = summaries.find((ruleset) => file !== undefined && ruleset.name === file.name) ?? summaries.find((ruleset) => ruleset.target === 'branch')
  if (chosen === undefined || typeof chosen.id !== 'number') {
    return {
      lines: ['✖ live ruleset  GitHub serves no ruleset for main, so no rule is in force', "  Fix: Brad applies .github/rulesets/main.json, from slice 1.5's steps."],
      failed: true,
      pending: false,
    }
  }
  const detailEndpoint = `${endpoint}/${chosen.id}`
  const detail = ghApi(detailEndpoint, process.env, root)
  if (detail.kind !== 'ok') return { ...liveLines(detail, detailEndpoint), pending: false }
  if (file === undefined) return { lines: [`… live ruleset  not compared: the file has problems`], failed: false, pending: false }
  const found = differences(withoutServerFields(file), withoutServerFields(detail.body as Ruleset))
  if (found.length === 0) return { lines: [`✓ live ruleset  matches the file (ruleset ${chosen.id})`], failed: false, pending: false }
  const width = Math.max(...found.map(([label]) => label.length)) + 1
  return {
    lines: [R2_HEADER, ...found.map(([label, ours, theirs]) => `  ${label.padEnd(width)}  file ${ours} · live ${theirs}`), R2_FIX],
    failed: true,
    pending: false,
  }
}

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const file = checkFile(root)
  const owners = checkCodeowners(root)
  const live = checkLive(root, file.ruleset)
  const failed = file.ruleset === undefined || owners[0]?.startsWith('✖') === true || live.failed
  const lines = [...file.lines, ...owners, ...live.lines]
  if (!failed && live.pending) lines.push(R1_READY)
  else if (!failed && live.lines[0]?.startsWith('✓') === true) lines.push('Ready.')
  console.log(lines.join('\n'))
  return failed ? 1 : 0
}

process.exitCode = main()
