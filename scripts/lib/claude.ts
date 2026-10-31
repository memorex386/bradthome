import os from 'node:os'
import path from 'node:path'
import { envValue } from './terms.ts'

// Where Claude Code keeps its user settings, and what the guard for sessions
// started elsewhere adds to them (FR-023, D73).

/** The folder the installed guard lives in, under Claude Code's user folder. */
export const GUARD_FOLDER = 'bradthome-guard'

/** Deny rules for bradthome pull requests only. They name no machine path. */
export const USER_DENY_RULES = ['Bash', 'PowerShell'].flatMap((tool) => [
  `${tool}(gh pr merge *memorex386/bradthome)`,
  `${tool}(gh pr merge *memorex386/bradthome *)`,
  `${tool}(gh pr merge *memorex386/bradthome/*)`,
  `${tool}(gh api *repos/memorex386/bradthome/pulls/*/merge*)`,
  `${tool}(gh pr review *memorex386/bradthome *--approve*)`,
  `${tool}(gh pr review *memorex386/bradthome/pull/*--approve*)`,
  `${tool}(gh pr review *--approve*memorex386/bradthome)`,
  `${tool}(gh pr review *--approve*memorex386/bradthome *)`,
  `${tool}(gh pr review *--approve*memorex386/bradthome/*)`,
  `${tool}(gh api *repos/memorex386/bradthome/pulls/*/reviews*event=APPROVE*)`,
])

export interface Handler {
  type?: string
  command?: string
  [key: string]: unknown
}

export interface Settings {
  env?: Record<string, unknown>
  hooks?: Record<string, { matcher?: string; hooks?: Handler[] }[]>
  permissions?: { deny?: string[]; [key: string]: unknown }
  [key: string]: unknown
}

/** Claude Code's user folder: CLAUDE_CONFIG_DIR, or ~/.claude. */
export function claudeConfigDir(env: NodeJS.ProcessEnv): string {
  const configured = envValue(env, 'CLAUDE_CONFIG_DIR')
  return configured !== undefined && configured !== '' ? configured : path.join(os.homedir(), '.claude')
}
