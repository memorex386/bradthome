import { MERGE_DIFFS, readCommits } from '../lib/commits.ts'
import { topLevel } from '../lib/git.ts'
import { scanGit } from '../lib/gitleaks.ts'
import { ciCrashed, K5_FAILED, K5_NOT_INSTALLED, k5 } from '../lib/messages.ts'
import { commitRange, readEvent } from './lib/event.ts'

// The secrets job (FR-009, S2.3): gitleaks over every commit in the pull
// request or push, with values redacted. It names the commit, file, line and
// rule of each finding, never the value.

async function main(): Promise<number> {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const range = commitRange(readEvent())
  const count = readCommits(range, root).length
  const scan = await scanGit([`--log-opts=${[MERGE_DIFFS, ...range].join(' ')}`], root, process.env)
  if ('problem' in scan) {
    console.log((scan.problem === 'not-installed' ? K5_NOT_INSTALLED : K5_FAILED).join('\n'))
    return 1
  }
  if (scan.findings.length > 0) {
    const findings = scan.findings.map(
      (finding) => `${finding.commit.slice(0, 7)}  ${finding.file}:${finding.line}  rule ${finding.rule}  value REDACTED`,
    )
    console.log(k5([...new Set(findings)]).join('\n'))
    return 1
  }
  console.log(`✓ secrets  ${count} ${count === 1 ? 'commit' : 'commits'} scanned`)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  console.log(ciCrashed('secrets').join('\n'))
  process.exitCode = 1
}
