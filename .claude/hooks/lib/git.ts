import { spawnSync } from 'node:child_process'

// git for the Claude Code hooks. The hooks find the checkout from the tool
// call's folder or the file it touches, never from CLAUDE_PROJECT_DIR, since
// desktop worktree sessions run hooks from the main checkout.

export function runGit(args: readonly string[], cwd: string): { status: number | null; stdout: string } {
  try {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 })
    return { status: result.error ? null : result.status, stdout: result.stdout ?? '' }
  } catch {
    return { status: null, stdout: '' }
  }
}

/** The root of the checkout that holds a folder, or undefined outside one. */
export function topLevel(cwd: string): string | undefined {
  const result = runGit(['rev-parse', '--show-toplevel'], cwd)
  return result.status === 0 && result.stdout.trim() !== '' ? result.stdout.trim() : undefined
}

/** The GitHub repos a checkout's remotes point at, as owner/name in lower case, read as configured. */
export function remoteRepos(cwd: string): string[] {
  const result = runGit(['config', '--get-regexp', '^remote\\..*\\.(push)?url$'], cwd)
  if (result.status !== 0) return []
  const repos = new Set<string>()
  for (const line of result.stdout.split('\n')) {
    const url = line.slice(line.indexOf(' ') + 1).trim()
    const match = /[/:]([^/:\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(url)
    if (match !== null) repos.add(`${match[1]}/${match[2]}`.toLowerCase())
  }
  return [...repos]
}

export const BRADTHOME = 'memorex386/bradthome'

/** Whether a folder is in a checkout of bradthome, judged by its remotes. */
export function isBradthome(cwd: string | undefined): boolean {
  return cwd !== undefined && cwd !== '' && remoteRepos(cwd).includes(BRADTHOME)
}
