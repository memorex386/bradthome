import { stagedCopyProblems, syncCopies } from './lib/copies.ts'
import { topLevel } from './lib/git.ts'

// pnpm sync [--check]: copies each skill in .agents/skills to .claude/skills,
// and the spec and plan templates to Spec Kit's override folder, removing
// stale copies and leaving Spec Kit's own speckit-* skills alone (FR-014).
// --check compares what's staged, the way the pre-commit hook does.

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  if (process.argv.includes('--check')) {
    const problems = stagedCopyProblems({ cwd: root })
    if (problems.length === 0) {
      console.log('✓ sync  skill copies and template overrides match')
      return 0
    }
    console.error(
      [
        '✖ sync  copies out of date',
        ...problems.map((problem) =>
          problem.source === undefined
            ? `  ${problem.copy} has no source in .agents/skills`
            : `  ${problem.copy} doesn't match ${problem.source}`,
        ),
        '  Fix: pnpm sync, then stage the copies.',
      ].join('\n'),
    )
    return 1
  }
  const { written, removed } = syncCopies(root)
  const changes = [...written.map((file) => `  wrote    ${file}`), ...removed.map((file) => `  removed  ${file}`)]
  console.log([`✓ sync  ${written.length} written, ${removed.length} removed`, ...changes].join('\n'))
  return 0
}

process.exitCode = main()
