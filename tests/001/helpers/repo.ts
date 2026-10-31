import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { SCRIPTS, slash } from './paths.ts'
import { describeRun, run, type RunResult } from './run.ts'
import { type Sandbox, setEnv } from './sandbox.ts'

// Scratch repos for the git-hook tests. Each has a local bare repo as its
// origin, so pushes are real pushes, and runs the repo's own hook scripts.

export type HookName = 'pre-commit' | 'commit-msg' | 'pre-push'

export const ALL_HOOKS: readonly HookName[] = ['pre-commit', 'commit-msg', 'pre-push']

const HOOK_SCRIPTS: Record<HookName, string> = {
  'pre-commit': SCRIPTS.preCommit,
  'commit-msg': SCRIPTS.commitMsg,
  'pre-push': SCRIPTS.prePush,
}

export interface GitOptions {
  /** Extra variables for this one command. */
  env?: NodeJS.ProcessEnv
  input?: string
}

export interface ScratchRepo {
  /** The working tree. */
  dir: string
  /** The bare repo that's this repo's origin. */
  origin: string
  sandbox: Sandbox
  git(args: readonly string[], options?: GitOptions): RunResult
  /** Runs git and fails the test when git fails. Returns stdout, trimmed. */
  gitOk(args: readonly string[], options?: GitOptions): string
  write(file: string, content: string | Uint8Array): void
  read(file: string): string
  /** Points core.hooksPath at stubs that run the repo's hook scripts. */
  installHooks(hooks?: readonly HookName[]): void
  /** The commit a revision names, abbreviated to 7 characters. */
  short(rev?: string): string
}

export interface RepoOptions {
  /** Files committed on main and pushed before any hook is on. */
  seed?: Record<string, string>
  /** The branch to switch to after the seed, or false to stay on main. */
  branch?: string | false
  /** The hooks to turn on, or false for none. */
  hooks?: readonly HookName[] | false
}

export function writeFile(dir: string, file: string, content: string | Uint8Array): void {
  const target = path.join(dir, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
}

export function createRepo(sandbox: Sandbox, options: RepoOptions = {}): ScratchRepo {
  const base = mkdtempSync(path.join(sandbox.root, 'repo-'))
  const origin = path.join(base, 'origin.git')
  const dir = path.join(base, 'work')
  const hooksDir = path.join(base, 'hooks')

  const git = (args: readonly string[], gitOptions: GitOptions = {}): RunResult => {
    const env = { ...sandbox.env }
    for (const [name, value] of Object.entries(gitOptions.env ?? {})) setEnv(env, name, value)
    return run('git', args, { cwd: dir, env, input: gitOptions.input })
  }
  const gitOk = (args: readonly string[], gitOptions: GitOptions = {}): string => {
    const result = git(args, gitOptions)
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed\n${describeRun(result)}`)
    return result.stdout.trim()
  }

  const setup = (args: readonly string[]): void => {
    const result = run('git', args, { cwd: base, env: sandbox.env })
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed\n${describeRun(result)}`)
  }
  setup(['init', '--quiet', '--bare', '--initial-branch=main', origin])
  setup(['init', '--quiet', '--initial-branch=main', dir])

  const repo: ScratchRepo = {
    dir,
    origin,
    sandbox,
    git,
    gitOk,
    write: (file, content) => writeFile(dir, file, content),
    read: (file) => readFileSync(path.join(dir, file), 'utf8'),
    installHooks(hooks = ALL_HOOKS) {
      mkdirSync(hooksDir, { recursive: true })
      for (const hook of hooks) {
        const stub = path.join(hooksDir, hook)
        writeFileSync(stub, `#!/bin/sh\nexec "${slash(process.execPath)}" "${slash(HOOK_SCRIPTS[hook])}" "$@"\n`)
        chmodSync(stub, 0o755)
      }
      gitOk(['config', 'core.hooksPath', slash(hooksDir)])
    },
    short: (rev = 'HEAD') => gitOk(['rev-parse', '--short=7', rev]),
  }

  gitOk(['remote', 'add', 'origin', slash(origin)])
  repo.write('README.md', '# A scratch repo\n')
  for (const [file, content] of Object.entries(options.seed ?? {})) repo.write(file, content)
  gitOk(['add', '--all'])
  gitOk(['commit', '--quiet', '-m', 'chore(repo): start the scratch repo'])
  gitOk(['push', '--quiet', '--set-upstream', 'origin', 'main'])

  const branch = options.branch ?? '001-demo'
  if (branch !== false) gitOk(['switch', '--quiet', '--create', branch])
  const hooks = options.hooks ?? ALL_HOOKS
  if (hooks !== false) repo.installHooks(hooks)
  return repo
}

/** Stages everything and commits with the hooks on. */
export function commitAll(repo: ScratchRepo, message: string, options: GitOptions = {}): RunResult {
  repo.gitOk(['add', '--all'])
  return repo.git(['commit', '-m', message], options)
}

/** Commits with the hooks skipped, the way someone using --no-verify would. */
export function commitSkippingHooks(repo: ScratchRepo, message: string, extra: readonly string[] = []): string {
  repo.gitOk(['add', '--all'])
  repo.gitOk(['commit', '--quiet', '--no-verify', '-m', message, ...extra])
  return repo.short()
}

/** Text with a line at a given 1-based line number and filler around it. */
export function textWithLineAt(lineNumber: number, line: string, total = lineNumber + 2): string {
  const lines: string[] = []
  for (let n = 1; n <= total; n += 1) lines.push(n === lineNumber ? line : `Line ${n} of some ordinary notes.`)
  return `${lines.join('\n')}\n`
}
