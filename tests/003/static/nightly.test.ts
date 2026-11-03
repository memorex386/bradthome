import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { jobsOf, type Job, readYaml, runsOf, triggersOf, type Workflow } from '../../002/helpers/workflows.ts'
import { CONFIG, GITHUB, LYCHEE, SCRIPTS } from '../helpers/paths.ts'

// The nightly workflow (FR-020, FR-021, S5.1, S5.2, N1): external links and
// mutation testing, reported in the run's summary, on a schedule and by hand,
// never on a pull request and never required.

const nightly = (): Workflow => readYaml<Workflow>(GITHUB.nightly)

function job(id: string): Job {
  const found = jobsOf(nightly())[id]
  expect(found, `job ${id}`).toBeDefined()
  return found ?? {}
}

describe('when it runs', () => {
  test('S5.1 FR-020 N1 runs nightly and by hand, never on a pull request or a push, so it never blocks one', () => {
    const workflow = nightly()
    expect(workflow.name).toBe('nightly')
    const on = triggersOf(workflow)
    expect(Object.keys(on).sort()).toEqual(['schedule', 'workflow_dispatch'])
    const schedule = on.schedule as { cron?: string }[] | undefined
    expect(schedule).toHaveLength(1)
    expect(schedule?.[0]?.cron).toMatch(/^\S+ \S+ \* \* \*$/)
  })

  test('FR-020 FR-021 N1 is read-only, and neither the gate nor the ruleset requires it', () => {
    expect(nightly().permissions).toEqual({ contents: 'read' })
    for (const [id, value] of Object.entries(jobsOf(nightly()))) {
      expect(JSON.stringify(value.permissions ?? {}), id).not.toMatch(/write/)
      expect(value['runs-on'], id).toBe('ubuntu-24.04')
    }
    expect(readFileSync(GITHUB.ruleset, 'utf8')).not.toMatch(/nightly/)
    expect(readFileSync(SCRIPTS.gate, 'utf8')).not.toMatch(/nightly/)
    expect(readFileSync(GITHUB.ci, 'utf8')).not.toMatch(/nightly/)
  })
})

describe('its two jobs', () => {
  test('S5.1 FR-020 FR-021 N1 links builds the site and runs the pinned lychee online over its external links', () => {
    expect(Object.keys(jobsOf(nightly())).sort()).toEqual(['links', 'mutation'])
    const links = job('links')
    const text = JSON.stringify(links)
    expect(text).toContain(LYCHEE.version)
    expect(text).toContain(LYCHEE.sha256)
    const runs = runsOf(links)
    expect(runs).toMatch(/\bpnpm (?:run )?site:build\b/)
    expect(runs).toMatch(/\blychee\b/)
    expect(runs).not.toMatch(/--offline\b/)
    expect(readFileSync(CONFIG.lychee, 'utf8'), 'lychee.toml, which lychee reads by default').not.toMatch(/^\s*offline\s*=\s*true/m)
    expect(runs).toMatch(/\bnode scripts\/ci\/nightly-summary\.ts\b/)
    expect(runs).toMatch(/GITHUB_STEP_SUMMARY/)
  })

  test('S5.2 FR-020 N1 mutation runs StrykerJS with the Vitest runner on the safety scripts, with no threshold', () => {
    const runs = runsOf(job('mutation'))
    expect(runs).toMatch(/\bpnpm (?:run )?mutation\b|\bpnpm exec stryker run\b/)
    expect(runs).toMatch(/\bnode scripts\/ci\/nightly-summary\.ts\b/)
    expect(runs).toMatch(/GITHUB_STEP_SUMMARY/)
    const stryker = JSON.parse(readFileSync(CONFIG.stryker, 'utf8')) as {
      testRunner?: string
      mutate?: string[]
      thresholds?: { break?: number | null }
      reporters?: string[]
    }
    expect(stryker.testRunner).toBe('vitest')
    expect(stryker.mutate ?? []).toEqual(expect.arrayContaining([expect.stringMatching(/^scripts\/lib\//), expect.stringMatching(/^scripts\/hooks\//)]))
    expect(stryker.thresholds?.break ?? null).toBeNull()
    expect(stryker.reporters ?? []).toContain('json')
  })
})
