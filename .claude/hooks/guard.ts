import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isBrowserTool, opensRepoPage } from './lib/browser.ts'
import { mcpAction, pullRequestActions } from './lib/github.ts'
import { answer, deny, type HookInput, inputCwd, parseInput, type PreToolUseAnswer, readStdin } from './lib/io.ts'
import { lockedEdit } from './lib/locks.ts'
import { commandName, parseCommand, type Shell, type SimpleCommand } from './lib/shell.ts'

// The guard Claude Code runs before each shell, file and browser call in this
// repo (FR-017, FR-019, FR-020, D73). It covers what the deny and ask rules in
// .claude/settings.json can't express: -n against --no-verify, merges kept in
// a file, URLs inside a browser tool's input, and edits to locked tests. The
// rules still hold if this hook doesn't run. It fails closed for a shell or
// browser call it can't read. A command that uses Brad's GitHub login runs
// without a prompt, and the guard logs it and says so instead (D90).

export const MESSAGES = {
  merge: 'Brad merges pull requests. Ask for the merge in the pull request.',
  approve: 'Only Brad approves pull requests. Leave a comment instead.',
  skipHooks: "Don't skip the git hooks. Fix what they report instead.",
  browser: "The browser stays off this repo's pull request and settings pages. Read pull requests with gh.",
  unreadable: "The guard couldn't read this tool call, so it's blocked. Try the call again.",
  loginLogged: "This command uses Brad's GitHub login. It's logged, not asked (D90).",
  loginNotLogged: "This command uses Brad's GitHub login. The log couldn't be written, so it isn't logged.",
}

export function lockedMessage(file: string, spec: string): string {
  return `${file} is locked by spec ${spec}. Change the spec first; Brad approves both in the pull request.`
}

const SHELLS: Record<string, Shell> = { Bash: 'bash', PowerShell: 'powershell' }
const EDITS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const REMOVERS = new Set(['rm', 'rmdir', 'unlink', 'mv', 'del', 'erase', 'rd', 'remove-item', 'ri', 'move-item', 'mi', 'move', 'rename-item', 'ren', 'rni'])
const NO_VERIFY = /^--no-veri(?:fy?)?$/
/** git commit's short flags that take a value, which ends a cluster such as -anm. */
const COMMIT_VALUE_SHORT = new Set(['m', 'F', 'C', 'c', 't', 'S', 'u'])
const COMMIT_VALUE_LONG = new Set(['--message', '--file', '--author', '--date', '--template', '--reuse-message', '--reedit-message', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file'])

/** Setting one of these switches a check off: HUSKY=0, any PRIVATE_TERMS, or a hooks path through git's config variables. */
function bypassVariable(name: string, value: string): boolean {
  const upper = name.toUpperCase()
  if (upper === 'HUSKY') return value.trim().replace(/^["']|["']$/g, '') === '0'
  if (upper === 'PRIVATE_TERMS') return true
  return upper.startsWith('GIT_CONFIG') && /hookspath/i.test(value)
}

function isHuskyPath(word: string): boolean {
  const p = word.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase()
  return p === '.husky' || p.startsWith('.husky/') || p.endsWith('/.husky') || p.includes('/.husky/')
}

function commitSkips(args: readonly string[]): boolean {
  for (let i = 0; i < args.length; i += 1) {
    const word = args[i] ?? ''
    if (word === '--') return false
    if (COMMIT_VALUE_LONG.has(word)) {
      i += 1
      continue
    }
    if (!/^-[^-]/.test(word)) continue
    for (const [index, flag] of [...word.slice(1)].entries()) {
      if (flag === 'n') return true
      if (COMMIT_VALUE_SHORT.has(flag)) {
        // The value is the rest of the cluster, or else the next word.
        if (index === word.length - 2 && flag !== 'S' && flag !== 'u') i += 1
        break
      }
    }
  }
  return false
}

/** Whether git config would change core.hooksPath: a value after the key, --unset and the like, or a removed core section. */
function configChangesHooksPath(args: readonly string[]): boolean {
  const writes = new Set(['--unset', '--unset-all', '--replace-all', '--add', 'set', 'unset'])
  const sections = new Set(['--remove-section', '--rename-section', 'remove-section', 'rename-section'])
  const words: string[] = []
  let writing = false
  for (let i = 0; i < args.length; i += 1) {
    const word = args[i] ?? ''
    if (sections.has(word) && (args[i + 1] ?? '').toLowerCase() === 'core') return true
    if (writes.has(word)) writing = true
    else if (['--file', '-f', '--blob', '--type', '-t', '--default'].includes(word)) i += 1
    else if (!word.startsWith('-')) words.push(word)
  }
  const at = words.findIndex((word) => word.toLowerCase() === 'core.hookspath')
  return at >= 0 && (writing || words.length > at + 1)
}

function gitSkips(command: SimpleCommand): boolean {
  const words = command.words
  let i = 1
  for (; i < words.length; i += 1) {
    const word = words[i] ?? ''
    if (word === '-c' || word === '--config-env') {
      if (/^core\.hookspath\b/i.test(words[i + 1] ?? '')) return true
      i += 1
    } else if (/^-c.+/.test(word) || word.startsWith('--config-env=')) {
      if (/core\.hookspath/i.test(word)) return true
    } else if (['-C', '--git-dir', '--work-tree', '--namespace'].includes(word)) i += 1
    else if (!word.startsWith('-')) break
  }
  const sub = words[i] ?? ''
  const args = words.slice(i + 1)
  const dashDash = args.indexOf('--')
  if ((dashDash < 0 ? args : args.slice(0, dashDash)).some((word) => NO_VERIFY.test(word))) return true
  if (sub === 'commit') return commitSkips(args)
  if (sub === 'config') return configChangesHooksPath(args)
  if (sub === 'rm' || sub === 'mv') return args.some(isHuskyPath)
  if (sub === 'clean') {
    // git clean -x deletes ignored files, which includes husky's .husky/_ folder.
    const clusters = args.filter((word) => /^-[^-]/.test(word)).join('')
    return /[xX]/.test(clusters) && !/n/.test(clusters) && !args.includes('--dry-run')
  }
  return false
}

function skipsHooks(command: SimpleCommand): boolean {
  for (const [name, value] of command.assignments) if (bypassVariable(name, value)) return true
  const name = commandName(command)
  if (name === 'git') return gitSkips(command)
  if (REMOVERS.has(name)) return command.words.slice(1).some(isHuskyPath)
  if (name === 'setx') return bypassVariable(command.words[1] ?? '', command.words[2] ?? '0')
  return false
}

const SET_ENVIRONMENT = /SetEnvironmentVariable\(\s*['"](PRIVATE_TERMS|HUSKY)['"]\s*,\s*['"]?([^'")]*)/i

function checkCommand(text: string, shell: Shell, cwd: string): PreToolUseAnswer | undefined {
  const parsed = parseCommand(text, shell)
  const readFile = (file: string): string | undefined => {
    try {
      return readFileSync(path.resolve(cwd, file), 'utf8')
    } catch {
      return undefined
    }
  }
  const actions = pullRequestActions(parsed, readFile)
  if (actions.some((action) => action.action === 'merge')) return deny(MESSAGES.merge)
  if (actions.some((action) => action.action === 'approve')) return deny(MESSAGES.approve)
  const set = SET_ENVIRONMENT.exec(text)
  if (
    parsed.exports.some((variable) => bypassVariable(variable.name, variable.value)) ||
    parsed.commands.some(skipsHooks) ||
    (set !== null && bypassVariable(set[1] ?? '', set[2] ?? ''))
  ) {
    return deny(MESSAGES.skipHooks)
  }
  return undefined
}

/** The guard's answer to one tool call: a deny, or undefined to let Claude Code decide. */
export function decide(input: HookInput): PreToolUseAnswer | undefined {
  const tool = typeof input.tool_name === 'string' ? input.tool_name : ''
  const toolInput = (typeof input.tool_input === 'object' && input.tool_input !== null ? input.tool_input : {}) as Record<string, unknown>
  const cwd = inputCwd(input)
  const shell = SHELLS[tool]
  if (shell !== undefined) {
    return typeof toolInput.command === 'string' ? checkCommand(toolInput.command, shell, cwd) : deny(MESSAGES.unreadable)
  }
  if (EDITS.has(tool)) {
    const file = toolInput.file_path ?? toolInput.notebook_path
    if (typeof file !== 'string') return undefined
    const locked = lockedEdit(file, cwd)
    return locked === undefined ? undefined : deny(lockedMessage(locked.file, locked.spec))
  }
  if (tool.startsWith('mcp__')) {
    const action = mcpAction(tool, toolInput)
    if (action !== undefined) return deny(action === 'merge' ? MESSAGES.merge : MESSAGES.approve)
    if (isBrowserTool(tool) && opensRepoPage(toolInput)) return deny(MESSAGES.browser)
  }
  return undefined
}

// The variables and gh auth commands the old ask rules matched: each one acts
// as Brad's GitHub account, or could. PowerShell's variable names ignore case,
// and gh may be called as gh.exe. A command that only mentions one is logged
// too: a line too many is better than a call missed.
const BRADS_LOGIN = /\b(?:GH_CONFIG_DIR|GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN)\b|\bgh(?:\.exe)?["']?\s+auth\s+(?:switch|login|logout|token|refresh|setup-git)\b/i
// A token variable's value, however it's set: NAME=v, $env:NAME = v,
// ${env:NAME} = v, SetEnvironmentVariable('NAME', v), Set-Item Env:NAME v,
// New-Item Env:NAME -Value v and setx NAME v.
const TOKEN_VALUE = /\b((?:GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN)\}?['"]?(?:\s*[=,]\s*|\s+(?:-Value\s+)?))("(?:\\.|[^"\\])*"?|'[^']*'?|[^\s;&|),]+)/gi
// Anything shaped like a GitHub token, such as one piped to gh auth login --with-token.
const GITHUB_TOKEN_SHAPE = /\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g

/** Whether a shell call uses Brad's login. */
export function usesBradsLogin(input: HookInput): boolean {
  const toolInput = (typeof input.tool_input === 'object' && input.tool_input !== null ? input.tool_input : {}) as Record<string, unknown>
  const tool = typeof input.tool_name === 'string' ? input.tool_name : ''
  return SHELLS[tool] !== undefined && typeof toolInput.command === 'string' && BRADS_LOGIN.test(toolInput.command)
}

/** The command with every token's value hidden. */
export function hideTokens(command: string): string {
  return command.replace(TOKEN_VALUE, '$1***').replace(GITHUB_TOKEN_SHAPE, '***')
}

/** The log of Brad's login on Brad's PC, outside the repo. BRADTHOME_LOGIN_LOG moves it, for tests. */
export function loginLogFile(env: NodeJS.ProcessEnv): string {
  return env.BRADTHOME_LOGIN_LOG ?? path.join(os.homedir(), '.claude', 'bradthome', 'brads-login.jsonl')
}

/** Appends the call to the log, and returns the notice for the session. */
export function logBradsLogin(input: HookInput, file: string, now = new Date()): { systemMessage: string } {
  const toolInput = input.tool_input as Record<string, unknown>
  const line = {
    at: now.toISOString(),
    session: typeof input.session_id === 'string' ? input.session_id : '',
    cwd: inputCwd(input),
    tool: input.tool_name,
    command: hideTokens(String(toolInput.command)),
  }
  try {
    mkdirSync(path.dirname(file), { recursive: true })
    appendFileSync(file, `${JSON.stringify(line)}\n`)
    return { systemMessage: MESSAGES.loginLogged }
  } catch {
    return { systemMessage: MESSAGES.loginNotLogged }
  }
}

function isMain(): boolean {
  const argv = path.resolve(process.argv[1] ?? '')
  const self = fileURLToPath(import.meta.url)
  return process.platform === 'win32' ? argv.toLowerCase() === self.toLowerCase() : argv === self
}

if (isMain()) {
  try {
    const input = parseInput(await readStdin())
    if (input === undefined) answer(deny(MESSAGES.unreadable))
    else {
      const decision = decide(input)
      answer(decision ?? (usesBradsLogin(input) ? logBradsLogin(input, loginLogFile(process.env)) : undefined))
    }
  } catch {
    answer(deny(MESSAGES.unreadable))
  }
}
