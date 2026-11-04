import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { CHANNEL, nextArgs, nextLines } from '../../../scripts/ci/next-deploy.ts'
import { FILES, read, repoPath } from '../helpers/ds.ts'

// The `next` workflow (S6.1, S6.2, FR-014, D119), read as YAML, and its deploy
// script's arguments and messages.

interface Step {
  uses?: string
  run?: string
  env?: Record<string, string>
}
interface Job {
  needs?: string[]
  permissions?: Record<string, string>
  steps?: Step[]
}
interface Workflow {
  on: { push?: { branches?: string[] }; pull_request?: unknown; [event: string]: unknown }
  permissions: Record<string, string>
  jobs: Record<string, Job>
}

const workflow = (): Workflow => parse(read(FILES.next)) as Workflow

describe('when it runs', () => {
  test('S6.2 FR-014 it runs only on a push to main', () => {
    const { on } = workflow()
    expect(Object.keys(on)).toEqual(['push'])
    expect(on.push?.branches).toEqual(['main'])
  })

  test('S6.2 FR-014 it sits outside the gate: no CI job needs it, and it needs no CI job', () => {
    const ci = parse(read(repoPath('.github', 'workflows', 'ci.yml'))) as Workflow
    expect(JSON.stringify(ci.jobs.gate?.needs ?? [])).not.toMatch(/next/)
    expect(workflow().jobs.deploy?.needs).toEqual(['build'])
  })
})

describe('what it deploys', () => {
  test('S6.1 FR-014 it builds main and hands the build to a deploy job that holds the sign-in', () => {
    const { jobs, permissions } = workflow()
    expect(permissions).toEqual({ contents: 'read' })
    expect(jobs.build?.permissions).toBeUndefined()
    expect((jobs.build?.steps ?? []).map((step) => step.run ?? '').join('\n')).toMatch(/pnpm site:build/)
    expect(jobs.deploy?.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    const deploy = jobs.deploy?.steps?.find((step) => /next-deploy\.ts/.test(step.run ?? ''))
    expect(deploy?.run).toBe('node scripts/ci/next-deploy.ts')
    for (const name of ['GCP_WORKLOAD_IDENTITY_PROVIDER', 'GCP_PREVIEW_SERVICE_ACCOUNT', 'FIREBASE_PROJECT_ID']) {
      expect(deploy?.env?.[name], name).toBe(`\${{ vars.${name} }}`)
    }
  })

  test('S6.1 FR-014 the deploy names only the channel next, with the noindex config and a 30-day expiry', () => {
    expect(CHANNEL).toBe('next')
    expect(nextArgs('bradthome')).toEqual([
      'hosting:channel:deploy',
      'next',
      '--expires',
      '30d',
      '--config',
      'firebase.preview.json',
      '--json',
      '--non-interactive',
      '--project',
      'bradthome',
    ])
    const script = read(FILES.nextDeploy)
    expect(script).toMatch(/previewConfig\(/)
    expect(script).toMatch(/credentialsFor\(/)
    expect(script).toMatch(/refs\/heads\/main/)
  })

  test('S6.2 FR-014 nothing in the workflow or its script names live, reads a secret or holds a key', () => {
    for (const file of [FILES.next, FILES.nextDeploy]) {
      const text = read(file)
      expect(text, file).not.toMatch(/\blive\b|channel:deploy['"]?\s*,?\s*['"]?live|\bfirebase(?:\s+-\S+)*\s+deploy\b|--only\s+hosting/)
      expect(text, file).not.toMatch(/secrets\.|credentials_json|private_key|FIREBASE_TOKEN/)
    }
  })

  test("S6.1 FR-014 a deploy's answer reads as next's lines: the link, or what failed and how to fix it", () => {
    const ok = nextLines(JSON.stringify({ status: 'success', result: { bradthome: { url: 'https://bradthome--next-abc.web.app', expireTime: '2026-12-04T00:00:00Z' } } }), 0)
    expect(ok).toEqual({ ok: true, url: 'https://bradthome--next-abc.web.app', lines: ['✓ next  https://bradthome--next-abc.web.app, expires 2026-12-04T00:00:00Z'] })
    const failed = nextLines(JSON.stringify({ status: 'error', error: 'Request had HTTP Error: 403' }), 1)
    expect(failed.ok).toBe(false)
    expect(failed.lines[0]).toMatch(/^✖ next {2}/)
    expect(failed.lines.at(-1)).toMatch(/Fix:/)
  })
})

describe('the folder', () => {
  test('S6.2 FR-014 only the preview and next deploy to a channel, and only next names next', () => {
    const dir = repoPath('.github', 'workflows')
    for (const file of readdirSync(dir)) {
      const text = read(path.join(dir, file))
      if (file !== 'next.yml') expect(text, file).not.toMatch(/next-deploy|channel:deploy\s+next/)
    }
  })
})
