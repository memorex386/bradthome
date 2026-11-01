import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { claudeConfigDir, GUARD_FOLDER, type Settings, USER_DENY_RULES } from './lib/claude.ts'
import { stagedCopyProblems } from './lib/copies.ts'
import { AGENT_LOGIN, defaultGhDir, ghLogin } from './lib/gh.ts'
import { runGit, topLevel } from './lib/git.ts'
import { gitleaksVersion } from './lib/gitleaks.ts'
import { listFix, listProblem, S4_FIX } from './lib/messages.ts'
import { print } from './lib/output.ts'
import { envValue, loadTerms, type Terms } from './lib/terms.ts'

// pnpm setup:check: reports each part of a machine's setup, with a fix for each
// problem (FR-028, S8.2, S8.3): the git hooks, the private-term list and its
// size, gitleaks, gh's account for Claude Code here, the guard for sessions
// started elsewhere, and the copies. It shows how many terms the list has,
// never a term, and it reads everything locally.

interface Line {
  ok: boolean
  text: string
  fix?: string
}

const pass = (text: string): Line => ({ ok: true, text })
const fail = (text: string, fix: string): Line => ({ ok: false, text, fix })

function readSettings(file: string): Settings | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Settings
  } catch {
    return undefined
  }
}

function hooksLine(root: string): Line {
  const configured = runGit(['config', '--get', 'core.hooksPath'], { cwd: root }).stdout.trim()
  const dir = path.resolve(root, '.husky', '_')
  const hooks = ['pre-commit', 'commit-msg', 'pre-push']
  const on =
    configured !== '' &&
    path.resolve(root, configured) === dir &&
    ['h', ...hooks].every((name) => existsSync(path.join(dir, name))) &&
    hooks.every((name) => existsSync(path.join(root, '.husky', name)))
  return on ? pass('git hooks are on') : fail('git hooks are off', '  Fix: pnpm install')
}

function termsLine(root: string): { line: Line; terms: Terms | undefined } {
  const loaded = loadTerms(process.env, root)
  if ('problem' in loaded) return { line: fail(listProblem(loaded.problem), listFix(loaded.source)), terms: undefined }
  const count = loaded.terms.count
  return { line: pass(`private-term list found: ${count} ${count === 1 ? 'term' : 'terms'}`), terms: loaded.terms }
}

function versionAtLeast(version: string, wanted: readonly number[]): boolean {
  const parts = version.split('.').map(Number)
  for (let i = 0; i < wanted.length; i += 1) {
    if ((parts[i] ?? 0) !== (wanted[i] ?? 0)) return (parts[i] ?? 0) > (wanted[i] ?? 0)
  }
  return true
}

function gitleaksLine(): Line {
  const version = gitleaksVersion(process.env)
  if (version === undefined) return fail('gitleaks not installed', S4_FIX)
  if (!versionAtLeast(version, [8, 30, 1])) return fail(`gitleaks ${version} is older than 8.30.1`, S4_FIX)
  return pass(`gitleaks ${version}`)
}

/**
 * The environment Claude Code gives gh in this checkout. Settings win in
 * Claude Code's order: the checkout's local settings, its shared settings,
 * then the user's. Then comes the environment Claude Code started in.
 */
function claudeEnv(root: string, name: string): string | undefined {
  for (const file of [
    path.join(root, '.claude', 'settings.local.json'),
    path.join(root, '.claude', 'settings.json'),
    path.join(claudeConfigDir(process.env), 'settings.json'),
  ]) {
    const value = readSettings(file)?.env?.[name]
    if (typeof value === 'string' && value !== '') return value
  }
  const value = envValue(process.env, name)
  return value === '' ? undefined : value
}

function ghLine(root: string): Line {
  const fix = '  Fix: set GH_CONFIG_DIR in .claude/settings.local.json. AGENTS.md shows how.'
  for (const token of ['GH_TOKEN', 'GITHUB_TOKEN']) {
    if (claudeEnv(root, token) !== undefined) {
      return fail(`Claude Code here gives gh a token in ${token}, so its account can't be checked`, `  Fix: remove ${token} from the settings or the environment. AGENTS.md shows how.`)
    }
  }
  const dir = claudeEnv(root, 'GH_CONFIG_DIR') ?? defaultGhDir(process.env)
  const login = ghLogin(dir)
  if (login === AGENT_LOGIN) return pass(`Claude Code here runs gh as ${AGENT_LOGIN}`)
  if (login === undefined) return fail('Claude Code here runs gh with no login', fix)
  return fail(`Claude Code here runs gh as ${login}, not ${AGENT_LOGIN}`, fix)
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
}

function guardLine(root: string): Line {
  const fix = '  Fix: pnpm guard:install'
  const settings = readSettings(path.join(claudeConfigDir(process.env), 'settings.json'))
  const command = (settings?.hooks?.PreToolUse ?? [])
    .flatMap((group) => group.hooks ?? [])
    .map((handler) => handler.command ?? '')
    .find((text) => text.includes(GUARD_FOLDER))
  const script = command === undefined ? undefined : /"([^"]+user-guard\.ts)"|(\S+user-guard\.ts)/.exec(command)
  const installed = script?.[1] ?? script?.[2]
  const deny = new Set(settings?.permissions?.deny ?? [])
  if (installed === undefined || !existsSync(installed) || !USER_DENY_RULES.every((rule) => deny.has(rule))) {
    return fail("the guard for sessions started elsewhere isn't installed", fix)
  }
  // The installed copy matches this checkout's hooks, or it's out of date.
  const source = path.join(root, '.claude', 'hooks')
  const copy = path.dirname(installed)
  const stale = filesUnder(source).some((file) => {
    try {
      return !readFileSync(path.join(copy, file)).equals(readFileSync(path.join(source, file)))
    } catch {
      return true
    }
  })
  return stale ? fail('the guard for sessions started elsewhere is out of date', fix) : pass('the guard for sessions started elsewhere is installed')
}

function copiesLine(root: string): Line {
  return stagedCopyProblems({ cwd: root }).length === 0
    ? pass('skill copies and template overrides match')
    : fail('skill copies or template overrides out of date', '  Fix: pnpm sync, then stage the copies.')
}

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const { line: terms, terms: loaded } = termsLine(root)
  const lines = [hooksLine(root), terms, gitleaksLine(), ghLine(root), guardLine(root), copiesLine(root)]
  const problems = lines.filter((line) => !line.ok).length
  const report = lines.flatMap((line) => (line.ok ? [`✓ ${line.text}`] : [`✖ ${line.text}`, line.fix ?? '']))
  report.push(problems === 0 ? 'Ready.' : `${problems} ${problems === 1 ? 'problem' : 'problems'}.`)
  print(report, loaded, process.stdout)
  return problems === 0 ? 0 : 1
}

process.exitCode = main()
