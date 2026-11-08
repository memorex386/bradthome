import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { CHAT_API_ORIGIN } from '../../apps/chat-api/src/constants.ts'
import { envValue } from '../lib/terms.ts'

// The preview's deploy step (FR-015, FR-017, FR-018, S3.3, S3.4, S3.6, V1–V3).
// Run from the checkout's root in the preview's deploy job. It skips with V2's
// reason when the pull request comes from a fork or GitHub gave the run no
// identity token. Otherwise it writes firebase.preview.json, firebase.json
// with a noindex header added, and has the Firebase CLI put the build on the
// channel pr-N, which expires 7 days after the push. The link and expiry go to
// the comment job through GITHUB_OUTPUT. It never names any channel but pr-N.

/** The parts of GitHub's pull_request event the preview reads. */
export interface PullRequestEvent {
  number: number
  pull_request: {
    number: number
    head: { sha: string; ref: string; repo: { full_name: string; fork: boolean } | null }
    base: { repo: { full_name: string } }
    user: { login: string }
  }
  repository: { full_name: string }
}

export type DeployOutcome = { ok: true; url: string; expires: string } | { ok: false; lines: string[] }

const PREVIEW_CONFIG = 'firebase.preview.json'
const EXPIRES = '7d'
const CHECKS_RUN = '  Checks still run.'
const V3_TAIL = "  The gate isn't affected. Fix: re-run the job; if it keeps failing, check Google Cloud's status."

/** V2's lines when the preview skips, or undefined when it deploys. */
export function previewSkip(event: PullRequestEvent, env: NodeJS.ProcessEnv): string[] | undefined {
  const head = event.pull_request.head.repo
  if (head === null || head.fork || head.full_name !== event.pull_request.base.repo.full_name) {
    return ['– preview  skipped: this pull request comes from a fork, so GitHub gives it no Google sign-in.', CHECKS_RUN]
  }
  if (!envValue(env, 'ACTIONS_ID_TOKEN_REQUEST_URL') || !envValue(env, 'ACTIONS_ID_TOKEN_REQUEST_TOKEN')) {
    return ['– preview  skipped: GitHub gave this run no identity token, so it has no Google sign-in.', CHECKS_RUN]
  }
  return undefined
}

/** The Firebase CLI's arguments for pull request N's channel. */
export function deployArgs(pr: number): string[] {
  if (!Number.isInteger(pr) || pr < 1) throw new Error(`${pr} isn't a pull request number`)
  return ['hosting:channel:deploy', `pr-${pr}`, '--expires', EXPIRES, '--config', PREVIEW_CONFIG, '--json']
}

function failed(headline: string, detail: readonly string[]): DeployOutcome {
  return { ok: false, lines: [`✖ preview  ${headline}`, ...detail.map((line) => `  ${line}`), V3_TAIL] }
}

/** The CLI's --json output and exit status, read as the link and expiry, or V3's lines. */
export function deployOutcome(stdout: string, status: number | null): DeployOutcome {
  let body: { status?: unknown; result?: unknown; error?: unknown } | undefined
  try {
    body = JSON.parse(stdout) as typeof body
  } catch {
    body = undefined
  }
  if (body?.status === 'success' && status === 0) {
    const site = Object.values((body.result ?? {}) as Record<string, { url?: unknown; expireTime?: unknown }>)[0]
    if (typeof site?.url === 'string' && typeof site.expireTime === 'string') return { ok: true, url: site.url, expires: site.expireTime }
    return failed("the Firebase CLI's answer had no link", [])
  }
  const error = typeof body?.error === 'string' ? body.error : ''
  const http = /https:\/\/([\w.-]+)\/\S* had HTTP Error: (\d{3})/.exec(error)
  if (http !== null) return failed('Firebase Hosting refused the deploy', [`HTTP ${http[2]} from ${http[1]}`])
  if (error !== '') return failed('the Firebase CLI failed', [error])
  if (body?.status === 'success') return failed(`the Firebase CLI exited with ${String(status)} after reporting success`, [])
  const first = stdout.split(/\r?\n/).find((line) => line.trim() !== '')
  return failed(
    status === null ? 'the Firebase CLI was stopped' : `the Firebase CLI exited with ${status}`,
    first === undefined ? [] : [first.trim()],
  )
}

interface HostingConfig {
  hosting?: { headers?: { source?: string; headers?: { key: string; value: string }[] }[] }
}

/**
 * A Content-Security-Policy with the chat API's origin added to connect-src,
 * for previews and next only (spec 021, FR-002, D183). Live keeps firebase.json's.
 */
export function withChatApi(policy: string): string {
  return policy
    .split(';')
    .map((part) => {
      const trimmed = part.trim()
      return trimmed.startsWith('connect-src ') && !trimmed.split(/\s+/).includes(CHAT_API_ORIGIN)
        ? `${trimmed} ${CHAT_API_ORIGIN}`
        : trimmed
    })
    .join('; ')
}

/**
 * firebase.json's parsed config with the noindex header added on every path,
 * and the chat API's origin in the policy's connect-src, for
 * firebase.preview.json and next's copy.
 */
export function previewConfig(config: unknown): unknown {
  const copy = structuredClone(config ?? {}) as HostingConfig
  copy.hosting ??= {}
  copy.hosting.headers ??= []
  let rule = copy.hosting.headers.find((entry) => entry.source === '**')
  if (rule === undefined) {
    rule = { source: '**', headers: [] }
    copy.hosting.headers.push(rule)
  }
  rule.headers = [
    ...(rule.headers ?? [])
      .filter((header) => header.key.toLowerCase() !== 'x-robots-tag')
      .map((header) => (header.key.toLowerCase() === 'content-security-policy' ? { ...header, value: withChatApi(header.value) } : header)),
    { key: 'X-Robots-Tag', value: 'noindex' },
  ]
  return copy
}

function output(env: NodeJS.ProcessEnv, values: Record<string, string>): void {
  const file = envValue(env, 'GITHUB_OUTPUT')
  if (!file) return
  appendFileSync(
    file,
    Object.entries(values)
      .map(([name, value]) => `${name}=${value}\n`)
      .join(''),
  )
}

function main(env: NodeJS.ProcessEnv): number {
  const eventPath = envValue(env, 'GITHUB_EVENT_PATH')
  if (!eventPath) {
    console.log(['✖ preview  GITHUB_EVENT_PATH is not set', '  Fix: run this in the preview workflow.'].join('\n'))
    return 1
  }
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as PullRequestEvent
  const skip = previewSkip(event, env)
  if (skip !== undefined) {
    console.log(skip.join('\n'))
    return 0
  }
  const config: unknown = JSON.parse(readFileSync('firebase.json', 'utf8'))
  writeFileSync(PREVIEW_CONFIG, `${JSON.stringify(previewConfig(config), null, 2)}\n`)
  const project = envValue(env, 'FIREBASE_PROJECT_ID')
  const args = [...deployArgs(event.pull_request.number), '--non-interactive', ...(project ? ['--project', project] : [])]
  const result = spawnSync('firebase', args, { env, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  const outcome =
    result.error !== undefined
      ? failed('the Firebase CLI could not start', [result.error.message])
      : deployOutcome(result.stdout, result.status)
  if (!outcome.ok) {
    const stderr = (result.stderr ?? '').trim()
    if (stderr !== '') console.log(stderr)
    console.log(outcome.lines.join('\n'))
    return 1
  }
  output(env, { url: outcome.url, expires: outcome.expires })
  console.log(`✓ preview  ${outcome.url}, expires ${outcome.expires}`)
  return 0
}

if (import.meta.main) process.exitCode = main(process.env)
