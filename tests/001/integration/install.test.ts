import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { runHook, userPrompt } from '../helpers/hook-input.ts'
import { PASS } from '../helpers/messages.ts'
import { REPO_ROOT, SCRIPTS, slash } from '../helpers/paths.ts'
import { describeRun, filledLines, run, runNode, runPnpm, type RunResult } from '../helpers/run.ts'
import { createSandbox, type Sandbox, writeDefaultGhLogin, writeGhLogin } from '../helpers/sandbox.ts'

// A fresh clone of this checkout on an isolated machine, set up with
// `pnpm install` alone (S8.1, FR-015, SC-005). The clone comes from the
// working tree as it is, so the test covers changes not committed yet.

/** A clone, an install and a run of the hooks can take minutes on Windows. */
const INSTALL_TIMEOUT = 900_000

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

function git(cwd: string, sandbox: Sandbox, args: readonly string[]): string {
  const result = run('git', args, { cwd, env: sandbox.env })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed\n${describeRun(result)}`)
  return result.stdout.trim()
}

/** Clones this checkout's working tree: its tracked files, and new ones git doesn't ignore. */
function freshClone(sandbox: Sandbox, name: string): string {
  const source = sandbox.path(`${name}-source`)
  const listed = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: REPO_ROOT,
    env: process.env,
  })
  if (listed.status !== 0) throw new Error(describeRun(listed))
  for (const file of new Set(listed.stdout.split('\0').filter((entry) => entry !== ''))) {
    const from = path.join(REPO_ROOT, file)
    if (!existsSync(from)) continue
    mkdirSync(path.dirname(path.join(source, file)), { recursive: true })
    copyFileSync(from, path.join(source, file))
  }
  git(sandbox.root, sandbox, ['init', '--quiet', '--initial-branch=main', source])
  git(source, sandbox, ['add', '--all'])
  git(source, sandbox, ['commit', '--quiet', '--no-verify', '-m', 'chore(repo): copy the checkout'])
  const origin = sandbox.path(`${name}-origin.git`)
  git(sandbox.root, sandbox, ['clone', '--quiet', '--bare', source, origin])
  const clone = sandbox.path(name)
  git(sandbox.root, sandbox, ['clone', '--quiet', slash(origin), clone])
  return clone
}

function install(clone: string, sandbox: Sandbox): RunResult {
  return runPnpm(['install', '--prefer-offline'], { cwd: clone, env: sandbox.env, timeout: 600_000 })
}

function localSettings(clone: string): Record<string, unknown> | undefined {
  const file = path.join(clone, '.claude', 'settings.local.json')
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : undefined
}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
  return norm(a) === norm(b)
}

describe('a machine that is set up', () => {
  test("S8.1 S2.8 FR-015 FR-018 SC-005 a fresh clone needs only pnpm install, which leaves gh on Brad's login while the agent's is suspended, and the setup check then passes", () => {
    const sandbox = createSandbox()
    sandboxes.push(sandbox)
    const agentDir = sandbox.path('agent-gh')
    writeGhLogin(agentDir, 'bradthome-agent')
    writeDefaultGhLogin(sandbox, 'memorex386')
    sandbox.setGlobal('bradthome.agentGhConfigDir', slash(agentDir))
    const guard = runNode(SCRIPTS.guardInstall, [], { cwd: REPO_ROOT, env: sandbox.env })
    expect(guard.status, describeRun(guard)).toBe(0)

    const clone = freshClone(sandbox, 'clone')
    mkdirSync(path.join(clone, '.claude'), { recursive: true })
    writeFileSync(path.join(clone, '.claude', 'settings.local.json'), '{ "permissions": { "allow": ["Bash(ls *)"] } }\n')

    const installed = install(clone, sandbox)
    expect(installed.status, describeRun(installed)).toBe(0)
    expect(git(clone, sandbox, ['config', 'core.hooksPath'])).toBe('.husky/_')

    // While the agent's account is suspended, gh stays on its default folder, Brad's login (D160).
    const settings = localSettings(clone)
    const ghDir = (settings?.env as Record<string, string> | undefined)?.GH_CONFIG_DIR
    expect(ghDir === undefined || !samePath(ghDir, agentDir), ghDir).toBe(true)
    expect(settings?.permissions).toEqual({ allow: ['Bash(ls *)'] })
    const output = installed.stdout + installed.stderr
    expect(output).not.toContain(slash(agentDir))
    expect(output).not.toContain(agentDir)

    const check = runPnpm(['setup:check'], { cwd: clone, env: sandbox.env })
    expect(check.status, describeRun(check)).toBe(0)
    expect(filledLines(check.stdout + check.stderr)).toContain('Ready.')

    git(clone, sandbox, ['switch', '--quiet', '--create', '001-demo'])
    writeFileSync(path.join(clone, 'docs', 'scratch-change.md'), 'A change made in a fresh clone.\n')
    git(clone, sandbox, ['add', '--all'])
    const commit = run('git', ['commit', '-m', 'feat(001): add a scratch change'], { cwd: clone, env: sandbox.env })
    expect(commit.status, describeRun(commit)).toBe(0)
    const commitLines = filledLines(commit.stderr)
    expect(commitLines.some((line) => PASS.preCommit.test(line)), commit.stderr).toBe(true)
    expect(commitLines.some((line) => PASS.commitMsg.test(line)), commit.stderr).toBe(true)
    const push = run('git', ['push', '--set-upstream', 'origin', '001-demo'], { cwd: clone, env: sandbox.env })
    expect(push.status, describeRun(push)).toBe(0)
    expect(filledLines(push.stderr).some((line) => PASS.prePush.test(line)), push.stderr).toBe(true)
  }, INSTALL_TIMEOUT)
})

describe("a checkout set up before the agent's account was suspended", () => {
  test("S2.8 FR-015 FR-018 pnpm install takes the agent's gh folder back out of the local settings, keeps the rest, and prints no path", () => {
    const sandbox = createSandbox()
    sandboxes.push(sandbox)
    const agentDir = sandbox.path('agent-gh')
    writeGhLogin(agentDir, 'bradthome-agent')
    writeDefaultGhLogin(sandbox, 'memorex386')
    sandbox.setGlobal('bradthome.agentGhConfigDir', slash(agentDir))
    const clone = freshClone(sandbox, 'clone')
    mkdirSync(path.join(clone, '.claude'), { recursive: true })
    writeFileSync(
      path.join(clone, '.claude', 'settings.local.json'),
      `${JSON.stringify({ env: { GH_CONFIG_DIR: slash(agentDir), OTHER: 'kept' }, permissions: { allow: ['Bash(ls *)'] } }, null, 2)}\n`,
    )
    const installed = install(clone, sandbox)
    expect(installed.status, describeRun(installed)).toBe(0)
    const settings = localSettings(clone)
    expect(settings?.env).toEqual({ OTHER: 'kept' })
    expect(settings?.permissions).toEqual({ allow: ['Bash(ls *)'] })
    const output = installed.stdout + installed.stderr
    expect(output).not.toContain(slash(agentDir))
    expect(output).not.toContain(agentDir)
  }, INSTALL_TIMEOUT)
})

describe('a machine without the agent login', () => {
  test("FR-015 SC-005 pnpm install still turns the hooks on, and writes no local settings", () => {
    const sandbox = createSandbox()
    sandboxes.push(sandbox)
    const clone = freshClone(sandbox, 'clone')

    const before = runHook(SCRIPTS.turnStart, userPrompt(clone, 'install-before'), sandbox.env, clone)
    expect(before.status, describeRun(before)).toBe(0)
    expect(before.stdout + before.stderr, 'the turn-start hook reminds the agent').toMatch(/pnpm install/)

    const installed = install(clone, sandbox)
    expect(installed.status, describeRun(installed)).toBe(0)
    expect(git(clone, sandbox, ['config', 'core.hooksPath'])).toBe('.husky/_')
    expect(localSettings(clone)).toBeUndefined()

    const after = runHook(SCRIPTS.turnStart, userPrompt(clone, 'install-after'), sandbox.env, clone)
    expect(after.status, describeRun(after)).toBe(0)
    expect(after.stdout + after.stderr).not.toMatch(/pnpm install/)
  }, INSTALL_TIMEOUT)

  test("FR-015 FR-018 pnpm install leaves the local settings alone when the folder holds another account's login", () => {
    const sandbox = createSandbox()
    sandboxes.push(sandbox)
    const wrongDir = sandbox.path('wrong-gh')
    writeGhLogin(wrongDir, 'memorex386')
    sandbox.setGlobal('bradthome.agentGhConfigDir', slash(wrongDir))
    const clone = freshClone(sandbox, 'clone')
    const installed = install(clone, sandbox)
    expect(installed.status, describeRun(installed)).toBe(0)
    expect(git(clone, sandbox, ['config', 'core.hooksPath'])).toBe('.husky/_')
    expect(localSettings(clone)).toBeUndefined()
    const output = installed.stdout + installed.stderr
    expect(output).not.toContain(slash(wrongDir))
    expect(output).not.toContain(wrongDir)
  }, INSTALL_TIMEOUT)
})
