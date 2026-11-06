// Opens the link previews' refresh pull request (spec 016, D48, D146). The
// scheduled workflow runs it with a GitHub App's token, so the pull request
// starts CI and the preview like any other. Its one commit is made through
// GitHub's API, which signs it, on a new branch from main. It never touches
// main, and does nothing while an earlier refresh's pull request is open.

export interface Change {
  path: string
  /** The file's bytes, or undefined when the refresh deleted it. */
  bytes?: Uint8Array
}

export interface GitHub {
  rest(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown>
  graphql(query: string, variables: Record<string, unknown>): Promise<unknown>
}

export interface OpenInput {
  github: GitHub
  /** owner/name. */
  repo: string
  /** The commit on main the refresh ran on. */
  base: string
  /** Today, as YYYY-MM-DD. */
  today: string
  changes: readonly Change[]
  /** The refresh's report, one line per source. */
  report: readonly string[]
}

export type OpenResult = { kind: 'none' } | { kind: 'open'; number: number } | { kind: 'opened'; number: number; branch: string }

export const BRANCH_PREFIX = 'previews/refresh-'
export const TITLE = "chore(016): refresh the link previews' snapshots"

/** The paths the refresh may write: the snapshots file and the images. */
export const REFRESH_PATHS = ['apps/site/content/previews/snapshots.json', 'apps/site/public/previews/'] as const

/** Whether a path is one the refresh may write. */
export const isRefreshPath = (path: string): boolean =>
  REFRESH_PATHS.some((allowed) => (allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed))

/** The changed paths in `git status --porcelain` output, as additions or deletions. */
export function changedPaths(porcelain: string): { path: string; deleted: boolean }[] {
  return porcelain
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => ({ status: line.slice(0, 2), path: line.slice(3).trim() }))
    .map(({ status, path }) => ({ path, deleted: status.includes('D') }))
}

/** The commit message's body: what changed and why, wrapped under 100 characters. */
export function bodyOf(report: readonly string[]): string {
  return [
    'The scheduled refresh fetched the link previews from GitHub and the App Store,',
    'and these sources changed:',
    '',
    ...report.map((line) => `- ${line.replace(/^[✓✖] /, '')}`),
  ].join('\n')
}

/** The pull request's description. */
export function descriptionOf(repo: string, report: readonly string[]): string {
  return [
    '## What changed',
    '',
    `The weekly refresh fetched the link previews' snapshots from GitHub's and Apple's public APIs ([spec 016](https://github.com/${repo}/blob/main/specs/016-link-previews/spec.md), D48).`,
    '',
    ...report.map((line) => `- ${line}`),
    '',
    "Check the cards on this pull request's preview, at `/v2` and `/design-system#previews`, then merge with a squash merge. A source that failed kept its last snapshot.",
    '',
    'Opened by the previews workflow with its GitHub App (D146). Nothing here was written by hand.',
  ].join('\n')
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

const base64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64')

/** Opens the pull request, or does nothing when there's nothing to open. */
export async function openRefreshPr(input: OpenInput): Promise<OpenResult> {
  const outside = input.changes.filter((change) => !isRefreshPath(change.path))
  if (outside.length > 0) throw new Error(`The refresh changed a file it may not: ${outside.map((change) => change.path).join(', ')}`)
  if (input.changes.length === 0) return { kind: 'none' }

  const [owner] = input.repo.split('/')
  const open = await input.github.rest('GET', `/repos/${input.repo}/pulls?state=open&per_page=100`)
  const existing = (Array.isArray(open) ? open : [])
    .map(record)
    .find(
      (pull) => String(record(pull.head).ref ?? '').startsWith(BRANCH_PREFIX) && record(record(pull.head).repo).full_name === input.repo,
    )
  if (existing !== undefined) return { kind: 'open', number: Number(existing.number) }

  const branch = `${BRANCH_PREFIX}${input.today}`
  await input.github.rest('POST', `/repos/${input.repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: input.base })
  await input.github.graphql('mutation ($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }', {
    input: {
      branch: { repositoryNameWithOwner: input.repo, branchName: branch },
      expectedHeadOid: input.base,
      message: { headline: TITLE, body: bodyOf(input.report) },
      fileChanges: {
        additions: input.changes
          .filter((change) => change.bytes !== undefined)
          .map((change) => ({ path: change.path, contents: base64(change.bytes ?? new Uint8Array()) })),
        deletions: input.changes.filter((change) => change.bytes === undefined).map((change) => ({ path: change.path })),
      },
    },
  })
  const pull = record(
    await input.github.rest('POST', `/repos/${input.repo}/pulls`, {
      title: TITLE,
      head: `${owner}:${branch}`,
      base: 'main',
      body: descriptionOf(input.repo, input.report),
      maintainer_can_modify: true,
    }),
  )
  return { kind: 'opened', number: Number(pull.number), branch }
}
