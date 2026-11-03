import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { budgetId, costGuard, dryRun } from '../../../apps/cost-guard/src/index.ts'

// The guard's function as Firebase deploys it (FR-001, FR-006, FR-011,
// FR-013, S4.1, D104). It reads the settings off the exported function, the
// same object the Firebase CLI reads when it deploys.

const PACKAGE = path.resolve('apps/cost-guard')
const EXACT = /^\d+\.\d+\.\d+$/
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(PACKAGE, file), 'utf8')) as T

/** The param as the Firebase CLI reads it at deploy time. toSpec is public at run time but missing from the types. */
const spec = (param: unknown): { name: string; type: string; default?: unknown } =>
  (param as { toSpec(): { name: string; type: string; default?: unknown } }).toSpec()

describe('the function', () => {
  const endpoint = costGuard.__endpoint

  test('FR-001 is a 2nd gen function in us-central1, started by the topic cost-guard', () => {
    expect(endpoint.platform).toBe('gcfv2')
    expect(endpoint.region).toEqual(['us-central1'])
    expect(endpoint.eventTrigger).toMatchObject({
      eventType: 'google.cloud.pubsub.topic.v1.messagePublished',
      eventFilters: { topic: 'cost-guard' },
    })
  })

  test('S4.1 FR-011 runs one instance at most, keeps none warm, uses 256 MiB, times out in 60 seconds and never retries', () => {
    expect(endpoint.maxInstances).toBe(1)
    expect(endpoint.minInstances).toBe(0)
    expect(endpoint.availableMemoryMb).toBe(256)
    expect(endpoint.timeoutSeconds).toBe(60)
    expect(endpoint.eventTrigger).toMatchObject({ retry: false })
  })

  test('FR-001 FR-007 runs as its own service account in bradthome', () => {
    expect(endpoint.serviceAccountEmail).toBe('cost-guard@bradthome.iam.gserviceaccount.com')
  })

  test('FR-006 dry-run defaults to on', () => {
    expect(spec(dryRun)).toMatchObject({ name: 'DRY_RUN', type: 'boolean', default: true })
  })

  test('FR-013 the budget ID is a param with no default, set at deploy time', () => {
    const budget = spec(budgetId)
    expect(budget).toMatchObject({ name: 'BUDGET_ID', type: 'string' })
    expect(budget.default).toBeUndefined()
  })
})

describe('the package', () => {
  test('FR-001 is the private workspace package @bradthome/cost-guard, on Node 22, with exact versions', () => {
    const manifest = readJson<{ name: string; private: boolean; engines: { node: string }; dependencies: Record<string, string> }>('package.json')
    expect(manifest.name).toBe('@bradthome/cost-guard')
    expect(manifest.private).toBe(true)
    expect(manifest.engines.node).toBe('22')
    for (const [name, version] of Object.entries(manifest.dependencies)) expect(version, name).toMatch(EXACT)
    expect(Object.keys(manifest.dependencies).sort()).toEqual(['@google-cloud/billing', 'firebase-admin', 'firebase-functions'])
  })

  test("FR-001 FR-012 has its own Firebase config with only the functions block, and leaves the root's alone", () => {
    const config = readJson<Record<string, unknown>>('firebase.json')
    expect(Object.keys(config)).toEqual(['functions'])
    expect(config.functions).toMatchObject({ source: '.', runtime: 'nodejs22' })
    const root = JSON.parse(readFileSync(path.resolve('firebase.json'), 'utf8')) as Record<string, unknown>
    expect(root.functions).toBeUndefined()
  })

  test('FR-013 holds no billing account ID, budget ID or email address in its source or config', () => {
    const files = ['package.json', 'firebase.json', 'tsconfig.json', ...readdirSync(path.join(PACKAGE, 'src')).map((file) => `src/${file}`)]
    for (const file of files) {
      const text = readFileSync(path.join(PACKAGE, file), 'utf8')
      expect(text, file).not.toMatch(/\b[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}\b/i)
      expect(text, file).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i)
      expect(text.replaceAll('cost-guard@bradthome.iam.gserviceaccount.com', ''), file).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/)
    }
  })

  test('FR-013 the deploy-time env file is ignored by git', () => {
    const ignore = readFileSync(path.resolve('.gitignore'), 'utf8')
    expect(ignore).toMatch(/^\.env\.\*$/m)
  })
})
