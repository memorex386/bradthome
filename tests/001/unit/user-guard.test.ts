import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { decide } from '../../../.claude/hooks/user-guard.ts'
import { bash, type HookInput, powershell, preToolUseDecision, processDecision, runHook } from '../helpers/hook-input.ts'
import { C } from '../helpers/messages.ts'
import { repoPath, SCRIPTS, slash } from '../helpers/paths.ts'
import { hookMatcherCovers, matchingRules } from '../helpers/rules.ts'
import { describeRun, run, runNode } from '../helpers/run.ts'
import { createSandbox, type Sandbox } from '../helpers/sandbox.ts'

// The guard in Brad's user settings covers sessions started in other folders.
// It's tested through the decision logic it exports, as a copy run from
// another folder, and as `pnpm guard:install` installs it.

let sandbox: Sandbox
let elsewhere: string
let bradthome: string
let otherRepo: string
let lookAlike: string

function checkout(name: string, origin?: string): string {
  const dir = sandbox.path(name)
  mkdirSync(dir, { recursive: true })
  if (origin !== undefined) {
    for (const args of [['init', '--quiet'], ['remote', 'add', 'origin', origin]]) {
      const result = run('git', args, { cwd: dir, env: sandbox.env })
      if (result.status !== 0) throw new Error(describeRun(result))
    }
  }
  return dir
}

beforeAll(() => {
  sandbox = createSandbox()
  elsewhere = checkout('notes')
  bradthome = checkout('bradthome-clone', 'git@github.com-bradthome-agent:memorex386/bradthome.git')
  otherRepo = checkout('other-repo', 'https://github.com/someone/other.git')
  lookAlike = checkout('look-alike', 'git@github.com:memorex386/bradthome-old.git')
})

afterAll(() => sandbox.cleanup())

/** A session whose project is the given folder. */
function session(project: string): NodeJS.ProcessEnv {
  return { ...sandbox.env, CLAUDE_PROJECT_DIR: project }
}

async function answer(input: HookInput, env: NodeJS.ProcessEnv): Promise<{ decision: string; reason: string | undefined }> {
  return preToolUseDecision(await decide(input, env))
}

const DENIED = [
  'gh pr merge 12 -R memorex386/bradthome --squash',
  'gh pr merge 12 --repo memorex386/bradthome --squash',
  'gh pr merge 12 --repo=memorex386/bradthome',
  'gh pr merge https://github.com/memorex386/bradthome/pull/12 --squash',
  'gh pr review 12 -R memorex386/bradthome --approve',
  'gh pr review https://github.com/memorex386/bradthome/pull/12 -a',
  'gh api -X PUT repos/memorex386/bradthome/pulls/12/merge',
  'gh api repos/memorex386/bradthome/pulls/12/reviews -f event=APPROVE',
  'GH_REPO=memorex386/bradthome gh pr merge 12',
]

const OTHER_REPOS = [
  'gh pr merge 12 -R someone/other --squash',
  'gh pr merge https://github.com/someone/other/pull/12',
  'gh api -X PUT repos/someone/other/pulls/12/merge',
  'gh pr review 12 -R someone/other --approve',
  'gh pr merge 12 -R memorex386/bradthome-old --squash',
  'gh pr view 12 -R memorex386/bradthome',
  'gh pr merge 12 --squash',
]

describe('C8: a session started in another folder', () => {
  for (const command of DENIED) {
    test(`C8 S2.10 FR-023 denies ${command}`, async () => {
      expect(await answer(bash(command, elsewhere), session(elsewhere))).toEqual({ decision: 'deny', reason: C.userGuard })
    })
  }

  test('C8 S2.10 FR-023 denies the PowerShell form', async () => {
    const input = powershell('gh pr merge 12 -R memorex386/bradthome --squash', elsewhere)
    expect(await answer(input, session(elsewhere))).toEqual({ decision: 'deny', reason: C.userGuard })
  })

  test('C8 S2.10 FR-023 denies a merge or an approval run from inside a bradthome checkout', async () => {
    for (const command of ['gh pr merge 12 --squash', 'gh pr review 12 --approve']) {
      expect(await answer(bash(command, bradthome), session(elsewhere)), command).toEqual({
        decision: 'deny',
        reason: C.userGuard,
      })
    }
  })

  for (const command of OTHER_REPOS) {
    test(`C8 S2.10 FR-023 leaves other repos alone: ${command}`, async () => {
      expect(await answer(bash(command, elsewhere), session(elsewhere))).toEqual({ decision: 'allow', reason: undefined })
    })
  }

  test('C8 S2.10 FR-023 leaves merges in another checkout alone', async () => {
    for (const cwd of [otherRepo, lookAlike]) {
      for (const command of ['gh pr merge 12 --squash', 'gh pr review 12 --approve']) {
        expect(await answer(bash(command, cwd), session(elsewhere)), `${command} in ${path.basename(cwd)}`).toEqual({
          decision: 'allow',
          reason: undefined,
        })
      }
    }
  })

  test("C8 S2.10 FR-023 steps aside in a session whose project is bradthome, where the repo's own guard answers", async () => {
    const input = bash('gh pr merge 12 -R memorex386/bradthome --squash', bradthome)
    expect(await answer(input, session(bradthome))).toEqual({ decision: 'allow', reason: undefined })
  })
})

function importsOf(source: string): string[] {
  const found: string[] = []
  for (const pattern of [
    /^\s*import\s[^'"]*?from\s*['"]([^'"]+)['"]/gm,
    /^\s*import\s*['"]([^'"]+)['"]/gm,
    /^\s*export\s[^'"]*?from\s*['"]([^'"]+)['"]/gm,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of source.matchAll(pattern)) if (match[1] !== undefined) found.push(match[1])
  }
  return found
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(entry.parentPath, entry.name))
}

describe('a copy that runs on its own', () => {
  test('C8 S2.10 FR-023 the hooks folder imports only Node built-ins and its own files', () => {
    const hooks = repoPath('.claude', 'hooks')
    const files = filesUnder(hooks)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
        if (specifier.startsWith('node:')) continue
        expect(specifier.startsWith('.'), `${path.relative(hooks, file)} imports ${specifier}`).toBe(true)
        const target = path.resolve(path.dirname(file), specifier)
        expect(path.relative(hooks, target).startsWith('..'), `${path.relative(hooks, file)} imports ${specifier}`).toBe(
          false,
        )
      }
    }
  })

  test('C8 S2.10 FR-023 a copy of the hooks folder denies a bradthome merge from another folder', () => {
    const copy = sandbox.path('copied-hooks')
    cpSync(repoPath('.claude', 'hooks'), copy, { recursive: true })
    const input = bash('gh pr merge 12 -R memorex386/bradthome --squash', elsewhere)
    const result = runHook(path.join(copy, path.basename(SCRIPTS.userGuard)), input, session(elsewhere), elsewhere)
    expect(processDecision(result)).toEqual({ decision: 'deny', reason: C.userGuard })
  })
})

interface Handler {
  type?: string
  command?: string
  args?: string[]
}

interface Settings {
  hooks?: Record<string, { matcher?: string; hooks?: Handler[] }[]>
  permissions?: { allow?: string[]; deny?: string[]; ask?: string[] }
  [key: string]: unknown
}

function readSettings(file: string): Settings {
  return JSON.parse(readFileSync(file, 'utf8')) as Settings
}

/** The script a hook handler runs, with its placeholders filled in. */
function scriptOf(handler: Handler, box: Sandbox): string {
  const words = [handler.command ?? '', ...(handler.args ?? [])].join(' ')
  const match = /"([^"]+\.(?:ts|mts|mjs|js))"|'([^']+\.(?:ts|mts|mjs|js))'|(\S+\.(?:ts|mts|mjs|js))/.exec(words)
  const raw = match?.[1] ?? match?.[2] ?? match?.[3]
  if (raw === undefined) throw new Error(`no script in the hook: ${words}`)
  return raw
    .replace(/^~(?=[\\/])/, box.home)
    .replaceAll(/\$\{CLAUDE_CONFIG_DIR\}|\$CLAUDE_CONFIG_DIR/g, box.claudeDir)
    .replaceAll(/\$\{HOME\}|\$HOME/g, box.home)
}

function guardHandlers(settings: Settings): { matcher: string | undefined; handler: Handler }[] {
  return (settings.hooks?.PreToolUse ?? []).flatMap((group) =>
    (group.hooks ?? []).map((handler) => ({ matcher: group.matcher, handler })),
  )
}

describe('pnpm guard:install', () => {
  test("C8 S2.10 FR-023 adds the user guard to Brad's user settings and keeps every other setting", () => {
    const box = createSandbox()
    try {
      const settingsFile = path.join(box.claudeDir, 'settings.json')
      const stopHooks = [{ hooks: [{ type: 'command', command: 'echo done' }] }]
      writeFileSync(
        settingsFile,
        JSON.stringify({ theme: 'dark', permissions: { allow: ['Bash(ls *)'] }, hooks: { Stop: stopHooks } }, null, 2),
      )
      for (let round = 1; round <= 2; round += 1) {
        const result = runNode(SCRIPTS.guardInstall, [], { cwd: box.root, env: box.env })
        expect(result.status, describeRun(result)).toBe(0)
      }
      const settings = readSettings(settingsFile)
      expect(settings.theme).toBe('dark')
      expect(settings.permissions?.allow).toContain('Bash(ls *)')
      expect(settings.hooks?.Stop).toEqual(stopHooks)

      const added = guardHandlers(settings)
      expect(added).toHaveLength(1)
      const [{ matcher, handler } = { matcher: undefined, handler: {} }] = added
      expect(handler.type).toBe('command')
      expect(hookMatcherCovers(matcher, 'Bash')).toBe(true)
      expect(hookMatcherCovers(matcher, 'PowerShell')).toBe(true)

      const script = scriptOf(handler, box)
      expect(existsSync(script), script).toBe(true)
      expect(path.relative(box.claudeDir, script).startsWith('..')).toBe(false)
      const denied = runHook(script, bash('gh pr merge 12 -R memorex386/bradthome --squash', box.root), {
        ...box.env,
        CLAUDE_PROJECT_DIR: box.root,
      })
      expect(processDecision(denied)).toEqual({ decision: 'deny', reason: C.userGuard })
      const allowed = runHook(script, bash('gh pr merge 12 -R someone/other --squash', box.root), {
        ...box.env,
        CLAUDE_PROJECT_DIR: box.root,
      })
      expect(processDecision(allowed)).toEqual({ decision: 'allow', reason: undefined })
    } finally {
      box.cleanup()
    }
  })

  test("C8 S2.10 FR-023 adds deny rules that cover bradthome merges and no other repo's", () => {
    const box = createSandbox()
    try {
      const result = runNode(SCRIPTS.guardInstall, [], { cwd: box.root, env: box.env })
      expect(result.status, describeRun(result)).toBe(0)
      const deny = readSettings(path.join(box.claudeDir, 'settings.json')).permissions?.deny ?? []
      expect(
        matchingRules(deny, { tool: 'Bash', command: 'gh pr merge 12 -R memorex386/bradthome --squash' }, 'deny').length,
      ).toBeGreaterThan(0)
      for (const command of [...OTHER_REPOS, 'git clone git@github.com:memorex386/bradthome.git']) {
        expect(matchingRules(deny, { tool: 'Bash', command }, 'deny'), command).toEqual([])
      }
      expect(slash(JSON.stringify(deny))).not.toContain(slash(box.root))
    } finally {
      box.cleanup()
    }
  })
})
