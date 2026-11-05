import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import {
  BRANCH_PREFIX,
  type Change,
  bodyOf,
  changedPaths,
  type GitHub,
  openRefreshPr,
  TITLE,
} from '../../../scripts/previews/open-pr-lib.ts'

// The refresh's pull request (S4.1, S4.2, S4.4, S4.5, FR-011, SC-005), against
// a fake GitHub that records each call, and the workflow's file read as YAML.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const REPO = 'memorex386/bradthome'
const BASE = 'a'.repeat(40)

function fakeGitHub(openPulls: unknown[] = []): GitHub & { calls: string[]; commit?: Record<string, unknown> } {
  const fake: GitHub & { calls: string[]; commit?: Record<string, unknown> } = {
    calls: [],
    rest(method, route, body) {
      fake.calls.push(`${method} ${route}`)
      if (method === 'GET') return Promise.resolve(openPulls)
      if (route.endsWith('/pulls')) return Promise.resolve({ number: 99, body })
      return Promise.resolve({})
    },
    graphql(_query, variables) {
      fake.calls.push('graphql createCommitOnBranch')
      fake.commit = variables.input as Record<string, unknown>
      return Promise.resolve({})
    },
  }
  return fake
}

const SNAPSHOT = { path: 'apps/site/content/previews/snapshots.json', bytes: new TextEncoder().encode('{}\n') }
const open = (github: GitHub, changes: readonly Change[] = [SNAPSHOT]) =>
  openRefreshPr({ github, repo: REPO, base: BASE, today: '2026-11-09', changes, report: ['✓ github changed'] })

describe('the pull request', () => {
  test('S4.1 FR-011 SC-005 a change opens one pull request, from a new branch at main, with one commit through the API', async () => {
    const github = fakeGitHub()
    const image = { path: 'apps/site/public/previews/github-0123456789ab.webp', bytes: new Uint8Array([1]) }
    const gone = { path: 'apps/site/public/previews/github-ba9876543210.webp' }
    expect(await open(github, [SNAPSHOT, image, gone])).toEqual({ kind: 'opened', number: 99, branch: `${BRANCH_PREFIX}2026-11-09` })
    expect(github.calls).toEqual([
      `GET /repos/${REPO}/pulls?state=open&per_page=100`,
      `POST /repos/${REPO}/git/refs`,
      'graphql createCommitOnBranch',
      `POST /repos/${REPO}/pulls`,
    ])
    expect(github.commit).toMatchObject({
      branch: { repositoryNameWithOwner: REPO, branchName: 'previews/refresh-2026-11-09' },
      expectedHeadOid: BASE,
      message: { headline: TITLE },
      fileChanges: { deletions: [{ path: gone.path }] },
    })
    const additions = (github.commit?.fileChanges as { additions: { path: string }[] }).additions.map((addition) => addition.path)
    expect(additions).toEqual([SNAPSHOT.path, image.path])
    expect(github.calls.join(' ')).not.toMatch(/merge|review|heads\/main/)
  })

  test('S4.2 FR-011 SC-005 with no change, nothing is called and no pull request opens', async () => {
    const github = fakeGitHub()
    expect(await open(github, [])).toEqual({ kind: 'none' })
    expect(github.calls).toEqual([])
  })

  test('S4.4 FR-011 SC-005 while a refresh pull request is open, no second one opens', async () => {
    const github = fakeGitHub([{ number: 50, head: { ref: 'previews/refresh-2026-11-02', repo: { full_name: REPO } } }])
    expect(await open(github)).toEqual({ kind: 'open', number: 50 })
    expect(github.calls).toEqual([`GET /repos/${REPO}/pulls?state=open&per_page=100`])
  })

  test('S4.1 FR-011 the script refuses a change outside the snapshots and images', async () => {
    await expect(open(fakeGitHub(), [{ path: 'apps/site/src/pages/v2.astro', bytes: new Uint8Array() }])).rejects.toThrow(/may not/)
  })

  test("S4.1 FR-011 the commit and title pass the commit rules, and the body's lines fit under 100 characters", () => {
    expect(TITLE).toMatch(/^chore\(016\): /)
    for (const line of bodyOf(['✓ github changed', '✖ appstore-1 failed, so its last snapshot stays: x']).split('\n')) expect(line.length).toBeLessThan(100)
    expect(changedPaths(' M apps/site/content/previews/snapshots.json\n D apps/site/public/previews/a.webp\n?? apps/site/public/previews/b.webp\n')).toEqual([
      { path: 'apps/site/content/previews/snapshots.json', deleted: false },
      { path: 'apps/site/public/previews/a.webp', deleted: true },
      { path: 'apps/site/public/previews/b.webp', deleted: false },
    ])
  })
})

describe('the workflow', () => {
  interface Step {
    name?: string
    uses?: string
    if?: string
    run?: string
    with?: Record<string, string>
    env?: Record<string, string>
    'continue-on-error'?: boolean
  }
  const text = readFileSync(path.join(ROOT, '.github/workflows/previews.yml'), 'utf8')
  const workflow = parse(text) as {
    on: { schedule: { cron: string }[]; workflow_dispatch: unknown }
    permissions: Record<string, string>
    jobs: { refresh: { steps: Step[]; permissions?: unknown; if?: string } }
  }
  const steps = workflow.jobs.refresh.steps

  test('S4.5 FR-011 it runs weekly and by hand, reads with a read-only token, and pins every action by commit', () => {
    expect(workflow.on.schedule).toEqual([{ cron: '23 13 * * 1' }])
    expect('workflow_dispatch' in workflow.on).toBe(true)
    expect(workflow.permissions).toEqual({ contents: 'read' })
    expect(workflow.jobs.refresh.permissions).toBeUndefined()
    // Only main is refreshed, so a run by hand from a branch opens nothing carrying its commits.
    expect(workflow.jobs.refresh.if).toBe("github.ref == 'refs/heads/main'")
    for (const step of steps.filter((each) => each.uses)) expect(step.uses).toMatch(/^actions\/[\w-]+@[0-9a-f]{40}$/)
  })

  test("S4.5 S4.1 D146 FR-011 it makes the App's token only when something changed, from the variable and secret, and opens the pull request with it", () => {
    const token = steps.find((step) => step.uses?.startsWith('actions/create-github-app-token@'))
    expect(token?.if).toBe("steps.refresh.outputs.changed == 'true'")
    expect(token?.with).toEqual({
      'client-id': '${{ vars.PREVIEWS_APP_CLIENT_ID }}',
      'private-key': '${{ secrets.PREVIEWS_APP_KEY }}',
      'permission-contents': 'write',
      'permission-pull-requests': 'write',
    })
    const opener = steps.find((step) => step.run?.includes('scripts/previews/open-pr.ts'))
    expect(opener?.if).toBe("steps.refresh.outputs.changed == 'true'")
    // A failed pull request fails the step, so a change never ends in a green run with no pull request.
    expect(opener?.run).toMatch(/set -o pipefail/)
    expect(opener?.env?.GH_TOKEN).toBe('${{ steps.app.outputs.token }}')
    expect(text).not.toMatch(/git push|gh pr merge|gh pr review|--auto|auto-merge/)
  })

  test('S4.3 FR-010 FR-011 a failing source lets the run open its pull request, then fails the run to report it', () => {
    const refresh = steps.find((step) => step.run?.includes('pnpm previews:refresh'))
    expect(refresh?.['continue-on-error']).toBe(true)
    expect(refresh?.run).toMatch(/set -o pipefail/)
    const last = steps.at(-1)
    expect(last?.if).toBe("steps.refresh.outcome == 'failure'")
    expect(last?.run).toMatch(/exit 1/)
  })
})
