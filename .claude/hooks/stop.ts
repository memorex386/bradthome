import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { topLevel } from './lib/git.ts'
import { answer, type HookInput, inputCwd, parseInput, readStdin } from './lib/io.ts'
import { changedSince, loadSnapshot, snapshotFile } from './lib/turns.ts'

// The Stop hook (FR-022, S5.1–S5.3). When the turn changed code, it runs the
// type check and the unit tests, and sends the agent back with the failures.
// It doesn't stop early when stop_hook_active is set, so Claude Code's own
// limit on sends in a row is what ends a loop.

export type Script = 'typecheck' | 'test:unit'

export interface ScriptResult {
  status: number | null
  output: string
}

export interface StopOptions {
  /** The paths, relative to the checkout, that changed in the turn. */
  changedPaths: readonly string[]
  /** Runs a package script. For test:unit, output is Vitest's JSON report. */
  run: (script: Script) => ScriptResult | Promise<ScriptResult>
  /** The checkout's root, for showing paths. The input's folder when left out. */
  root?: string
}

export interface StopAnswer {
  decision: 'block'
  reason: string
}

/** Code is the checks, their tests, the hooks and the root config files. Docs, specs and skills aren't. */
const CODE = [
  /^scripts\//,
  /^tests\//,
  /^\.claude\/hooks\//,
  /^\.husky\//,
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig(?:\.[\w-]+)?\.json|[\w.-]+\.config\.[cm]?[jt]s)$/,
]

export function isCode(file: string): boolean {
  const p = file.replaceAll('\\', '/')
  return CODE.some((pattern) => pattern.test(p))
}

const MAX_LINES = 20

function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line !== '') ?? ''
  )
}

function typeLines(result: ScriptResult): string[] {
  if (result.status === 0) return []
  const lines: string[] = []
  for (const line of result.output.split(/\r?\n/)) {
    const error =
      /^(.+?)\((\d+),\d+\): error TS\d+: (.*)$/.exec(line.trim()) ?? /^(.+?):(\d+):\d+ - error TS\d+: (.*)$/.exec(line.trim())
    if (error !== null) lines.push(`  ✖ types  ${error[1]?.replaceAll('\\', '/')}:${error[2]}  ${error[3]}`)
  }
  if (lines.length === 0) return [`  ✖ types  the type check failed: ${firstLine(result.output) || `exit ${result.status}`}`]
  return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `  ✖ types  and ${lines.length - MAX_LINES} more`] : lines
}

interface Report {
  testResults?: { name?: string; status?: string; message?: string; assertionResults?: { status?: string }[] }[]
}

function shownPath(file: string, root: string): string {
  const relative = path.relative(root, file)
  return (relative.startsWith('..') || path.isAbsolute(relative) ? file : relative).replaceAll('\\', '/')
}

function testLines(result: ScriptResult, root: string): string[] {
  let report: Report
  try {
    report = JSON.parse(result.output.slice(result.output.indexOf('{'))) as Report
  } catch {
    return result.status === 0 ? [] : [`  ✖ tests  the unit tests didn't run: ${firstLine(result.output) || `exit ${result.status}`}`]
  }
  const lines: string[] = []
  for (const suite of report.testResults ?? []) {
    const file = shownPath(suite.name ?? 'a test file', root)
    const failed = (suite.assertionResults ?? []).filter((test) => test.status === 'failed').length
    if (failed > 0) lines.push(`  ✖ tests  ${failed} failed in ${file}`)
    else if (suite.status === 'failed') lines.push(`  ✖ tests  ${file} failed to run: ${firstLine(suite.message ?? '')}`)
  }
  if (lines.length === 0 && result.status !== 0) lines.push(`  ✖ tests  the unit tests failed: exit ${result.status}`)
  return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `  ✖ tests  and ${lines.length - MAX_LINES} more files`] : lines
}

export async function decide(input: HookInput, options: StopOptions): Promise<StopAnswer | undefined> {
  if (!options.changedPaths.some(isCode)) return undefined
  const types = await options.run('typecheck')
  const tests = await options.run('test:unit')
  const root = options.root ?? inputCwd(input)
  const failures = [...typeLines(types), ...testLines(tests, root)]
  if (failures.length === 0) return undefined
  return {
    decision: 'block',
    reason: ['Stop hook: the fast checks failed, so keep working.', ...failures, '  Fix these, then finish.'].join('\n'),
  }
}

/** Runs a package script with pnpm in the checkout. On Windows, pnpm is a .cmd shim, which needs a shell. */
function runScript(root: string, script: Script): ScriptResult {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'bradthome-stop-'))
  const report = path.join(folder, 'vitest.json')
  const args = ['--silent', 'run', script, ...(script === 'test:unit' ? ['--reporter=json', `--outputFile=${report}`] : [])]
  const windows = process.platform === 'win32'
  try {
    const result = spawnSync(windows ? args.reduce((line, arg) => `${line} "${arg}"`, 'pnpm') : 'pnpm', windows ? [] : args, {
      cwd: root,
      encoding: 'utf8',
      shell: windows,
      timeout: 10 * 60 * 1000,
      maxBuffer: 256 * 1024 * 1024,
      windowsHide: true,
    })
    let output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (script === 'test:unit') {
      try {
        output = readFileSync(report, 'utf8')
      } catch {
        // No report file, so the report is looked for in what was printed.
      }
    }
    return { status: result.error ? null : result.status, output }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

function isMain(): boolean {
  const argv = path.resolve(process.argv[1] ?? '')
  const self = fileURLToPath(import.meta.url)
  return process.platform === 'win32' ? argv.toLowerCase() === self.toLowerCase() : argv === self
}

if (isMain()) {
  const input = parseInput(await readStdin())
  const root = input === undefined ? undefined : topLevel(inputCwd(input))
  if (input !== undefined && root !== undefined) {
    const file = snapshotFile(root, typeof input.session_id === 'string' ? input.session_id : '')
    const before = file === undefined ? undefined : loadSnapshot(file)
    const changedPaths = changedSince(root, before)
    answer(await decide(input, { changedPaths, run: (script) => runScript(root, script), root }))
  }
}
