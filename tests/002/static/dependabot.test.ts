import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { GITHUB } from '../helpers/paths.ts'
import { allKeys, readYaml } from '../helpers/workflows.ts'

// Dependabot's config (S4.1–S4.3, D1): the packages and the Actions, weekly,
// one group each, a 3-day cooldown, and nothing that merges its pull requests.

interface Update {
  'package-ecosystem'?: string
  directory?: string
  directories?: string[]
  schedule?: { interval?: string }
  groups?: Record<string, { patterns?: string[]; 'exclude-patterns'?: string[]; 'dependency-type'?: string }>
  cooldown?: { 'default-days'?: number }
  'commit-message'?: { prefix?: string; 'prefix-development'?: string; include?: string }
  'open-pull-requests-limit'?: number
}

interface Config {
  version?: number
  updates?: Update[]
}

const config = (): Config => readYaml<Config>(GITHUB.dependabot)

function entry(ecosystem: string): Update {
  const found = (config().updates ?? []).filter((update) => update['package-ecosystem'] === ecosystem)
  expect(found, ecosystem).toHaveLength(1)
  return found[0] ?? {}
}

describe("Dependabot's config", () => {
  test('S4.1 FR-015 D1 updates the packages and the Actions, and nothing else, from the repo root', () => {
    expect(config().version).toBe(2)
    expect((config().updates ?? []).map((update) => update['package-ecosystem']).sort()).toEqual(['github-actions', 'npm'])
    for (const ecosystem of ['npm', 'github-actions']) {
      const update = entry(ecosystem)
      expect(update.directory ?? update.directories?.[0], ecosystem).toBe('/')
    }
  })

  test('S4.1 FR-015 D1 runs weekly, with one group for everything, so each run opens at most one pull request per ecosystem', () => {
    for (const ecosystem of ['npm', 'github-actions']) {
      const update = entry(ecosystem)
      expect(update.schedule?.interval, ecosystem).toBe('weekly')
      const groups = Object.values(update.groups ?? {})
      expect(groups, ecosystem).toHaveLength(1)
      expect(groups[0]?.patterns, ecosystem).toEqual(['*'])
      expect(groups[0]?.['exclude-patterns'], ecosystem).toBeUndefined()
      expect(groups[0]?.['dependency-type'], ecosystem).toBeUndefined()
    }
  })

  test('S4.2 FR-015 waits 3 days after a release before proposing it', () => {
    for (const ecosystem of ['npm', 'github-actions']) expect(entry(ecosystem).cooldown?.['default-days'], ecosystem).toBe(3)
  })

  test('S3.2 FR-015 D1 its commits use the build prefix with a scope, so they pass the format rules', () => {
    for (const ecosystem of ['npm', 'github-actions']) {
      const message = entry(ecosystem)['commit-message']
      expect(message?.prefix, ecosystem).toBe('build')
      expect(message?.include, ecosystem).toBe('scope')
      if (message?.['prefix-development'] !== undefined) expect(message['prefix-development'], ecosystem).toBe('build')
    }
  })

  test('S4.3 FR-015 D1 nothing merges or approves its pull requests: no setting and no workflow does', () => {
    const keys = allKeys(config()).map((key) => key.toLowerCase())
    for (const key of ['automerge', 'auto-merge', 'auto_merge']) expect(keys).not.toContain(key)
    for (const file of readdirSync(GITHUB.workflows)) {
      const text = readFileSync(path.join(GITHUB.workflows, file), 'utf8')
      expect(text, file).not.toMatch(/\bgh\s+pr\s+(?:merge|review)\b|--auto\b|enable-auto-merge|automerge|fetch-metadata/i)
      // pull-requests: write only in the preview's comment job, which posts its link and nothing else (D99).
      const jobs = Object.entries(readYaml<{ jobs?: Record<string, { permissions?: unknown }> }>(path.join(GITHUB.workflows, file)).jobs ?? {})
      const holders = jobs.filter(([, job]) => /"pull-requests":"write"/.test(JSON.stringify(job.permissions ?? {}))).map(([id]) => `${file} ${id}`)
      expect(holders, file).toEqual(file === 'preview.yml' ? ['preview.yml comment'] : [])
      // The previews workflow asks its GitHub App's token for it, to open the refresh pull request (spec 016, D149).
      expect(text.match(/pull-requests:\s*write/gi)?.length ?? 0, file).toBe(file === 'preview.yml' || file === 'previews.yml' ? 1 : 0)
      if (file === 'previews.yml') expect(text.match(/permission-pull-requests:\s*write/g)).toEqual(['permission-pull-requests: write'])
    }
  })
})
