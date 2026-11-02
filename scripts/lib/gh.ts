import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { envValue } from './terms.ts'

// Which GitHub account gh acts as, read from a config folder's hosts.yml. It's
// read locally, so the setup check needs no network (D73).

export const AGENT_LOGIN = 'bradthome-agent'

/** The account gh is logged in as in a config folder, or undefined when there's none. */
export function ghLogin(configDir: string, host = 'github.com'): string | undefined {
  let text: string
  try {
    text = readFileSync(path.join(configDir, 'hosts.yml'), 'utf8')
  } catch {
    return undefined
  }
  let inHost = false
  let level: number | undefined
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const indent = /^\s*/.exec(line)?.[0].length ?? 0
    if (indent === 0) {
      inHost = line.trim().replace(/:$/, '').replace(/^["']|["']$/g, '') === host
      level = undefined
      continue
    }
    if (!inHost) continue
    level ??= indent
    const user = indent === level ? /^\s*user:\s*["']?([^"'\s]+)["']?\s*$/.exec(line) : null
    if (user !== null) return user[1]
  }
  return undefined
}

/** The folder gh uses when GH_CONFIG_DIR isn't set, as gh itself works it out. */
export function defaultGhDir(env: NodeJS.ProcessEnv): string {
  const xdg = envValue(env, 'XDG_CONFIG_HOME')
  if (xdg !== undefined && xdg !== '') return path.join(xdg, 'gh')
  const appData = envValue(env, 'APPDATA')
  if (process.platform === 'win32' && appData !== undefined && appData !== '') return path.join(appData, 'GitHub CLI')
  return path.join(envValue(env, 'HOME') ?? os.homedir(), '.config', 'gh')
}

/** The repo on GitHub, as the API names it. */
export const REPO_SLUG = 'memorex386/bradthome'

/** The owner/name a remote URL points at on GitHub, or undefined when it's another host. */
export function githubSlug(url: string): string | undefined {
  const match = /^(?:https:\/\/(?:[^@/]+@)?github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?\/?$/i.exec(url.trim())
  return match?.[1]
}

/** What a gh api read returned. */
export type ApiAnswer =
  | { kind: 'ok'; body: unknown }
  | { kind: 'no-gh' }
  | { kind: 'offline' }
  | { kind: 'signed-out' }
  | { kind: 'not-json' }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'failed' }

/**
 * Reads an endpoint with gh api, as whichever account gh runs as. It only
 * reads, and parses the JSON itself rather than asking gh to filter it.
 */
export function ghApi(endpoint: string, env: NodeJS.ProcessEnv, cwd: string): ApiAnswer {
  const result = spawnSync('gh', ['api', endpoint], { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  if (result.error !== undefined) {
    return (result.error as NodeJS.ErrnoException).code === 'ENOENT' ? { kind: 'no-gh' } : { kind: 'failed' }
  }
  if (result.status === 0) {
    try {
      const body: unknown = JSON.parse(result.stdout)
      return typeof body === 'object' && body !== null ? { kind: 'ok', body } : { kind: 'not-json' }
    } catch {
      return { kind: 'not-json' }
    }
  }
  const status = /\(HTTP (\d{3})\)/.exec(result.stderr)?.[1]
  if (status !== undefined) {
    let message = ''
    try {
      message = String((JSON.parse(result.stdout) as { message?: unknown }).message ?? '')
    } catch {
      // The status alone says enough.
    }
    return { kind: 'http', status: Number(status), message }
  }
  if (/error connecting|could not resolve|dial tcp|i\/o timeout|no such host/i.test(result.stderr)) return { kind: 'offline' }
  if (/gh auth login|not logged in|authentication/i.test(result.stderr)) return { kind: 'signed-out' }
  return { kind: 'failed' }
}

/** Why an answer can't be read, in words for a check's line. */
export function answerProblem(answer: Exclude<ApiAnswer, { kind: 'ok' }>): string {
  switch (answer.kind) {
    case 'no-gh':
      return "gh isn't installed"
    case 'offline':
      return "GitHub can't be reached"
    case 'signed-out':
      return "gh isn't signed in"
    case 'not-json':
      return "GitHub's answer isn't JSON"
    case 'http':
      return `GitHub answered HTTP ${answer.status}${answer.message === '' ? '' : `: ${answer.message}`}`
    case 'failed':
      return "gh couldn't run"
  }
}
