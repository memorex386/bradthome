import { spawn, spawnSync } from 'node:child_process'

// Runs git for the checks. Each script acts on the repo in its working folder,
// so every call names the folder and the environment it runs with.

export interface GitOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
  input?: string
}

export interface GitResult {
  status: number | null
  stdout: string
  stderr: string
}

/** The empty tree, for comparing against nothing. */
export const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

/** A commit ID of zeros, which pre-push uses for a ref that doesn't exist. */
export const ZERO = /^0+$/

export class GitError extends Error {
  constructor(args: readonly string[], result: GitResult) {
    super(`git ${args.join(' ')} failed with exit ${result.status}`)
  }
}

/** Runs git and returns what it printed, whatever its exit code. */
export function runGit(args: readonly string[], options: GitOptions): GitResult {
  const result = spawnSync('git', args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.error) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

/** Runs git and returns its output, or throws when git fails. */
export function git(args: readonly string[], options: GitOptions): string {
  const result = runGit(args, options)
  if (result.status !== 0) throw new GitError(args, result)
  return result.stdout
}

/**
 * Runs git without waiting, so independent calls run at once. Starting a
 * process is slow on Windows, and the hooks have a time budget (SC-003).
 */
export function runGitAsync(args: readonly string[], options: GitOptions): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: options.cwd, env: options.env ?? process.env, windowsHide: true })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (status) => {
      resolve({ status, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') })
    })
    child.stdin.end(options.input ?? '')
  })
}

export async function gitAsync(args: readonly string[], options: GitOptions): Promise<string> {
  const result = await runGitAsync(args, options)
  if (result.status !== 0) throw new GitError(args, result)
  return result.stdout
}

/** NUL-separated output, as git prints it with -z, split into its entries. */
export function splitZ(output: string): string[] {
  return output.split('\0').filter((entry) => entry !== '')
}

/** The root of the checkout that holds a folder, or undefined outside one. */
export function topLevel(cwd: string, env?: NodeJS.ProcessEnv): string | undefined {
  try {
    const result = runGit(['rev-parse', '--show-toplevel'], { cwd, env })
    return result.status === 0 ? result.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

/** The commit where the current branch left main: origin/main's, or main's when there's no origin/main. */
export function mergeBaseWithMain(options: GitOptions): string | undefined {
  for (const main of ['origin/main', 'main']) {
    const result = runGit(['merge-base', 'HEAD', main], options)
    if (result.status === 0) return result.stdout.trim()
  }
  return undefined
}

/** Reads blobs by name, such as HEAD:path or :path, in one git call. Missing ones are left out. */
export function readBlobs(names: readonly string[], options: GitOptions): Map<string, string> {
  const blobs = new Map<string, string>()
  if (names.length === 0) return blobs
  const result = spawnSync('git', ['cat-file', '--batch'], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: `${names.join('\n')}\n`,
    maxBuffer: 1024 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.error) throw result.error
  const out = result.stdout
  let at = 0
  for (const name of names) {
    const end = out.indexOf(0x0a, at)
    if (end < 0) break
    const header = /^[0-9a-f]+ (\w+) (\d+)$/.exec(out.subarray(at, end).toString('utf8'))
    at = end + 1
    // A missing object has no content after its header.
    if (header === null) continue
    const size = Number(header[2])
    if (header[1] === 'blob') blobs.set(name, out.subarray(at, at + size).toString('utf8'))
    at += size + 1
  }
  return blobs
}
