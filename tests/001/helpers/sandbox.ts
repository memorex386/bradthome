import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { slash } from './paths.ts'
import { run } from './run.ts'
import { MADE_UP_LIST } from './terms.ts'

// An isolated machine for one test: its own home, git config, Claude Code
// folder and gh folders. Nothing in it can reach Brad's real list, settings or
// logins.

export interface Sandbox {
  /** The sandbox's own temporary folder. */
  root: string
  home: string
  /** The global git config file, GIT_CONFIG_GLOBAL. */
  gitConfig: string
  /** Claude Code's user folder, CLAUDE_CONFIG_DIR. */
  claudeDir: string
  /** gh's default config folder here, since XDG_CONFIG_HOME points into the sandbox. */
  ghDir: string
  /**
   * Every folder gh could use by default here: ghDir, and on Windows also
   * %APPDATA%\GitHub CLI, which points into the sandbox too.
   */
  ghDefaultDirs: string[]
  /** Where the made-up term list is written. */
  termsFile: string
  /** The environment every process in the test runs with. */
  env: NodeJS.ProcessEnv
  path(...parts: string[]): string
  /** Sets a value in the sandbox's global git config. */
  setGlobal(key: string, value: string): void
  /** Removes a value from the sandbox's global git config. */
  unsetGlobal(key: string): void
  cleanup(): void
}

export interface SandboxOptions {
  /**
   * The term list's text, written to termsFile and named by the
   * bradthome.privateTerms setting. false leaves the setting out.
   */
  terms?: string | false
}

const DROPPED = [
  /^GIT_/i,
  /^GH_/i,
  /^GITHUB_TOKEN$/i,
  /^GITHUB_ENTERPRISE_TOKEN$/i,
  /^HUSKY$/i,
  /^PRIVATE_TERMS$/i,
  /^CLAUDE_PROJECT_DIR$/i,
  /^CLAUDE_CONFIG_DIR$/i,
  /^NODE_OPTIONS$/i,
  /^NODE_PATH$/i,
  /^VITEST/i,
  /^XDG_CONFIG_HOME$/i,
  /^FORCE_COLOR$/i,
]

/** Sets a variable, replacing any spelling of its name, since Windows ignores case. */
export function setEnv(env: NodeJS.ProcessEnv, name: string, value: string | undefined): void {
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === name.toLowerCase()) delete env[key]
  }
  if (value !== undefined) env[name] = value
}

/** Reads a variable whatever the spelling of its name. */
export function getEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const key = Object.keys(env).find((k) => k.toLowerCase() === name.toLowerCase())
  return key === undefined ? undefined : env[key]
}

function quoteConfig(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function createSandbox(options: SandboxOptions = {}): Sandbox {
  const root = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'bradthome-001-')))
  const home = path.join(root, 'home')
  const xdgConfig = path.join(root, 'xdg-config')
  const appData = path.join(root, 'appdata')
  const claudeDir = path.join(root, 'claude')
  const ghDir = path.join(xdgConfig, 'gh')
  const gitConfig = path.join(root, 'gitconfig')
  const termsFile = path.join(root, 'private-terms.txt')
  const ghDefaultDirs = process.platform === 'win32' ? [ghDir, path.join(appData, 'GitHub CLI')] : [ghDir]
  for (const dir of [home, xdgConfig, appData, claudeDir, ...ghDefaultDirs]) mkdirSync(dir, { recursive: true })

  const realHome = os.homedir()
  const env: NodeJS.ProcessEnv = { ...process.env }
  for (const key of Object.keys(env)) {
    if (DROPPED.some((pattern) => pattern.test(key))) delete env[key]
  }
  if (process.platform !== 'win32') {
    // Keep pnpm's store and Corepack's cache where they are, so installs stay
    // fast and offline. They hold packages, not settings.
    env.XDG_CACHE_HOME ??= path.join(realHome, '.cache')
    env.XDG_DATA_HOME ??= path.join(realHome, '.local', 'share')
  }
  setEnv(env, 'HOME', home)
  if (process.platform === 'win32') {
    setEnv(env, 'USERPROFILE', home)
    // gh, among others, reads its settings from %APPDATA%. LOCALAPPDATA stays,
    // since it holds pnpm's store and Corepack's cache, not settings.
    setEnv(env, 'APPDATA', appData)
  }
  setEnv(env, 'XDG_CONFIG_HOME', xdgConfig)
  setEnv(env, 'CLAUDE_CONFIG_DIR', claudeDir)
  setEnv(env, 'GIT_CONFIG_GLOBAL', gitConfig)
  setEnv(env, 'GIT_CONFIG_NOSYSTEM', '1')
  setEnv(env, 'GIT_TERMINAL_PROMPT', '0')
  // Plain output, so the tests compare words rather than colours.
  setEnv(env, 'NO_COLOR', '1')

  const config = [
    '[user]',
    '\tname = Test Agent',
    '\temail = 1234567+test-agent@users.noreply.github.com',
    '[init]',
    '\tdefaultBranch = main',
    '[core]',
    '\tautocrlf = false',
    '[commit]',
    '\tgpgsign = false',
    '[tag]',
    '\tgpgsign = false',
    '[advice]',
    '\tdetachedHead = false',
  ]
  const terms = options.terms ?? MADE_UP_LIST
  if (terms !== false) {
    writeFileSync(termsFile, terms)
    config.push('[bradthome]', `\tprivateTerms = ${quoteConfig(slash(termsFile))}`)
  }
  writeFileSync(gitConfig, `${config.join('\n')}\n`)

  const sandbox: Sandbox = {
    root,
    home,
    gitConfig,
    claudeDir,
    ghDir,
    ghDefaultDirs,
    termsFile,
    env,
    path: (...parts) => path.join(root, ...parts),
    setGlobal(key, value) {
      const result = run('git', ['config', '--global', key, value], { cwd: root, env })
      if (result.status !== 0) throw new Error(`git config --global ${key} failed: ${result.stderr}`)
    },
    unsetGlobal(key) {
      run('git', ['config', '--global', '--unset-all', key], { cwd: root, env })
    },
    cleanup() {
      try {
        rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch {
        // A leftover temporary folder is harmless.
      }
    },
  }
  return sandbox
}

function namesOf(executable: string): string[] {
  return process.platform === 'win32'
    ? [`${executable}.exe`, `${executable}.cmd`, `${executable}.bat`, `${executable}.ps1`, `${executable}.shim`, executable]
    : [executable]
}

function holds(dir: string, executable: string): boolean {
  return namesOf(executable).some((name) => existsSync(path.join(dir, name)))
}

let mirrors = 0

/** A copy of a folder, made of links, without the executable's files. */
function mirrorWithout(dir: string, executable: string, under: string): string {
  mirrors += 1
  const mirror = path.join(under, `path-without-${executable}-${mirrors}`)
  mkdirSync(mirror, { recursive: true })
  const skipped = new Set(namesOf(executable).map((name) => name.toLowerCase()))
  for (const name of readdirSync(dir)) {
    if (skipped.has(name.toLowerCase())) continue
    const from = path.join(dir, name)
    const to = path.join(mirror, name)
    try {
      symlinkSync(from, to)
    } catch {
      try {
        if (statSync(from).isFile()) linkSync(from, to)
      } catch {
        // Something that can be neither linked nor hard-linked stays out.
      }
    }
  }
  return mirror
}

/**
 * The sandbox's environment with an executable taken off PATH. A folder that
 * holds it is replaced by a mirror of the folder's other files, so tools that
 * share the folder, such as git, stay on PATH.
 */
export function withoutOnPath(sandbox: Pick<Sandbox, 'env' | 'root'>, executable: string): NodeJS.ProcessEnv {
  const next = { ...sandbox.env }
  const entries = (getEnv(sandbox.env, 'PATH') ?? '').split(path.delimiter).filter((dir) => dir !== '')
  const kept = entries.map((dir) => (holds(dir, executable) ? mirrorWithout(dir, executable, sandbox.root) : dir))
  if (!kept.some((dir) => holds(dir, 'git'))) {
    throw new Error(`git can't stay on PATH without ${executable} on this machine`)
  }
  setEnv(next, 'PATH', kept.join(path.delimiter))
  return next
}

/** Writes a gh config folder whose hosts.yml says which account is logged in. */
export function writeGhLogin(dir: string, login: string): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    path.join(dir, 'hosts.yml'),
    ['github.com:', '    users:', `        ${login}:`, '    git_protocol: ssh', `    user: ${login}`, ''].join('\n'),
  )
  writeFileSync(path.join(dir, 'config.yml'), 'version: "1"\n')
}

/** Logs gh in as an account in every folder gh could use by default here. */
export function writeDefaultGhLogin(sandbox: Pick<Sandbox, 'ghDefaultDirs'>, login: string): void {
  for (const dir of sandbox.ghDefaultDirs) writeGhLogin(dir, login)
}
