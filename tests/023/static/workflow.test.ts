import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { EXPECTED_JOBS } from '../../../scripts/ci/gate.ts'

// Spec 023, Story 5 and FR-008: the evals run only in CI, from evals.yml,
// which is the only file that reads the key, and ci / evals gates main.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const WORKFLOWS = path.join(ROOT, '.github', 'workflows')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')

interface Step {
  name?: string
  run?: string
  uses?: string
  if?: string
  env?: Record<string, string>
  with?: Record<string, unknown>
}
interface Job {
  needs?: string[]
  steps?: Step[]
}
interface Workflow {
  on: Record<string, { branches?: string[] } | null>
  permissions?: Record<string, string>
  env?: Record<string, string>
  jobs: Record<string, Job>
}

const workflow = (name: string) => parse(read('.github', 'workflows', name)) as Workflow

describe('the evals workflow', () => {
  test('S5.1 FR-011 runs on a push to evals/** and by hand, runs pnpm evals, and uploads the results even when a case fails', () => {
    const evals = workflow('evals.yml')
    expect(Object.keys(evals.on).sort()).toEqual(['push', 'workflow_dispatch'])
    expect(evals.on.push?.branches).toEqual(['evals/**'])
    const steps = evals.jobs.run?.steps ?? []
    expect(steps.some((step) => step.run === 'pnpm evals')).toBe(true)
    const upload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'))
    expect(upload?.if).toBe('always()')
    expect(upload?.with?.path).toBe('apps/evals/results.json')
    expect(upload?.uses).toMatch(/@[0-9a-f]{40}$/)
  })

  test('S5.2 FR-011 D192 reads the key in the eval step only, can only read the repo, and no other workflow names the key', () => {
    const evals = workflow('evals.yml')
    expect(evals.permissions).toEqual({ contents: 'read' })
    expect(evals.env ?? {}).not.toHaveProperty('ANTHROPIC_EVALS_KEY')
    const holders = (evals.jobs.run?.steps ?? []).filter((step) => step.env?.ANTHROPIC_EVALS_KEY !== undefined)
    expect(holders.map((step) => step.run)).toEqual(['pnpm evals'])
    expect(holders[0]?.env?.ANTHROPIC_EVALS_KEY).toBe('${{ secrets.ANTHROPIC_EVALS_KEY }}')
    for (const name of readdirSync(WORKFLOWS).filter((file) => file !== 'evals.yml')) {
      expect(read('.github', 'workflows', name), name).not.toMatch(/ANTHROPIC_EVALS_KEY/)
    }
  })

  test('S5.2 D193 no workflow that deploys runs on a push to evals/**', () => {
    for (const name of readdirSync(WORKFLOWS).filter((file) => file !== 'evals.yml')) {
      const on = workflow(name).on
      const branches = on.push?.branches ?? []
      expect(branches.some((branch) => branch.startsWith('evals')), name).toBe(false)
      if (on.push !== undefined && on.push !== null) expect(branches.length > 0 || Object.keys(on.push).includes('tags'), name).toBe(true)
    }
  })

  test('FR-008 ci / evals runs the fresh-run check, and the gate needs it', () => {
    const ci = workflow('ci.yml')
    expect((ci.jobs.evals?.steps ?? []).map((step) => step.run).filter(Boolean)).toContain('node scripts/ci/evals.ts')
    expect(ci.jobs.gate?.needs).toContain('evals')
    expect(EXPECTED_JOBS).toContain('evals')
  })

  test('S3.3 FR-008 the pre-push hook runs the same check on what a push to main sends, and only to main', () => {
    const hook = read('scripts', 'hooks', 'pre-push.ts')
    expect(hook).toMatch(/import \{ evalsProblems \} from '\.\.\/lib\/evals\.ts'/)
    expect(hook).toMatch(/update\.remoteRef === 'refs\/heads\/main'/)
    expect(hook).toMatch(/runGit\(\['show', `\$\{toMain\.localSha\}:\$\{file\}`\]/)
  })

  test("FR-001 pnpm evals runs the eval config, which pnpm test's config never includes", () => {
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts
    expect(scripts.evals).toBe('vitest run --config vitest.evals.config.ts')
    expect(read('vitest.evals.config.ts')).toMatch(/include: \['apps\/evals\/src\/\*\*\/\*\.eval\.ts'\]/)
    expect(read('vitest.config.ts')).not.toMatch(/\.eval\.ts|apps\/evals/)
  })
})
