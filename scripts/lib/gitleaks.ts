import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// The secret scan (FR-003, D54). gitleaks redacts each secret, and the checks
// report only where a finding is and which rule found it.

export interface SecretFinding {
  file: string
  line: number
  rule: string
  /** The commit it's in, or '' for staged changes. */
  commit: string
}

export type ScanResult = { findings: SecretFinding[] } | { problem: 'not-installed' | 'failed' }

interface Report {
  File?: unknown
  StartLine?: unknown
  RuleID?: unknown
  Commit?: unknown
}

function readReport(file: string): SecretFinding[] | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed)) return undefined
    return (parsed as Report[]).map((finding) => ({
      file: String(finding.File ?? '').replaceAll('\\', '/'),
      line: Number(finding.StartLine ?? 0),
      rule: String(finding.RuleID ?? 'unknown'),
      commit: String(finding.Commit ?? ''),
    }))
  } catch {
    return undefined
  }
}

/**
 * Starts gitleaks on a repo, with the given arguments to `gitleaks git`. It
 * runs while the other checks do, and its report goes to a file, never to the
 * terminal.
 */
export function scanGit(args: readonly string[], repo: string, env: NodeJS.ProcessEnv): Promise<ScanResult> {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'bradthome-gitleaks-'))
  const report = path.join(folder, 'report.json')
  let settled = false
  return new Promise((resolve) => {
    const done = (result: ScanResult): void => {
      if (settled) return
      settled = true
      rmSync(folder, { recursive: true, force: true })
      resolve(result)
    }
    const child = spawn(
      'gitleaks',
      [
        'git',
        ...args,
        '--no-banner',
        '--log-level',
        'error',
        '--redact',
        '--exit-code',
        '0',
        '--report-format',
        'json',
        '--report-path',
        report,
        repo,
      ],
      { cwd: repo, env, stdio: 'ignore', windowsHide: true },
    )
    child.on('error', (error: NodeJS.ErrnoException) => {
      done({ problem: error.code === 'ENOENT' ? 'not-installed' : 'failed' })
    })
    child.on('close', (code) => {
      if (code !== 0) {
        done({ problem: 'failed' })
        return
      }
      const findings = readReport(report)
      done(findings === undefined ? { problem: 'failed' } : { findings })
    })
  })
}

/** gitleaks's version, such as 8.30.1, or undefined when it can't run. */
export function gitleaksVersion(env: NodeJS.ProcessEnv): string | undefined {
  const result = spawnSync('gitleaks', ['version'], { env, encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) return undefined
  return /\d+\.\d+\.\d+/.exec(result.stdout)?.[0]
}
