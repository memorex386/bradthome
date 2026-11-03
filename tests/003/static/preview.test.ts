import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { allSteps, allStrings, jobsOf, type Job, readYaml, runsOf, triggersOf, type Workflow } from '../../002/helpers/workflows.ts'
import { GATE_JOBS } from '../helpers/ci.ts'
import { GITHUB, SCRIPTS } from '../helpers/paths.ts'

// The preview workflow (FR-015 to FR-017, FR-021, S3.2, S3.3, S3.5, S3.6,
// SC-005). Three jobs, each with only the permissions it needs: build runs the
// pull request's code and holds no sign-in, deploy holds the Google sign-in
// and installs only the Firebase CLI, and comment holds issues: write.

const preview = (): Workflow => readYaml<Workflow>(GITHUB.preview)

function job(id: string): Job {
  const found = jobsOf(preview())[id]
  expect(found, `job ${id}`).toBeDefined()
  return found ?? {}
}

const needsOf = (value: Job): string[] => (Array.isArray(value.needs) ? value.needs : value.needs === undefined ? [] : [value.needs])

/** Each ${{ … }} expression in a text. */
function expressions(text: string): string[] {
  return [...text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map((match) => (match[1] ?? '').trim())
}

describe('when the preview runs', () => {
  test('FR-015 FR-017 S3.3 runs on each pull request event that changes its code, never with the base branch\'s secrets', () => {
    const workflow = preview()
    expect(workflow.name).toBe('preview')
    const on = triggersOf(workflow)
    expect(Object.keys(on)).toEqual(['pull_request'])
    const types = ((on.pull_request ?? {}) as { types?: string[] }).types ?? []
    expect([...types].sort()).toEqual(['opened', 'reopened', 'synchronize'])
  })

  test('FR-015 S3.1 one run at a time per pull request, a newer push cancelling the older run', () => {
    const concurrency = preview().concurrency as { group?: unknown; 'cancel-in-progress'?: unknown } | undefined
    expect(String(concurrency?.group ?? '')).toMatch(/github\.event\.pull_request\.number/)
    expect(concurrency?.['cancel-in-progress']).toBe(true)
  })

  test('FR-017 S3.4 sits outside the gate: no ci job waits for it, and the gate never expects it', () => {
    const ci = readFileSync(GITHUB.ci, 'utf8')
    expect(ci).not.toMatch(/preview/)
    expect([...GATE_JOBS]).not.toContain('deploy')
    expect(readFileSync(GITHUB.ruleset, 'utf8')).not.toMatch(/preview/)
  })
})

describe('its three jobs', () => {
  test('FR-015 FR-021 S3.2 has build, deploy and comment, in that order, each holding only the permissions it needs', () => {
    expect(Object.keys(jobsOf(preview())).sort()).toEqual(['build', 'comment', 'deploy'])
    expect(preview().permissions).toEqual({ contents: 'read' })
    const build: unknown = job('build').permissions ?? { contents: 'read' }
    expect(build).toEqual({ contents: 'read' })
    expect(job('deploy').permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    expect(job('comment').permissions).toEqual({ issues: 'write' })
    expect(needsOf(job('deploy'))).toEqual(['build'])
    expect(needsOf(job('comment'))).toEqual(['deploy'])
    for (const id of ['build', 'deploy', 'comment']) expect(job(id)['runs-on'], id).toBe('ubuntu-24.04')
  })

  test("FR-016 S3.2 only deploy signs in to Google, with GitHub's token through a repo script, never a third-party action", () => {
    const deploy = runsOf(job('deploy'))
    expect(deploy).toMatch(/\bnode scripts\/ci\/preview-credentials\.ts\b/)
    expect(deploy).toMatch(/\bnode scripts\/ci\/preview-deploy\.ts\b/)
    for (const id of ['build', 'comment']) expect(runsOf(job(id)), id).not.toMatch(/preview-credentials|preview-deploy|firebase\b/)
    const text = readFileSync(GITHUB.preview, 'utf8')
    expect(text).not.toMatch(/google-github-actions|FirebaseExtended|action-hosting-deploy/)
  })

  test('S3.3 FR-017 V2 the deploy job always starts, so a skip shows its reason instead of a silent skip', () => {
    expect(job('deploy').if).toBeUndefined()
  })

  test("FR-016 S3.2 the deploy job never runs the site's packages: it installs only the Firebase CLI, builds nothing and uses build's output", () => {
    const deploy = job('deploy')
    const runs = runsOf(deploy)
    expect(runs).not.toMatch(/site:build|astro|pnpm (?:run )?(?:test|lint|site:)/)
    expect(runs, 'no install of the workspace').not.toMatch(/\bpnpm\s+(?:install|i)\b|\bnpm\s+(?:install|i|ci)\b/)
    // The one install allowed here is the CLI itself, at an exact version.
    const installs = runs.split('\n').filter((line) => /\bpnpm\s+add\b/.test(line))
    expect(installs.length, 'the deploy job installs the Firebase CLI').toBeGreaterThan(0)
    for (const line of installs) {
      const packages = line
        .slice(line.search(/\bpnpm\s+add\b/))
        .split(/\s+/)
        .slice(2)
        .filter((word) => word !== '' && !word.startsWith('-'))
      expect(packages, line).toEqual([expect.stringMatching(/^firebase-tools@\d+\.\d+\.\d+$/)])
    }
    const downloads = (deploy.steps ?? []).filter((step) => step.uses?.startsWith('actions/download-artifact@') === true)
    expect(downloads).toHaveLength(1)
    const uploads = (job('build').steps ?? []).filter((step) => step.uses?.startsWith('actions/upload-artifact@') === true)
    expect(uploads).toHaveLength(1)
    expect(downloads[0]?.with?.name).toBe(uploads[0]?.with?.name)
  })

  test('FR-015 S3.1 the comment job runs the comment script with the deploy\'s link, and only after a deploy', () => {
    const comment = job('comment')
    expect(runsOf(comment)).toMatch(/\bnode scripts\/ci\/preview-comment\.ts\b/)
    expect(String(comment.if ?? '')).toMatch(/needs\.deploy\.outputs\./)
  })
})

describe('the sign-in and its settings', () => {
  test('SC-005 FR-016 S3.2 no workflow reads a Google key: the preview reads no secret at all', () => {
    expect(allStrings(preview()).filter((value) => /\bsecrets\./.test(value))).toEqual([])
    for (const file of readdirSync(GITHUB.workflows)) {
      const text = readFileSync(path.join(GITHUB.workflows, file), 'utf8')
      expect(text, file).not.toMatch(/credentials_json|service_account_key|GCP_SA_KEY|FIREBASE_TOKEN|firebaseServiceAccount|private_key/i)
    }
  })

  test('FR-016 S3.2 the provider, service account and project come from repo variables, through the environment', () => {
    const text = readFileSync(GITHUB.preview, 'utf8')
    for (const name of ['GCP_WORKLOAD_IDENTITY_PROVIDER', 'GCP_PREVIEW_SERVICE_ACCOUNT', 'FIREBASE_PROJECT_ID']) {
      expect(text, name).toMatch(new RegExp(`\\$\\{\\{\\s*vars\\.${name}\\s*\\}\\}`))
    }
    for (const { job: id, step } of allSteps(preview())) {
      for (const expression of expressions(step.run ?? '')) {
        expect(expression, `${id}: a run step interpolates ${expression}`).not.toMatch(/\bvars\.|title|body|head_ref|head\.ref|label|message|commits|secrets|inputs/)
      }
    }
  })
})

describe('never the live channel', () => {
  test('S3.5 FR-017 no workflow or preview script deploys to the live channel, or deploys anything but a channel', () => {
    const files = [
      ...readdirSync(GITHUB.workflows).map((file) => path.join(GITHUB.workflows, file)),
      SCRIPTS.previewDeploy,
      SCRIPTS.previewCredentials,
      SCRIPTS.previewComment,
    ]
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/\bfirebase(?:\s+--?\S+)*\s+deploy\b|['"]deploy['"]\s*[,\]]|channel:deploy['"]?\s*,?\s*['"]?live\b|hosting:clone|channel:delete|--only\s+hosting/)
    }
    expect(readFileSync(GITHUB.preview, 'utf8')).not.toMatch(/\blive\b/)
  })

  test('S3.6 FR-015 FR-018 the preview deploys with the noindex copy of the config, and its channel expires 7 days after the push', () => {
    const deploy = readFileSync(SCRIPTS.previewDeploy, 'utf8')
    expect(deploy).toMatch(/firebase\.preview\.json/)
    expect(deploy).toMatch(/['"]7d['"]/)
  })
})
