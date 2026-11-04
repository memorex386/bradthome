import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { allSteps, jobsOf, type Job, readYaml, runsOf, triggersOf, type Workflow } from '../../002/helpers/workflows.ts'
import { REPO_ROOT } from '../helpers/fake-cloud.ts'

// The release and rollback workflows (spec 008, issue #29: S1.1, S1.2, S2.1,
// FR-001 to FR-003, FR-005, FR-007). Spec 002's rules for every workflow
// (pins, read-only tokens, kept credentials) apply to these too.

const WORKFLOWS = path.join(REPO_ROOT, '.github', 'workflows')
const release = (): Workflow => readYaml<Workflow>(path.join(WORKFLOWS, 'release.yml'))
const rollback = (): Workflow => readYaml<Workflow>(path.join(WORKFLOWS, 'rollback.yml'))
const every = (): [string, Workflow][] => readdirSync(WORKFLOWS).map((file) => [file, readYaml<Workflow>(path.join(WORKFLOWS, file))])

type EnvJob = Job & { environment?: unknown; outputs?: Record<string, string> }

function job(workflow: Workflow, id: string): EnvJob {
  const found = jobsOf(workflow)[id] as EnvJob | undefined
  expect(found, `job ${id}`).toBeDefined()
  return found ?? {}
}

const needsOf = (value: Job): string[] => (Array.isArray(value.needs) ? value.needs : value.needs === undefined ? [] : [value.needs])
const environmentOf = (value: EnvJob): string | undefined =>
  typeof value.environment === 'string' ? value.environment : (value.environment as { name?: string } | undefined)?.name

/** Each ${{ … }} expression in a text. */
const expressions = (text: string): string[] => [...text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map((match) => (match[1] ?? '').trim())

/** Whether a job installs or builds anything. */
const INSTALLS = /\bpnpm\s+(?:install|i|add)\b|\bnpm\s+(?:install|i|ci)\b|site:build|\bfirebase\b|corepack/

describe('release.yml', () => {
  test('S1.1 FR-001 runs only by hand, with one choice: whether the words may change', () => {
    const workflow = release()
    expect(workflow.name).toBe('release')
    const on = triggersOf(workflow)
    expect(Object.keys(on)).toEqual(['workflow_dispatch'])
    const inputs = ((on.workflow_dispatch ?? {}) as { inputs?: Record<string, { type?: string; default?: unknown }> }).inputs ?? {}
    expect(Object.keys(inputs)).toEqual(['words-may-change'])
    expect(inputs['words-may-change']).toMatchObject({ type: 'boolean', default: false })
  })

  test('S1.1 FR-002 has build, stage and release, in that order, and only release waits in production', () => {
    expect(Object.keys(jobsOf(release()))).toEqual(['build', 'stage', 'release'])
    expect(needsOf(job(release(), 'stage'))).toEqual(['build'])
    expect(needsOf(job(release(), 'release'))).toEqual(['stage'])
    expect(environmentOf(job(release(), 'build'))).toBeUndefined()
    expect(environmentOf(job(release(), 'stage'))).toBeUndefined()
    expect(environmentOf(job(release(), 'release'))).toBe('production')
    for (const id of ['build', 'stage', 'release']) expect(job(release(), id)['runs-on'], id).toBe('ubuntu-24.04')
  })

  test('S1.1 one release at a time, and a newer run never cancels one already going', () => {
    const concurrency = release().concurrency as { group?: unknown; 'cancel-in-progress'?: unknown }
    expect(concurrency.group).toBe('release')
    expect(concurrency['cancel-in-progress']).toBe(false)
  })

  test('S1.2 FR-001 build checks the tag first, with the whole history, before it installs or builds', () => {
    const build = job(release(), 'build')
    expect(build.permissions ?? { contents: 'read' }).toEqual({ contents: 'read' })
    const steps = build.steps ?? []
    const checkout = steps.find((step) => step.uses?.startsWith('actions/checkout@') === true)
    expect(checkout?.with?.['fetch-depth']).toBe(0)
    const runs = steps.map((step) => step.run ?? '')
    const tag = runs.findIndex((run) => /\bnode scripts\/release\/tag-check\.ts\b/.test(run))
    const install = runs.findIndex((run) => /pnpm install/.test(run))
    expect(tag).toBeGreaterThanOrEqual(0)
    expect(install).toBeGreaterThan(tag)
    expect(runsOf(build)).toMatch(/pnpm site:build/)
  })

  test('S1.1 FR-002 stage signs in as the preview account, never the release account, and runs the stage script', () => {
    const stage = job(release(), 'stage')
    expect(stage.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    expect(runsOf(stage)).toMatch(/\bnode scripts\/release\/stage\.ts\b/)
    const text = JSON.stringify(stage)
    expect(text).toMatch(/vars\.GCP_PREVIEW_SERVICE_ACCOUNT/)
    expect(text).not.toMatch(/GCP_RELEASE_SERVICE_ACCOUNT/)
    expect(stage.outputs?.version).toMatch(/steps\.stage\.outputs\.version/)
  })

  test('S1.3 FR-003 release installs and builds nothing: it runs one repo script with Node, on the version stage handed it', () => {
    const value = job(release(), 'release')
    expect(value.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    expect(runsOf(value)).not.toMatch(INSTALLS)
    const uses = (value.steps ?? []).map((step) => step.uses).filter((use) => use !== undefined)
    expect(uses.every((use) => /^actions\/(?:checkout|setup-node)@/.test(use ?? ''))).toBe(true)
    expect(runsOf(value).trim().split('\n').filter((line) => line.trim() !== '')).toEqual(['node scripts/release/release.ts'])
    const env = (value.steps ?? []).map((step) => step.env ?? {}).find((entry) => 'RELEASE_VERSION' in entry) ?? {}
    expect(env.RELEASE_VERSION).toMatch(/needs\.stage\.outputs\.version/)
    expect(env.GCP_RELEASE_SERVICE_ACCOUNT).toMatch(/vars\.GCP_RELEASE_SERVICE_ACCOUNT/)
  })
})

describe('rollback.yml', () => {
  test('S2.1 FR-005 runs only by hand, in production, with an optional version', () => {
    const workflow = rollback()
    expect(workflow.name).toBe('rollback')
    const on = triggersOf(workflow)
    expect(Object.keys(on)).toEqual(['workflow_dispatch'])
    const inputs = ((on.workflow_dispatch ?? {}) as { inputs?: Record<string, { type?: string; required?: boolean; default?: unknown }> }).inputs ?? {}
    expect(Object.keys(inputs)).toEqual(['version'])
    expect(inputs.version).toMatchObject({ type: 'string', required: false, default: '' })
    expect(Object.keys(jobsOf(workflow))).toEqual(['rollback'])
    expect(environmentOf(job(workflow, 'rollback'))).toBe('production')
  })

  test('S2.1 FR-005 a rollback queues apart from releases, so a release waiting for approval never holds it up', () => {
    const concurrency = rollback().concurrency as { group?: unknown; 'cancel-in-progress'?: unknown }
    expect(concurrency.group).toBe('rollback')
    expect(concurrency['cancel-in-progress']).toBe(false)
  })

  test('S2.1 FR-005 FR-007 installs nothing and runs one repo script, with the version passed through the environment', () => {
    const value = job(rollback(), 'rollback')
    expect(value.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    expect(runsOf(value)).not.toMatch(INSTALLS)
    expect(runsOf(value).trim().split('\n').filter((line) => line.trim() !== '')).toEqual(['node scripts/release/rollback.ts'])
    const env = (value.steps ?? []).map((step) => step.env ?? {}).find((entry) => 'ROLLBACK_VERSION' in entry) ?? {}
    expect(env.ROLLBACK_VERSION).toMatch(/inputs\.version/)
  })
})

describe('every workflow', () => {
  test('FR-002 only release.yml\'s release job and rollback.yml\'s rollback job name the release account or the production environment', () => {
    const holders: string[] = []
    for (const [file, workflow] of every()) {
      for (const [id, value] of Object.entries(jobsOf(workflow))) {
        const text = JSON.stringify(value)
        if (/GCP_RELEASE_SERVICE_ACCOUNT|production/.test(text)) holders.push(`${file} ${id}`)
      }
      expect(JSON.stringify(workflow.env ?? {}), file).not.toMatch(/GCP_RELEASE_SERVICE_ACCOUNT/)
    }
    expect(holders.sort()).toEqual(['release.yml release', 'rollback.yml rollback'])
  })

  test('FR-007 the release and rollback read no secret, and no run step interpolates an input or a variable', () => {
    for (const workflow of [release(), rollback()]) {
      expect(JSON.stringify(workflow)).not.toMatch(/\bsecrets\./)
      for (const { job: id, step } of allSteps(workflow)) {
        for (const expression of expressions(step.run ?? '')) expect(expression, id).not.toMatch(/\binputs\.|\bvars\.|needs\./)
      }
    }
  })

  test('FR-007 the sign-in code writes no token to a file and prints none', () => {
    for (const file of ['token.ts', 'release.ts', 'rollback.ts', 'hosting.ts']) {
      const text = readFileSync(path.join(REPO_ROOT, 'scripts', 'release', file), 'utf8')
      expect(text, file).not.toMatch(/writeFileSync|appendFileSync|createWriteStream/)
      expect(text, file).not.toMatch(/(?:print|console\.log)\([^)]*\btoken\b/i)
    }
  })
})
