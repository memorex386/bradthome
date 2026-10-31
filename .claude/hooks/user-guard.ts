import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRADTHOME, isBradthome, remoteRepos } from './lib/git.ts'
import { pullRequestActions, repoOf } from './lib/github.ts'
import { answer, deny, type HookInput, inputCwd, parseInput, type PreToolUseAnswer, readStdin } from './lib/io.ts'
import { parseCommand, type Shell } from './lib/shell.ts'

// The guard in Brad's user settings, for Claude Code sessions started in other
// folders (FR-023, D73). It denies merging and approving bradthome pull
// requests, and nothing else: other repos are left alone, and in a session
// whose project is bradthome it steps aside, since the repo's own guard
// answers there. `pnpm guard:install` copies this folder into Brad's Claude
// Code folder, so it imports nothing from outside it.

export const MESSAGE = 'Brad merges bradthome pull requests, from any folder.'

const SHELLS: Record<string, Shell> = { Bash: 'bash', PowerShell: 'powershell' }
/** A cheap first look, so the guard costs little on every other command. */
const MIGHT_ACT = /\bgh\b|api\.github\.com/i

function envValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const key = Object.keys(env).find((candidate) => candidate.toUpperCase() === name)
  return key === undefined ? undefined : env[key]
}

export function decide(input: HookInput, env: NodeJS.ProcessEnv = process.env): PreToolUseAnswer | undefined {
  const shell = SHELLS[typeof input.tool_name === 'string' ? input.tool_name : '']
  const command = (input.tool_input as { command?: unknown } | undefined)?.command
  if (shell === undefined || typeof command !== 'string' || !MIGHT_ACT.test(command)) return undefined
  const cwd = inputCwd(input)
  const readFile = (file: string): string | undefined => {
    try {
      return readFileSync(path.resolve(cwd, file), 'utf8')
    } catch {
      return undefined
    }
  }
  const actions = pullRequestActions(parseCommand(command, shell), readFile)
  if (actions.length === 0) return undefined
  if (isBradthome(envValue(env, 'CLAUDE_PROJECT_DIR'))) return undefined

  let here: string[] | undefined
  for (const action of actions) {
    const named = action.repo ?? repoOf(envValue(env, 'GH_REPO') ?? '')
    if (named !== undefined) {
      if (named.toLowerCase() === BRADTHOME) return deny(MESSAGE)
      continue
    }
    // No repo named: gh uses the checkout the command runs in.
    here ??= remoteRepos(cwd)
    if (here.includes(BRADTHOME)) return deny(MESSAGE)
  }
  return undefined
}

function isMain(): boolean {
  const argv = path.resolve(process.argv[1] ?? '')
  const self = fileURLToPath(import.meta.url)
  return process.platform === 'win32' ? argv.toLowerCase() === self.toLowerCase() : argv === self
}

if (isMain()) {
  const text = await readStdin()
  try {
    const input = parseInput(text)
    if (input !== undefined) answer(decide(input))
    // Input it can't read is left alone, unless it names a bradthome merge or approval.
    else if (/memorex386\/bradthome\b/i.test(text) && /merge|approve/i.test(text)) answer(deny(MESSAGE))
  } catch {
    if (/memorex386\/bradthome\b/i.test(text) && /merge|approve/i.test(text)) answer(deny(MESSAGE))
  }
}
