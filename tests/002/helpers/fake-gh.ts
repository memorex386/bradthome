import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { slash } from '../../001/helpers/paths.ts'
import { getEnv, type Sandbox, setEnv } from '../../001/helpers/sandbox.ts'
import { fixturePath } from './paths.ts'

// A fake gh on PATH, for every check that would read GitHub. It replays
// recorded responses and logs each call, and the tests never reach the network
// or real GitHub. On Windows it's a small launcher compiled from
// fixtures/fake-gh/launcher.cs with the .NET Framework's csc, since Node finds
// only .exe files on PATH there. A gh.cmd beside it serves callers that use a
// shell.

export interface FakeResponse {
  status: number
  body: unknown
}

export interface Scenario {
  /** Responses by endpoint, such as repos/memorex386/bradthome. */
  routes?: Record<string, FakeResponse>
  /** The response for any other endpoint. A 404 when left out. */
  fallback?: FakeResponse
  /** Every call fails the way gh does with no network. */
  offline?: boolean
}

export interface FakeGh {
  /** The sandbox's environment with the fake gh first on PATH. */
  env: NodeJS.ProcessEnv
  /** The arguments of every call, in order. */
  calls(): string[][]
}

const SCRIPT = fixturePath('fake-gh', 'fake-gh.mjs')
const LAUNCHER = fixturePath('fake-gh', 'launcher.cs')

function csc(): string {
  const windir = process.env.WINDIR ?? process.env.windir ?? 'C:\\Windows'
  for (const framework of ['Framework64', 'Framework']) {
    const candidate = path.join(windir, 'Microsoft.NET', framework, 'v4.0.30319', 'csc.exe')
    if (existsSync(candidate)) return candidate
  }
  throw new Error("The .NET Framework's csc.exe isn't on this Windows machine, so the fake gh can't be built")
}

/** The launcher, compiled once per source and kept in the temporary folder. */
function launcherExe(): string {
  const source = readFileSync(LAUNCHER)
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16)
  const exe = path.join(os.tmpdir(), `bradthome-002-fake-gh-${hash}.exe`)
  if (existsSync(exe)) return exe
  const building = `${exe}.${process.pid}.tmp`
  const result = spawnSync(csc(), ['/nologo', '/optimize', '/target:exe', `/out:${building}`, LAUNCHER], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) throw new Error(`csc couldn't build the fake gh\n${result.stdout}${result.stderr}`)
  try {
    renameSync(building, exe)
  } catch {
    // Another test built it first.
  }
  return exe
}

/** Puts a fake gh first on the sandbox's PATH, replaying the scenario. */
export function installFakeGh(sandbox: Pick<Sandbox, 'env' | 'path'>, scenario: Scenario, name = 'fake-gh'): FakeGh {
  const bin = sandbox.path(name)
  mkdirSync(bin, { recursive: true })
  writeFileSync(path.join(bin, 'scenario.json'), `${JSON.stringify(scenario, null, 2)}\n`)
  writeFileSync(path.join(bin, 'calls.jsonl'), '')
  const node = slash(process.execPath)
  if (process.platform === 'win32') {
    writeFileSync(path.join(bin, 'gh.json'), `${JSON.stringify({ node, script: slash(SCRIPT) })}\n`)
    copyFileSync(launcherExe(), path.join(bin, 'gh.exe'))
    writeFileSync(path.join(bin, 'gh.cmd'), `@"${node}" "${slash(SCRIPT)}" "${slash(bin)}" %*\r\n`)
  } else {
    const launcher = path.join(bin, 'gh')
    writeFileSync(launcher, `#!/bin/sh\nexec "${node}" "${SCRIPT}" "${bin}" "$@"\n`)
    chmodSync(launcher, 0o755)
  }
  const env = { ...sandbox.env }
  setEnv(env, 'PATH', [bin, getEnv(sandbox.env, 'PATH') ?? ''].join(path.delimiter))
  // gh's own token variables would point at a real account; the fake ignores them anyway.
  setEnv(env, 'GH_TOKEN', undefined)
  setEnv(env, 'GITHUB_TOKEN', undefined)
  return {
    env,
    calls: () =>
      readFileSync(path.join(bin, 'calls.jsonl'), 'utf8')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => (JSON.parse(line) as { args: string[] }).args),
  }
}

/** The endpoints a fake gh's calls read, with {owner}/{repo} filled in. */
export function endpointsRead(calls: readonly string[][]): string[] {
  return calls
    .filter((args) => args[0] === 'api')
    .map((args) => args.slice(1).find((arg) => !arg.startsWith('-') && /^\/?(?:repos|https:)/.test(arg)) ?? '')
    .map((endpoint) =>
      endpoint
        .replace(/^https:\/\/api\.github\.com\//, '')
        .replace(/^\//, '')
        .replace(/\?.*$/, '')
        .replaceAll('{owner}', 'memorex386')
        .replaceAll('{repo}', 'bradthome'),
    )
}

export function ok(body: unknown): FakeResponse {
  return { status: 200, body }
}

/** What GitHub answers for rulesets on a private repo on the free plan, on 2026-11-01. */
export const RULESETS_REFUSED: FakeResponse = {
  status: 403,
  body: {
    message: 'Upgrade to GitHub Pro or make this repository public to enable this feature.',
    documentation_url: 'https://docs.github.com/rest/repos/rules#get-all-repository-rulesets',
    status: '403',
  },
}
