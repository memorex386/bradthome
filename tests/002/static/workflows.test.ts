import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { GITHUB, repoPath } from '../helpers/paths.ts'
import {
  allKeys,
  allSteps,
  allStrings,
  checkNames,
  jobsOf,
  type Job,
  readYaml,
  runsOf,
  stepsOf,
  triggersOf,
  type Workflow,
} from '../helpers/workflows.ts'

// The workflows, read as YAML: what triggers them, their jobs, their pins and
// permissions, and how the privacy step and the lock job are fenced in. Later
// specs add jobs and workflows, so the jobs, pins and permissions are checked
// as rules over every workflow in the folder, not as fixed lists (D95).

/** A first-party Action pinned to a full commit hash, such as actions/checkout@<40 hex>. */
const PINNED_ACTION = /^actions\/[a-z0-9-]+@[0-9a-f]{40}$/
/**
 * The only write permissions a job may hold, each where a spec names it (D95).
 * Spec 003's preview signs in to Google with GitHub's identity token (FR-016)
 * and keeps one pull request comment (FR-015), which needs pull-requests: write (D99).
 * Spec 008's release stages and releases, and its rollback rolls back, each
 * signing in the same way (D114).
 */
const SPEC_WRITES: Record<string, Record<string, Record<string, string>>> = {
  'preview.yml': { deploy: { 'id-token': 'write' }, comment: { 'pull-requests': 'write' } },
  'release.yml': { stage: { 'id-token': 'write' }, release: { 'id-token': 'write' } },
  'rollback.yml': { rollback: { 'id-token': 'write' } },
  'next.yml': { deploy: { 'id-token': 'write' } },
}
const GITLEAKS = {
  version: '8.30.1',
  linux: '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
  windows: 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e',
}
const RUNNERS = ['ubuntu-24.04', 'windows-2025']
/** A named runner image, never -latest. */
const PINNED_RUNNER = /^(?:ubuntu|windows|macos)-\d+(?:\.\d+)?(?:-arm)?$/
/** Spec 002's jobs. Later specs add theirs beside them (D95). */
const CI_JOB_IDS = ['types', 'tests', 'trace', 'privacy', 'secrets', 'commits', 'hygiene', 'gate']
const CI_SCRIPTS: Record<string, RegExp> = {
  types: /\bpnpm (?:run )?typecheck\b/,
  tests: /\bpnpm (?:run )?test(?![:\w-])/,
  trace: /\bnode scripts\/ci\/trace-all\.ts\b/,
  privacy: /\bnode scripts\/ci\/privacy\.ts\b/,
  secrets: /\bnode scripts\/ci\/secrets\.ts\b/,
  commits: /\bnode scripts\/ci\/commits\.ts\b/,
  hygiene: /\bnode scripts\/ci\/hygiene\.ts\b/,
  gate: /\bnode scripts\/ci\/gate\.ts\b/,
}

const ci = (): Workflow => readYaml<Workflow>(GITHUB.ci)
const lockedTests = (): Workflow => readYaml<Workflow>(GITHUB.lockedTests)
const both = (): [string, Workflow][] => [
  ['ci.yml', ci()],
  ['locked-tests.yml', lockedTests()],
]
/** Every workflow in the folder, by file name. */
const every = (): [string, Workflow][] =>
  readdirSync(GITHUB.workflows)
    .sort()
    .map((file) => [file, readYaml<Workflow>(path.join(GITHUB.workflows, file))])

function job(workflow: Workflow, id: string): Job {
  const found = jobsOf(workflow)[id]
  expect(found, `job ${id}`).toBeDefined()
  return found ?? {}
}

/** Each ${{ … }} expression in a text. */
function expressions(text: string): string[] {
  return [...text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map((match) => (match[1] ?? '').trim())
}

function permissionValues(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value !== null && typeof value === 'object') return Object.values(value).map(String)
  return []
}

describe('ci.yml: when it runs', () => {
  test('S1.4 FR-001 runs on every pull request event that can change the code it checks, and on every push to main, but not on an edit to the text', () => {
    const on = triggersOf(ci())
    const pullRequest = (on.pull_request ?? {}) as { types?: string[]; branches?: string[] }
    expect(on).toHaveProperty('pull_request')
    for (const type of ['opened', 'synchronize', 'reopened', 'ready_for_review']) expect(pullRequest.types ?? [], type).toContain(type)
    // An edit to the title or description runs only the text check (FR-022, D115).
    expect(pullRequest.types ?? []).not.toContain('edited')
    if (pullRequest.branches !== undefined) expect(pullRequest.branches).toEqual(['main'])
    const push = (on.push ?? {}) as { branches?: string[] }
    expect(push.branches).toEqual(['main'])
  })

  test('S1.4 FR-001 K0 has no path filter, so a docs-only pull request runs every job', () => {
    for (const [file, workflow] of both()) {
      const keys = allKeys(triggersOf(workflow))
      for (const filter of ['paths', 'paths-ignore', 'branches-ignore', 'tags-ignore']) expect(keys, `${file} ${filter}`).not.toContain(filter)
    }
  })

  test('S1.4 FR-001 FR-002 no job is skipped by which files changed: only the slow jobs skip, and only on a draft (D100)', () => {
    const SLOW = 'github.event.pull_request.draft != true'
    const slow = ['e2e', 'lighthouse', 'html', 'links']
    for (const [id, value] of Object.entries(jobsOf(ci()))) {
      if (id === 'gate') continue
      if (slow.includes(id)) expect(value.if, id).toBe(SLOW)
      else expect(value.if, id).toBeUndefined()
    }
    expect(triggersOf(ci()).pull_request).toMatchObject({ types: expect.arrayContaining(['ready_for_review']) })
    for (const { job: id, step } of allSteps(ci())) {
      expect(String(step.if ?? ''), `${id}: ${step.name ?? step.run ?? step.uses}`).not.toMatch(/files|paths|changed|diff/i)
    }
  })
})

describe('ci.yml: its jobs', () => {
  test("S1.1 FR-002 K0 has spec 002's eight jobs, which show the nine checks in the mocks, and every check name is unique", () => {
    expect(ci().name).toBe('ci')
    expect(Object.keys(jobsOf(ci()))).toEqual(expect.arrayContaining(CI_JOB_IDS))
    expect(checkNames(ci())).toEqual(
      expect.arrayContaining(['types', 'tests (ubuntu-24.04)', 'tests (windows-2025)', 'trace', 'privacy', 'secrets', 'commits', 'hygiene', 'gate']),
    )
    expect(new Set(checkNames(ci())).size).toBe(checkNames(ci()).length)
  })

  test("FR-002 each of spec 002's jobs runs its one script, so the workflow holds no logic", () => {
    for (const [id, pattern] of Object.entries(CI_SCRIPTS)) expect(runsOf(job(ci(), id)), id).toMatch(pattern)
  })

  test('S1.2 FR-002 FR-003 the gate needs every other job, runs even when one failed or was cancelled, and is named gate', () => {
    const gate = job(ci(), 'gate')
    const needs = Array.isArray(gate.needs) ? gate.needs : [gate.needs]
    expect([...needs].sort()).toEqual(Object.keys(jobsOf(ci())).filter((id) => id !== 'gate').sort())
    expect(String(gate.if ?? '')).toMatch(/\balways\(\)/)
    expect(gate.name ?? 'gate').toBe('gate')
  })

  test("S1.6 FR-003 the gate gets its workflow's needs as GATE_NEEDS, and nothing that could read GitHub's API", () => {
    const gate = job(ci(), 'gate')
    const permissions: unknown = gate.permissions ?? { contents: 'read' }
    expect(permissions).toEqual({ contents: 'read' })
    const steps = (gate.steps ?? []).filter((step) => /scripts\/ci\/gate\.ts/.test(step.run ?? ''))
    expect(steps).toHaveLength(1)
    expect(steps[0]?.env).toEqual({ GATE_NEEDS: '${{ toJSON(needs) }}' })
    expect(readFileSync(repoPath('scripts', 'ci', 'gate.ts'), 'utf8')).not.toMatch(/\bfetch\(|api\.github\.com|GITHUB_TOKEN|GITHUB_API_URL/)
  })

  test('S1.3 FR-002 FR-014 K2 the tests run on both pinned runners, and each reports its own result', () => {
    const tests = job(ci(), 'tests')
    expect(tests.strategy?.matrix?.os).toEqual(RUNNERS)
    expect(tests.strategy?.['fail-fast']).toBe(false)
    expect(String(tests['runs-on'])).toMatch(/^\$\{\{\s*matrix\.os\s*\}\}$/)
    for (const [id, value] of Object.entries(jobsOf(ci()))) {
      if (id !== 'tests') expect(String(value['runs-on']), id).toMatch(PINNED_RUNNER)
    }
  })

  test('S1.3 S3.6 FR-002 K2 no job or step may fail without failing its job', () => {
    for (const [file, workflow] of both()) {
      expect(allKeys(workflow), file).not.toContain('continue-on-error')
      for (const { job: id, step } of allSteps(workflow)) {
        expect(step.run ?? '', `${file} ${id}`).not.toMatch(/\|\|\s*(?:true|:|exit 0)\b|;\s*exit 0\b|\$LASTEXITCODE\s*=\s*0/)
      }
    }
  })
})

describe('ci.yml: newer pushes cancel older runs', () => {
  test('S1.5 FR-004 K1 one concurrency group per pull request cancels its older runs', () => {
    const concurrency = ci().concurrency as { group?: unknown; 'cancel-in-progress'?: unknown } | undefined
    expect(concurrency).toBeDefined()
    const group = String(concurrency?.group ?? '')
    expect(group).toMatch(/github\.event\.pull_request\.number|github\.head_ref|github\.ref\b/)
    const cancel = concurrency?.['cancel-in-progress']
    expect(cancel === true || (typeof cancel === 'string' && /pull_request/.test(cancel)), String(cancel)).toBe(true)
  })

  test("S1.5 FR-004 the lock workflow can't be cancelled by the CI workflow's group", () => {
    const ciGroup = String((ci().concurrency as { group?: unknown } | undefined)?.group ?? '')
    const lockGroup = (lockedTests().concurrency as { group?: unknown } | undefined)?.group
    if (lockGroup !== undefined) expect(String(lockGroup)).not.toBe(ciGroup)
    if (lockGroup === undefined) expect(ciGroup).toMatch(/github\.workflow|\bci\b/)
  })
})

describe('every workflow: pins and permissions', () => {
  test("FR-014 the folder holds spec 002's two workflows, and every file in it is a workflow these rules read", () => {
    const files = readdirSync(GITHUB.workflows)
    expect(files).toEqual(expect.arrayContaining(['ci.yml', 'locked-tests.yml']))
    for (const file of files) {
      expect(file).toMatch(/^[a-z0-9-]+\.yml$/)
      expect(Object.keys(jobsOf(readYaml<Workflow>(path.join(GITHUB.workflows, file)))).length, file).toBeGreaterThan(0)
    }
  })

  test('FR-014 every action is a first-party one pinned to a full commit hash, and each action has one pin across the workflows', () => {
    const pins = new Map<string, string>()
    for (const [file, workflow] of every()) {
      const uses = allSteps(workflow).map(({ step }) => step.uses).filter((value): value is string => value !== undefined)
      for (const value of uses) {
        expect(value, `${file} uses ${value}`).toMatch(PINNED_ACTION)
        const [action = '', ref = ''] = value.split('@')
        expect(pins.get(action) ?? ref, `${file} uses ${value}`).toBe(ref)
        pins.set(action, ref)
      }
      expect(Object.values(jobsOf(workflow)).every((value) => value.uses === undefined), `${file} calls no other workflow`).toBe(true)
    }
    expect(pins.has('actions/checkout')).toBe(true)
  })

  test("FR-014 the token is read-only by default everywhere, and checkouts don't keep it", () => {
    for (const [file, workflow] of every()) {
      expect(workflow.permissions, file).toEqual({ contents: 'read' })
      for (const { job: id, step } of allSteps(workflow)) {
        if (step.uses?.startsWith('actions/checkout@') === true) {
          expect(step.with?.['persist-credentials'], `${file} ${id}`).toBe(false)
        }
      }
    }
  })

  test("FR-014 a job holds a write permission only where a spec names it, and spec 002's workflows hold none", () => {
    for (const [file, workflow] of every()) {
      for (const [id, value] of Object.entries(jobsOf(workflow))) {
        if (typeof value.permissions === 'string') expect(value.permissions, `${file} ${id}`).not.toMatch(/write/)
        const levels = value.permissions !== null && typeof value.permissions === 'object' ? Object.entries(value.permissions) : []
        for (const [scope, level] of levels) {
          if (!/write/.test(String(level))) continue
          expect(SPEC_WRITES[file]?.[id]?.[scope], `${file} ${id} ${scope}: ${String(level)}`).toBe(String(level))
        }
      }
    }
    for (const [file, workflow] of both()) {
      for (const [id, value] of Object.entries(jobsOf(workflow))) {
        for (const level of permissionValues(value.permissions)) expect(level, `${file} ${id}`).not.toMatch(/write|write-all/)
      }
    }
  })

  test('FR-014 runner images, Node, pnpm and the tools each workflow installs are pinned', () => {
    for (const [file, workflow] of every()) {
      for (const [id, value] of Object.entries(jobsOf(workflow))) {
        expect(JSON.stringify(value['runs-on']), `${file} ${id}`).not.toMatch(/latest/)
      }
      for (const { job: id, step } of allSteps(workflow)) {
        if (step.uses?.startsWith('actions/setup-node@') === true) {
          expect(step.with?.['node-version-file'], `${file} ${id}`).toBe('.nvmrc')
          expect(step.with?.['node-version'], `${file} ${id}`).toBeUndefined()
        }
      }
      const text = readFileSync(path.join(GITHUB.workflows, file), 'utf8')
      if (/\bpnpm\b/.test(text)) expect(text, file).toMatch(/\bcorepack\b/)
      expect(text, file).not.toMatch(/\bnpm (?:install|i|ci)\b|\bnpx\b|pnpm\/action-setup|\bpnpm dlx\b/)
      for (const install of text.match(/pnpm install[^\n]*/g) ?? []) expect(install, file).toMatch(/--frozen-lockfile/)
    }
    expect(readFileSync(repoPath('.nvmrc'), 'utf8').trim()).toMatch(/^\d+\.\d+\.\d+$/)
    const text = readFileSync(GITHUB.ci, 'utf8')
    expect(text).toContain(GITLEAKS.version)
    expect(text).toContain(GITLEAKS.linux)
    expect(text).toContain(GITLEAKS.windows)
  })
})

describe('the private-term secret', () => {
  // The privacy step scans with the list. The commits, secrets and hygiene
  // steps print text from the pull request, so they get it to hide a place that
  // holds a term (D87).
  test('S2.5 FR-008 only the privacy, commits, secrets and hygiene steps get PRIVATE_TERMS, as an environment variable', () => {
    const ciStrings = allStrings(ci())
    const mentions = ciStrings.filter((value) => /\$\{\{[^}]*\bsecrets\b/.test(value))
    expect(new Set(mentions)).toEqual(new Set(['${{ secrets.PRIVATE_TERMS }}']))
    expect(ci().env ?? {}, 'workflow env').not.toHaveProperty('PRIVATE_TERMS')
    for (const [id, value] of Object.entries(jobsOf(ci()))) expect(value.env ?? {}, `${id} env`).not.toHaveProperty('PRIVATE_TERMS')
    const holders = allSteps(ci()).filter(({ step }) => step.env?.PRIVATE_TERMS !== undefined)
    expect(holders.map(({ job: id }) => id).sort()).toEqual(['commits', 'hygiene', 'privacy', 'secrets'])
    expect(mentions).toHaveLength(holders.length)
    for (const { job: id, step } of holders) {
      expect(step.env?.PRIVATE_TERMS, id).toBe('${{ secrets.PRIVATE_TERMS }}')
      expect(step.run ?? '', id).toMatch(CI_SCRIPTS[id] ?? /$^/)
    }
  })

  test("FR-008 no step prints, writes or uploads the list, and the lock workflow's one secret is the list, in the lock step", () => {
    for (const [file, workflow] of both()) {
      for (const { job: id, step } of allSteps(workflow)) {
        expect(step.run ?? '', `${file} ${id}`).not.toMatch(/PRIVATE_TERMS/)
      }
    }
    expect(readFileSync(GITHUB.ci, 'utf8')).not.toMatch(/secrets:\s*inherit|toJSON\(\s*secrets/)
    // Later specs pass the built site between jobs as an artifact, never from a job that gets the list (D95).
    const listJobs = new Set(allSteps(ci()).filter(({ step }) => step.env?.PRIVATE_TERMS !== undefined).map(({ job: id }) => id))
    for (const { job: id, step } of allSteps(ci())) {
      if (step.uses?.startsWith('actions/upload-artifact@') === true) expect(listJobs.has(id), `${id} uploads an artifact`).toBe(false)
    }
    const lockMentions = allStrings(lockedTests()).filter((value) => /\bsecrets\b/.test(value))
    expect(lockMentions).toEqual(['${{ secrets.PRIVATE_TERMS }}'])
    const holders = allSteps(lockedTests()).filter(({ step }) => step.env?.PRIVATE_TERMS !== undefined)
    expect(holders).toHaveLength(1)
    expect(holders[0]?.step.run ?? '').toMatch(/^node scripts\/ci\/lock\.ts$/)
  })

  test("FR-005 FR-008 no run step reads the pull request's text or branch name through an expression", () => {
    for (const [file, workflow] of both()) {
      for (const { job: id, step } of allSteps(workflow)) {
        for (const expression of expressions(step.run ?? '')) {
          expect(expression, `${file} ${id}`).not.toMatch(/title|body|head_ref|head\.ref|label|message|commits|secrets|inputs/)
        }
      }
    }
  })
})

describe("locked-tests.yml: main's copy of the check", () => {
  test('S3.3 FR-011 K8 runs on pull_request_target only, as one job named lock', () => {
    const workflow = lockedTests()
    expect(workflow.name).toBe('locked-tests')
    expect(Object.keys(triggersOf(workflow))).toEqual(['pull_request_target'])
    const types = ((triggersOf(workflow).pull_request_target ?? {}) as { types?: string[] }).types
    if (types !== undefined) for (const type of ['opened', 'synchronize', 'reopened']) expect(types).toContain(type)
    expect(Object.keys(jobsOf(workflow))).toEqual(['lock'])
    expect(job(workflow, 'lock').name ?? 'lock').toBe('lock')
    expect(job(workflow, 'lock')['runs-on']).toBe('ubuntu-24.04')
  })

  test("S3.3 FR-011 K8 checks out main's copy, never the pull request's head", () => {
    const checkouts = stepsOf(job(lockedTests(), 'lock')).filter((step) => step.uses?.startsWith('actions/checkout@') === true)
    expect(checkouts.length).toBeGreaterThan(0)
    for (const step of checkouts) {
      const ref = String(step.with?.ref ?? '')
      expect(ref).not.toMatch(/head|merge|github\.sha|pull/)
      expect(step.with?.repository).toBeUndefined()
    }
  })

  test("S3.3 FR-011 K8 fetches the head as objects and runs main's lock check, installing and running nothing from the pull request", () => {
    const runs = runsOf(job(lockedTests(), 'lock'))
    expect(runs).toMatch(/\bgit fetch\b[^\n]*(?:pull\/|head\.sha)/)
    expect(runs).toMatch(/\bnode scripts\/ci\/lock\.ts\b/)
    expect(runs).not.toMatch(/\b(?:pnpm|npm|npx|yarn|corepack|bun|deno)\b/)
    expect(runs).not.toMatch(/\bgit\s+(?:checkout|switch|worktree|reset|merge|pull|restore|apply|am)\b/)
    const scripts = [...runs.matchAll(/\bnode\s+(\S+)/g)].map((match) => match[1])
    expect(scripts).toEqual(['scripts/ci/lock.ts'])
  })
})

describe('pr-text.yml: the text check (FR-022, D115)', () => {
  const prText = (): Workflow => readYaml<Workflow>(repoPath('.github', 'workflows', 'pr-text.yml'))
  const SCRIPTS = ['node scripts/ci/privacy.ts', 'node scripts/ci/commits.ts']

  test('S2.6 FR-022 runs on every pull request event that sets or changes its text or its head, and on nothing else', () => {
    const workflow = prText()
    expect(workflow.name).toBe('pr-text')
    const on = triggersOf(workflow)
    expect(Object.keys(on)).toEqual(['pull_request'])
    const types = ((on.pull_request ?? {}) as { types?: string[] }).types ?? []
    expect([...types].sort()).toEqual(['edited', 'opened', 'ready_for_review', 'reopened', 'synchronize'])
    const concurrency = workflow.concurrency as { group?: unknown; 'cancel-in-progress'?: unknown } | undefined
    expect(String(concurrency?.group ?? '')).toMatch(/github\.event\.pull_request\.number/)
    expect(concurrency?.['cancel-in-progress']).toBe(true)
  })

  test('S2.6 FR-022 has one job, text, holding only contents: read, which runs the privacy and commits scripts on the text alone', () => {
    const workflow = prText()
    expect(Object.keys(jobsOf(workflow))).toEqual(['text'])
    expect(workflow.permissions).toEqual({ contents: 'read' })
    const text = job(workflow, 'text')
    const permissions: unknown = text.permissions ?? { contents: 'read' }
    expect(permissions).toEqual({ contents: 'read' })
    expect(text['runs-on']).toBe('ubuntu-24.04')
    expect(text.if).toBeUndefined()
    const checks = (text.steps ?? []).filter((step) => SCRIPTS.some((script) => (step.run ?? '').includes(script)))
    expect(checks.map((step) => step.run?.trim())).toEqual(SCRIPTS)
    for (const step of checks) expect(step.env, step.run).toEqual({ PR_TEXT: 'only', PRIVATE_TERMS: '${{ secrets.PRIVATE_TERMS }}' })
  })

  test('S2.6 FR-008 FR-022 only the two check steps get the private-term secret, and no run step reads the text through an expression', () => {
    const workflow = prText()
    const mentions = allStrings(workflow).filter((value) => /\bsecrets\b/.test(value))
    expect(mentions).toEqual(['${{ secrets.PRIVATE_TERMS }}', '${{ secrets.PRIVATE_TERMS }}'])
    for (const { step } of allSteps(workflow)) {
      expect(step.run ?? '').not.toMatch(/\$\{\{/)
      expect(step.run ?? '').not.toMatch(/PRIVATE_TERMS/)
    }
  })

  test("FR-003 FR-005 FR-010 ci.yml's privacy and commits steps skip the title and description, which only the text check reads", () => {
    for (const [id, script] of [
      ['privacy', 'node scripts/ci/privacy.ts'],
      ['commits', 'node scripts/ci/commits.ts'],
    ] as const) {
      const steps = (job(ci(), id).steps ?? []).filter((step) => (step.run ?? '').includes(script))
      expect(steps, id).toHaveLength(1)
      expect(steps[0]?.env?.PR_TEXT, id).toBe('skip')
    }
  })
})
