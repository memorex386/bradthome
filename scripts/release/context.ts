import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { envValue } from '../lib/terms.ts'
import { Hosting, type Fetch } from './hosting.ts'
import { actionsGoogleToken, gcloudToken } from './token.ts'

// What the release, rollback, status and check commands share (spec 008): the
// site, the channel and its public address, a Hosting client and a clock.
//
// In Actions, the token comes from GitHub's identity token for the account the
// job names (FR-007). On a machine, it's gcloud's token, as the person signed
// in, or as the account --as names.

export const LIVE_URL = 'https://bradthome.com'
export const MINUTE = 60_000

export interface Context {
  hosting: Hosting
  fetch: Fetch
  sleep: (ms: number) => Promise<void>
  now: () => number
  print: (line: string) => void
  site: string
  channel: string
  /** The address the channel is served at. */
  url: string
  timeoutMs: number
  intervalMs: number
}

export const inActions = (env: NodeJS.ProcessEnv): boolean => envValue(env, 'GITHUB_ACTIONS') === 'true'

export interface ContextOptions {
  env: NodeJS.ProcessEnv
  /** The repo variable naming the account, in Actions. */
  accountVariable: string
  channel: string
  /** --as on a machine: a service account to act as. */
  actAs?: string
  url?: string
}

export async function contextFor(options: ContextOptions): Promise<Context> {
  const { env } = options
  const site = envValue(env, 'FIREBASE_PROJECT_ID') || 'bradthome'
  let hosting: Hosting
  if (inActions(env)) {
    const account = envValue(env, options.accountVariable)
    if (!account) throw new Error(`${options.accountVariable} is not set`)
    hosting = new Hosting({ token: await actionsGoogleToken(env, account) })
  } else if (options.actAs !== undefined) {
    hosting = new Hosting({ token: gcloudToken(options.actAs) })
  } else {
    hosting = new Hosting({ token: gcloudToken(), quotaProject: site })
  }
  const url = options.url ?? (options.channel === 'live' ? LIVE_URL : (await hosting.channel(site, options.channel)).url)
  return {
    hosting,
    fetch,
    sleep: (ms) => delay(ms),
    now: () => Date.now(),
    print: (line) => console.log(line),
    site,
    channel: options.channel,
    url,
    timeoutMs: 10 * MINUTE,
    intervalMs: 15_000,
  }
}

/** The command line's flags, shared by the release scripts. */
export function flags(args: readonly string[], extra: Record<string, { type: 'string' | 'boolean' }> = {}) {
  return parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: { channel: { type: 'string' }, as: { type: 'string' }, url: { type: 'string' }, version: { type: 'string' }, ...extra },
  }).values as Record<string, string | boolean | undefined>
}

/** A failure's one line, without a stack. */
export const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error))
