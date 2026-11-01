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
