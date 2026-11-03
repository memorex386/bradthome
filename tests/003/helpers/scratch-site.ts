import { copyFileSync, existsSync, mkdirSync, symlinkSync } from 'node:fs'
import path from 'node:path'
import { run, runPnpm, type RunResult } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox } from '../../001/helpers/sandbox.ts'
import { writeFile } from '../../001/helpers/repo.ts'
import { REPO_ROOT } from './paths.ts'

// A scratch copy of the repo's site and scripts, for planting a failure where
// the site's checks will find it, without touching the checkout. It copies the
// repo's files, apart from the docs, specs, tests and workflows, and links
// both node_modules folders back to the checkout's, so the tools resolve as
// they do there. The checks run as the package commands, from the copy's root.

export interface ScratchSite {
  sandbox: Sandbox
  dir: string
  write(file: string, content: string): void
  /** Runs `pnpm <args>` in the copy, as CI's jobs run the commands. */
  pnpm(args: readonly string[]): RunResult
}

const LEFT_OUT = /^(?:docs|specs|tests|\.github|\.claude|\.agents|\.specify|\.husky)\//

function listed(): string[] {
  const result = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: REPO_ROOT, env: process.env })
  if (result.status !== 0) throw new Error(`git ls-files failed\n${result.stderr}`)
  return result.stdout.split('\0').filter((file) => file !== '' && !LEFT_OUT.test(file))
}

function link(target: string, at: string): void {
  if (!existsSync(target)) throw new Error(`${target} is missing: run pnpm install first`)
  mkdirSync(path.dirname(at), { recursive: true })
  symlinkSync(target, at, process.platform === 'win32' ? 'junction' : 'dir')
}

export function createScratchSite(): ScratchSite {
  const sandbox = createSandbox({ terms: false })
  const dir = sandbox.path('site')
  for (const file of listed()) {
    const from = path.join(REPO_ROOT, file)
    if (!existsSync(from)) continue
    const to = path.join(dir, file)
    mkdirSync(path.dirname(to), { recursive: true })
    copyFileSync(from, to)
  }
  link(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'))
  link(path.join(REPO_ROOT, 'apps', 'site', 'node_modules'), path.join(dir, 'apps', 'site', 'node_modules'))
  return {
    sandbox,
    dir,
    write: (file, content) => writeFile(dir, file, content),
    pnpm: (args) => runPnpm(args, { cwd: dir, env: sandbox.env, timeout: 300_000 }),
  }
}
