import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRADTHOME, isBradthome, remoteRepos } from './lib/git.ts'
import { pullRequestActions, repoOf } from './lib/github.ts'
import { answer, deny, type HookInput, inputCwd, parseInput, type PreToolUseAnswer, readStdin } from './lib/io.ts'
import { commandName, parseCommand, type Shell, type SimpleCommand } from './lib/shell.ts'

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
  const parsed = parseCommand(command, shell)
  const actions = pullRequestActions(parsed, readFile)
  if (actions.length === 0) return undefined
  if (isBradthome(envValue(env, 'CLAUDE_PROJECT_DIR'))) return undefined

  let here: string[] | undefined
  for (const action of actions) {
    const named = action.repo ?? repoOf(envValue(env, 'GH_REPO') ?? '')
    if (named !== undefined) {
      if (named.toLowerCase() === BRADTHOME) return deny(MESSAGE)
      continue
    }
    // No repo named: gh uses the checkout the command runs in, which is the
    // session's folder or any folder the command moves to first.
    here ??= [cwd, ...folderChanges(parsed.commands, cwd)].flatMap((folder) => remoteRepos(folder))
    if (here.includes(BRADTHOME)) return deny(MESSAGE)
  }
  return undefined
}

const MOVES = new Set(['cd', 'chdir', 'pushd', 'set-location', 'sl', 'push-location'])
const HOME_VARIABLES = /^(?:~|\$HOME|\$\{HOME\}|\$env:USERPROFILE|\$env:HOME|%USERPROFILE%)(?=$|[\\/])/i

/** The folders a command moves to with cd, pushd, Set-Location and the like, in order. */
export function folderChanges(commands: readonly SimpleCommand[], cwd: string): string[] {
  const folders: string[] = []
  let current = cwd
  for (const command of commands) {
    if (!MOVES.has(commandName(command))) continue
    const args = command.words.slice(1)
    let target: string | undefined
    for (let i = 0; i < args.length; i += 1) {
      const word = args[i] ?? ''
      if (/^-(?:path|literalpath)$/i.test(word) || word === '--') {
        target = args[i + 1]
        break
      }
      if (/^-/.test(word) && word !== '-') continue
      target = word
      break
    }
    if (target === undefined || target === '-') continue
    target = target.replace(HOME_VARIABLES, homedir())
    // Any other variable's value is unknown, since the guard reads text (D73).
    if (/\$|%[A-Za-z_]+%/.test(target)) continue
    // Git Bash writes C:\ as /c/.
    if (process.platform === 'win32') target = target.replace(/^\/([A-Za-z])(?=$|\/)/, '$1:')
    current = path.resolve(current, target)
    folders.push(current)
  }
  return folders
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
