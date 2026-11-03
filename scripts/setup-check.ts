import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { claudeConfigDir, GUARD_FOLDER, type Settings, USER_DENY_RULES } from './lib/claude.ts'
import { stagedCopyProblems } from './lib/copies.ts'
import { AGENT_LOGIN, answerProblem, defaultGhDir, ghApi, ghLogin, githubSlug, REPO_SLUG } from './lib/gh.ts'
import { runGit, topLevel } from './lib/git.ts'
import { gitleaksVersion } from './lib/gitleaks.ts'
import { listed, listFix, listProblem, S1_REPO_PASS, S4_FIX } from './lib/messages.ts'
import { print } from './lib/output.ts'
import { envValue, loadTerms, type Terms } from './lib/terms.ts'
import { IMAGE } from './site/visual.ts'

// pnpm setup:check: reports each part of a machine's setup, with a fix for each
// problem (FR-028, S8.2, S8.3): the git hooks, the private-term list and its
// size, gitleaks, gh's account for Claude Code here, the guard for sessions
// started elsewhere, the copies, and, in a checkout of the repo on GitHub,
// the repo's merge settings (FR-019, S6.1). In a checkout with the site, it
// checks Docker answers, for pnpm test:visual's container (FR-022). It shows how many terms the list has,
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
      return fail(
        `Claude Code here gives gh a token in ${token}, so its account can't be checked`,
        `  Fix: remove ${token} from the settings or the environment. AGENTS.md shows how.`,
      )
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
  return stale
    ? fail('the guard for sessions started elsewhere is out of date', fix)
    : pass('the guard for sessions started elsewhere is installed')
}

function copiesLine(root: string): Line {
  return stagedCopyProblems({ cwd: root }).length === 0
    ? pass('skill copies and template overrides match')
    : fail('skill copies or template overrides out of date', '  Fix: pnpm sync, then stage the copies.')
}

/** Docker, for pnpm test:visual's container. Shown only in a checkout that has the site. */
function dockerLines(root: string): Line[] {
  if (!existsSync(path.join(root, 'apps', 'site', 'package.json'))) return []
  const image = IMAGE.split('@')[0] ?? IMAGE
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
  })
  if (result.error !== undefined)
    return [fail('Docker not installed', `  Fix: install Docker Desktop for pnpm test:visual, which runs ${image}.`)]
  if (result.status !== 0) return [fail("Docker's engine isn't running", '  Fix: start Docker Desktop, then run pnpm setup:check again.')]
  return [pass(`Docker ${result.stdout.trim()} answers, for pnpm test:visual's container ${image}`)]
}

/** A merge setting, the value FR-019 wants, and the words for it when it differs. */
const MERGE_SETTINGS = [
  { key: 'allow_squash_merge', wanted: true, wrong: 'squash merges are off' },
  { key: 'allow_merge_commit', wanted: false, wrong: 'merge commits are allowed' },
  { key: 'allow_rebase_merge', wanted: false, wrong: 'rebase merges are allowed' },
  { key: 'squash_merge_commit_title', wanted: 'PR_TITLE', wrong: "the squash commit's title isn't the pull request's title" },
  { key: 'squash_merge_commit_message', wanted: 'COMMIT_MESSAGES', wrong: "the squash commit's body isn't the branch's commit messages" },
  { key: 'allow_auto_merge', wanted: true, wrong: 'auto-merge is off' },
  { key: 'delete_branch_on_merge', wanted: true, wrong: "branches aren't deleted after merging" },
] as const

/**
 * The repo's merge settings, read through gh as whichever account it runs as,
 * which write access allows. Shown only in a checkout of the repo on GitHub.
 */
function repoLines(root: string): Line[] {
  const origin = runGit(['remote', 'get-url', 'origin'], { cwd: root })
  if (origin.status !== 0 || githubSlug(origin.stdout)?.toLowerCase() !== REPO_SLUG) return []
  const answer = ghApi(`repos/${REPO_SLUG}`, process.env, root)
  if (answer.kind !== 'ok') {
    return [
      fail(
        `repo settings can't be read: ${answerProblem(answer)}`,
        '  Fix: check gh is installed and signed in (gh auth status), then run pnpm setup:check again.',
      ),
    ]
  }
  const settings = answer.body as Record<string, unknown>
  const wrong = MERGE_SETTINGS.filter((setting) => settings[setting.key] !== setting.wanted)
  if (wrong.length === 0) return [pass(S1_REPO_PASS)]
  const fields = wrong.map((setting) => `${typeof setting.wanted === 'string' ? '-f' : '-F'} ${setting.key}=${String(setting.wanted)}`)
  return [
    fail(
      `repo settings: ${listed(wrong.map((setting) => setting.wrong))}`,
      `  Fix: Brad runs gh api -X PATCH repos/${REPO_SLUG} ${fields.join(' ')}`,
    ),
  ]
}

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const { line: terms, terms: loaded } = termsLine(root)
  const lines = [
    hooksLine(root),
    terms,
    gitleaksLine(),
    ghLine(root),
    guardLine(root),
    copiesLine(root),
    ...dockerLines(root),
    ...repoLines(root),
  ]
  const problems = lines.filter((line) => !line.ok).length
  const report = lines.flatMap((line) => (line.ok ? [`✓ ${line.text}`] : [`✖ ${line.text}`, line.fix ?? '']))
  report.push(problems === 0 ? 'Ready.' : `${problems} ${problems === 1 ? 'problem' : 'problems'}.`)
  print(report, loaded, process.stdout)
  return problems === 0 ? 0 : 1
}

process.exitCode = main()
