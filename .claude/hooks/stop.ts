import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runGit, topLevel } from './lib/git.ts'
import { answer, type HookInput, inputCwd, parseInput, readStdin } from './lib/io.ts'
import { changedSince, loadSnapshot, snapshotFile } from './lib/turns.ts'

// The Stop hook (FR-022, S5.1–S5.3). When the turn changed code, it runs the
// type check and the unit tests, and sends the agent back with the failures.
// It doesn't stop early when stop_hook_active is set, so Claude Code's own
// limit on sends in a row is what ends a loop. A spec's tests fail on purpose
// in its tests stage, so failures only there let the turn end (S5.4, D96).

export type Script = 'typecheck' | 'test:unit'

export interface ScriptResult {
  status: number | null
  output: string
}

export interface StopOptions {
  /** The paths, relative to the checkout, that changed in the turn. */
  changedPaths: readonly string[]
  /** Runs a package script. For test:unit, output is Vitest's JSON report, and exclude leaves out files by glob. */
  run: (script: Script, exclude?: readonly string[]) => ScriptResult | Promise<ScriptResult>
  /** The checkout's root, for showing paths. The input's folder when left out. */
  root?: string
  /** The specs whose tests wait for their build, as three-digit numbers. Asked only when tests fail. */
  waiting?: () => readonly string[]
}

export type StopAnswer = { decision: 'block'; reason: string } | { systemMessage: string }

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

interface TestFailure {
  line: string
  /** The spec the failing file belongs to, from tests/NNN/. Undefined when it's no one spec's file. */
  spec?: string
}

function testFailures(result: ScriptResult, root: string): TestFailure[] {
  let report: Report
  try {
    report = JSON.parse(result.output.slice(result.output.indexOf('{'))) as Report
  } catch {
    return result.status === 0 ? [] : [{ line: `  ✖ tests  the unit tests didn't run: ${firstLine(result.output) || `exit ${result.status}`}` }]
  }
  const failures: TestFailure[] = []
  for (const suite of report.testResults ?? []) {
    const file = shownPath(suite.name ?? 'a test file', root)
    const spec = /^tests\/(\d{3})\//.exec(file)?.[1]
    const failed = (suite.assertionResults ?? []).filter((test) => test.status === 'failed').length
    if (failed > 0) failures.push({ line: `  ✖ tests  ${failed} failed in ${file}`, spec })
    else if (suite.status === 'failed') failures.push({ line: `  ✖ tests  ${file} failed to run: ${firstLine(suite.message ?? '')}`, spec })
  }
  if (failures.length === 0 && result.status !== 0) failures.push({ line: `  ✖ tests  the unit tests failed: exit ${result.status}` })
  return failures
}

function testLines(failures: readonly TestFailure[]): string[] {
  const lines = failures.map((failure) => failure.line)
  return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `  ✖ tests  and ${lines.length - MAX_LINES} more files`] : lines
}

/** The specs that hold every failure, when all of them wait for their build. */
function onlyWaiting(failures: readonly TestFailure[], waiting: (() => readonly string[]) | undefined): string[] | undefined {
  if (failures.length === 0 || waiting === undefined) return undefined
  const specs = failures.map((failure) => failure.spec)
  if (specs.some((spec) => spec === undefined)) return undefined
  const allowed = new Set(waiting())
  const named = [...new Set(specs as string[])].sort()
  return named.every((spec) => allowed.has(spec)) ? named : undefined
}

export async function decide(input: HookInput, options: StopOptions): Promise<StopAnswer | undefined> {
  if (!options.changedPaths.some(isCode)) return undefined
  const types = await options.run('typecheck')
  const tests = await options.run('test:unit')
  const root = options.root ?? inputCwd(input)
  const typeFailures = typeLines(types)
  const testsFailed = testFailures(tests, root)
  const specs = typeFailures.length === 0 ? onlyWaiting(testsFailed, options.waiting) : undefined
  if (specs !== undefined) {
    // The report can miss a failure, such as an unhandled error, so the rest
    // of the unit tests run again without the waiting specs and must pass.
    const rest = await options.run(
      'test:unit',
      specs.map((spec) => `tests/${spec}/**`),
    )
    if (rest.status === 0) {
      const named = specs.length === 1 ? `spec ${specs[0]}'s tests, which wait` : `specs ${specs.join(' and ')}'s tests, which wait`
      return { systemMessage: `Stop hook: the only failures are in ${named} for the build, so the turn ends.` }
    }
    const seen = new Set(testsFailed.map((failure) => failure.line))
    const more = testFailures(rest, root).filter((failure) => !seen.has(failure.line))
    testsFailed.push(
      ...(more.length > 0 ? more : [{ line: `  ✖ tests  the other unit tests failed: exit ${rest.status}` }]),
    )
  }
  const failures = [...typeFailures, ...testLines(testsFailed)]
  if (failures.length === 0) return undefined
  return {
    decision: 'block',
    reason: ['Stop hook: the fast checks failed, so keep working.', ...failures, '  Fix these, then finish.'].join('\n'),
  }
}

/** A git command failed, so no spec can be shown to wait. */
class GitFailed extends Error {}

/** The lines git prints. Throws GitFailed when git fails. */
function gitLines(args: readonly string[], root: string): string[] {
  const result = runGit(args, root)
  if (result.status !== 0) throw new GitFailed(`git ${args[0] ?? ''} failed`)
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function folders(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

/**
 * The specs whose tests wait for their build (S5.4, D96). Each has tests in
 * tests/NNN/ and a folder specs/NNN-name/, main has no tests.lock for it, and
 * either its tests.lock isn't committed yet or, since the commit that first
 * added it, the branch changed no code outside tests/NNN/. Commits merged in
 * from main don't count. With no main to compare with, or when git fails,
 * none wait.
 */
export function waitingSpecs(root: string): string[] {
  try {
    return specsWaiting(root)
  } catch (error) {
    if (error instanceof GitFailed) return []
    throw error
  }
}

function specsWaiting(root: string): string[] {
  const main = ['origin/main', 'main'].find((ref) => runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], root).status === 0)
  if (main === undefined) return []
  const locked = new Set(
    gitLines(['ls-tree', '-r', '--name-only', main, '--', 'specs'], root).flatMap(
      (file) => /^specs\/(\d{3})-[^/]+\/tests\.lock$/.exec(file)?.[1] ?? [],
    ),
  )
  const specFolders = folders(path.join(root, 'specs'))
  const uncommitted = [...gitLines(['diff', '--name-only', 'HEAD'], root), ...gitLines(['ls-files', '--others', '--exclude-standard'], root)]
  const waiting: string[] = []
  for (const spec of folders(path.join(root, 'tests'))
    .filter((name) => /^\d{3}$/.test(name))
    .sort()) {
    const folder = specFolders.find((name) => name.startsWith(`${spec}-`))
    if (folder === undefined || locked.has(spec)) continue
    const lock = `specs/${folder}/tests.lock`
    const added = gitLines(['log', '--diff-filter=A', '--format=%H', '--reverse', 'HEAD', '--', lock], root)[0]
    if (added !== undefined) {
      const since = gitLines(['log', '--no-merges', '--format=', '--name-only', `${added}..HEAD`, `^${main}`], root)
      if ([...since, ...uncommitted].some((file) => isCode(file) && !file.startsWith(`tests/${spec}/`))) continue
    }
    waiting.push(spec)
  }
  return waiting
}

/** Runs a package script with pnpm in the checkout. On Windows, pnpm is a .cmd shim, which needs a shell. */
function runScript(root: string, script: Script, exclude: readonly string[] = []): ScriptResult {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'bradthome-stop-'))
  const report = path.join(folder, 'vitest.json')
  const vitest = ['--reporter=json', `--outputFile=${report}`, ...exclude.map((glob) => `--exclude=${glob}`)]
  const args = ['--silent', 'run', script, ...(script === 'test:unit' ? vitest : [])]
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
    answer(await decide(input, { changedPaths, run: (script, exclude) => runScript(root, script, exclude), root, waiting: () => waitingSpecs(root) }))
  }
}
