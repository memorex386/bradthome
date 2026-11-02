import { readFileSync } from 'node:fs'
import { ZERO } from '../../lib/git.ts'
import { envValue } from '../../lib/terms.ts'

// The event a CI job runs for, read from the file GitHub Actions gives it at
// GITHUB_EVENT_PATH, never from expressions in the workflow (FR-005). A pull
// request's text and branch name are data, read here and only printed through
// the output gate.

export interface PullRequestText {
  /** The head branch's name. */
  branch: string
  title: string
  /** The description, or '' when it's empty. GitHub sends null for that. */
  body: string
  /** Who opened it, such as dependabot[bot]. */
  user: string
}

export interface CiEvent {
  name: string
  /** The commit the range starts after: the pull request's base, or the push's before. */
  base: string | undefined
  /** The last commit in the range: the pull request's head, or the push's after. */
  head: string
  /** Set for pull_request and pull_request_target, and undefined for a push. */
  pullRequest: PullRequestText | undefined
}

interface RawEvent {
  before?: unknown
  after?: unknown
  pull_request?: {
    title?: unknown
    body?: unknown
    user?: { login?: unknown }
    head?: { ref?: unknown; sha?: unknown }
    base?: { sha?: unknown }
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Reads the event GitHub Actions gives the job. Throws when there's none it can read. */
export function readEvent(env: NodeJS.ProcessEnv = process.env): CiEvent {
  const name = envValue(env, 'GITHUB_EVENT_NAME') ?? ''
  const file = envValue(env, 'GITHUB_EVENT_PATH')
  if (file === undefined || file === '') throw new Error('GITHUB_EVENT_PATH is not set')
  const raw = JSON.parse(readFileSync(file, 'utf8')) as RawEvent
  const pr = raw.pull_request
  if (pr !== undefined && pr !== null) {
    const head = text(pr.head?.sha)
    if (head === '') throw new Error("the event has no pull request head")
    return {
      name,
      base: text(pr.base?.sha) || undefined,
      head,
      pullRequest: { branch: text(pr.head?.ref), title: text(pr.title), body: text(pr.body), user: text(pr.user?.login) },
    }
  }
  const after = text(raw.after)
  if (after === '') throw new Error(`a ${name || 'CI'} event with no commit to check`)
  const before = text(raw.before)
  return { name, base: before === '' || ZERO.test(before) ? undefined : before, head: after, pullRequest: undefined }
}

/** The rev-list arguments for the event's commits: base..head, or just the head when there's no base. */
export function commitRange(event: CiEvent): string[] {
  return event.base === undefined ? ['-1', event.head] : [`${event.base}..${event.head}`]
}

/** The commit a diff of the event's changes starts from: base...head reads as the merge base. */
export function diffRange(event: CiEvent): string {
  return event.base === undefined ? `${event.head}~1...${event.head}` : `${event.base}...${event.head}`
}
