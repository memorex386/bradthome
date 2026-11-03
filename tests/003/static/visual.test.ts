import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { jobsOf, type Job, readYaml, stepsOf, type Workflow } from '../../002/helpers/workflows.ts'
import { CONFIG, CONTAINER, GITHUB, SCRIPTS } from '../helpers/paths.ts'

// The end-to-end setup (FR-010, FR-011, S2.4, S2.7): one pinned container, by
// digest, in CI and on Brad's PC; no pixel tolerance; reduced motion; and the
// diffs kept in the run's artifacts.

const text = (file: string): string => readFileSync(file, 'utf8')
const digestIn = (value: string): string | undefined => CONTAINER.exec(value)?.[0]
const containerOf = (value: Job | undefined): string => JSON.stringify((value as (Job & { container?: unknown }) | undefined)?.container ?? '')

describe('one container for every snapshot', () => {
  test('S2.7 FR-011 CI, Lighthouse and pnpm test:visual use the same image, by the same digest', () => {
    const jobs = jobsOf(readYaml<Workflow>(GITHUB.ci))
    const local = digestIn(text(SCRIPTS.visual))
    expect(local).toBeDefined()
    expect([digestIn(containerOf(jobs.e2e)), digestIn(containerOf(jobs.lighthouse))]).toEqual([local, local])
  })

  test('S2.7 FR-011 pnpm test:visual runs the tests in that container through Docker, and --update writes new baselines', () => {
    const scripts = (JSON.parse(text(CONFIG.rootPackage)) as { scripts?: Record<string, string> }).scripts ?? {}
    expect(scripts['test:visual']).toMatch(/^node scripts\/site\/visual\.ts\b/)
    const visual = text(SCRIPTS.visual)
    expect(visual).toMatch(/['"]docker['"]/)
    expect(visual).toMatch(/['"]run['"]/)
    expect(visual).toMatch(/BRADTHOME_CONTAINER/)
    expect(visual).toMatch(/--update\b/)
    expect(visual).toMatch(/--update-snapshots\b/)
  })

  test('S2.7 FR-011 the plain test commands never run snapshots outside the container', () => {
    const config = text(CONFIG.playwright)
    expect(config).toMatch(/process\.env\.BRADTHOME_CONTAINER\s*!==\s*['"]1['"]/)
    expect(config).toMatch(/throw new Error/)
    const scripts = (JSON.parse(text(CONFIG.rootPackage)) as { scripts?: Record<string, string> }).scripts ?? {}
    for (const name of ['test', 'test:unit']) expect(scripts[name] ?? '', name).not.toMatch(/playwright/)
    for (const [id, value] of Object.entries(jobsOf(readYaml<Workflow>(GITHUB.ci)))) {
      const runs = stepsOf(value)
        .map((step) => step.run ?? '')
        .join('\n')
      if (/\bpnpm (?:run )?test:e2e\b|playwright test/.test(runs)) expect(id).toBe('e2e')
    }
  })
})

describe('the snapshot rules', () => {
  test('S2.4 FR-011 no pixel tolerance, reduced motion on, and animations held still', () => {
    const config = text(CONFIG.playwright)
    expect(config).toMatch(/maxDiffPixels:\s*0\b/)
    expect(config).toMatch(/threshold:\s*0\b/)
    expect(config).not.toMatch(/maxDiffPixelRatio/)
    expect(config).toMatch(/reducedMotion:\s*['"]reduce['"]/)
    expect(config).toMatch(/animations:\s*['"]disabled['"]/)
  })

  test("S2.4 FR-010 C2 the e2e job keeps the report and every diff image in the run's artifacts when it fails", () => {
    const e2e = jobsOf(readYaml<Workflow>(GITHUB.ci)).e2e
    const onFailure = stepsOf(e2e).filter(
      (step) => step.uses?.startsWith('actions/upload-artifact@') === true && /\bfailure\(\)/.test(String(step.if ?? '')),
    )
    expect(onFailure.length).toBeGreaterThan(0)
    const paths = onFailure.map((step) => String(step.with?.path ?? '')).join('\n')
    expect(paths).toMatch(/test-results/)
    expect(paths).toMatch(/playwright-report/)
  })

  test('FR-010 FR-011 the end-to-end tests serve the build through the Hosting emulator, with a demo project and no login', () => {
    const config = text(CONFIG.playwright)
    expect(config).toMatch(/firebase emulators:start --only hosting --project demo-[\w-]+/)
    expect(config).toMatch(/testMatch:\s*['"]\*\/e2e\/\*\*\/\*\.test\.ts['"]/)
  })
})
