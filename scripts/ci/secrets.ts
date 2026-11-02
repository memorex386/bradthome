import { MERGE_DIFFS, readCommits } from '../lib/commits.ts'
import { topLevel } from '../lib/git.ts'
import { scanGit } from '../lib/gitleaks.ts'
import { ciCrashed, K5_FAILED, K5_NOT_INSTALLED, k5 } from '../lib/messages.ts'
import { print } from '../lib/output.ts'
import { commitRange, readEvent } from './lib/event.ts'
import { termsFromSecret } from './lib/terms.ts'

// The secrets job (FR-009, S2.3): gitleaks over every commit in the pull
// request or push, with values redacted. It names the commit, file, line and
// rule of each finding, never the value, and hides a path that holds a private
// term (D87).

async function main(): Promise<number> {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const terms = termsFromSecret()
  const range = commitRange(readEvent())
  const count = readCommits(range, root).length
  const scan = await scanGit([`--log-opts=${[MERGE_DIFFS, ...range].join(' ')}`], root, process.env)
  if ('problem' in scan) {
    print(scan.problem === 'not-installed' ? K5_NOT_INSTALLED : K5_FAILED, terms, process.stdout)
    return 1
  }
  if (scan.findings.length > 0) {
    const findings = scan.findings.map(
      (finding) => `${finding.commit.slice(0, 7)}  ${finding.file}:${finding.line}  rule ${finding.rule}  value REDACTED`,
    )
    print(k5([...new Set(findings)]), terms, process.stdout)
    return 1
  }
  print([`✓ secrets  ${count} ${count === 1 ? 'commit' : 'commits'} scanned`], terms, process.stdout)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  console.log(ciCrashed('secrets').join('\n'))
  process.exitCode = 1
}
