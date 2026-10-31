import { spawnSync } from 'node:child_process'
import { closeSync, openSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface RunResult {
  status: number | null
  stdout: string
  stderr: string
}

export interface RunOptions {
  cwd: string
  env: NodeJS.ProcessEnv
  input?: string
  timeout?: number
}

export function run(command: string, args: readonly string[], options: RunOptions): RunResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout ?? 120_000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

/**
 * Runs a command with stdout and stderr going to one file, so the lines keep
 * the order a terminal shows them in. The text comes back as stdout.
 */
export function runMerged(command: string, args: readonly string[], options: RunOptions & { scratch: string }): RunResult {
  const file = path.join(options.scratch, `output-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
  const fd = openSync(file, 'w')
  let result: ReturnType<typeof spawnSync>
  try {
    result = spawnSync(command, args, {
      cwd: options.cwd,
      env: options.env,
      input: options.input,
      stdio: ['pipe', fd, fd],
      timeout: options.timeout ?? 120_000,
      windowsHide: true,
    })
  } finally {
    closeSync(fd)
  }
  if (result.error) throw result.error
  return { status: result.status, stdout: readFileSync(file, 'utf8'), stderr: '' }
}

/** Runs a TypeScript or JavaScript file with the Node that runs the tests. */
export function runNode(script: string, args: readonly string[], options: RunOptions): RunResult {
  return run(process.execPath, [script, ...args], options)
}

/** Runs pnpm from PATH. On Windows, pnpm is a .cmd shim, which needs a shell. */
export function runPnpm(args: readonly string[], options: RunOptions): RunResult {
  if (process.platform !== 'win32') return run('pnpm', args, options)
  const quoted = ['pnpm', ...args].map((arg) => (/^[\w:./=@-]+$/.test(arg) ? arg : `"${arg}"`))
  const result = spawnSync(quoted.join(' '), {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout ?? 300_000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
  })
  if (result.error) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** Some output without terminal colour codes. */
export function withoutColour(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
}

/** The lines of some output, without line endings or colour codes. */
export function linesOf(text: string): string[] {
  return withoutColour(text).split(/\r?\n/)
}

/** The lines of some output that hold anything but whitespace. */
export function filledLines(text: string): string[] {
  return linesOf(text).filter((line) => line.trim() !== '')
}

/** Both output streams, for messages in failed expectations. */
export function describeRun(result: RunResult): string {
  return `exit ${result.status}\n--- stdout\n${result.stdout}\n--- stderr\n${result.stderr}`
}
