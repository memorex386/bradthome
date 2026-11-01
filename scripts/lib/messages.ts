import type { CopyProblem } from './copies.ts'
import { type LockedChange, specNumber } from './locks.ts'
import type { TermsProblem, TermsSource } from './terms.ts'

// The words the checks print: the mocks' exact words, in
// specs/001-hooks-and-agent-rules/mocks/README.md (FR-016). Cases the mocks
// don't show follow their style.

export type Hook = 'pre-commit' | 'commit-msg' | 'pre-push'

const MAIN_BY_PULL_REQUEST = '  Main changes only through a pull request that Brad merges.'

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

function blockedWhat(hook: Hook | 'terms'): string {
  if (hook === 'pre-push') return 'Pushes are'
  if (hook === 'terms') return 'The scan is'
  return 'Commits are'
}

/** A list of things joined the way a sentence reads: a, b and c. */
export function listed(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

export function passPreCommit(time: string): string {
  return `✓ pre-commit  main, secrets, private terms, addresses, locked tests, copies · ${time}`
}

export function passCommitMsg(time: string): string {
  return `✓ commit-msg  format, private terms, trailers · ${time}`
}

export function passPrePush(count: number, time: string): string {
  return `✓ pre-push  ${count} new ${plural(count, 'commit', 'commits')} checked · ${time}`
}

export const G1 = [
  '✖ pre-commit  commit on main',
  MAIN_BY_PULL_REQUEST,
  '  Your changes are still staged.',
  '  Fix: git switch -c fix/short-name, then commit again.',
]

/** Each finding reads like scripts/deploy.ts:14  rule generic-api-key  value REDACTED. */
export function g2(findings: readonly string[]): string[] {
  return [
    '✖ pre-commit  possible secret',
    ...findings.map((finding) => `  ${finding}`),
    '  Secrets never enter the repo.',
    '  Fix: move it to an environment variable. If it was a real key, rotate it now.',
  ]
}

/** Each place reads like docs/notes.md:22. */
export function g3(places: readonly string[]): string[] {
  return [
    '✖ pre-commit  private term',
    ...places.map((place) => `  ${place}`),
    "  A term on Brad's private list is in this change. The term isn't shown.",
    "  Fix: remove or reword that line. If it's a false match, ask Brad to refine the list.",
  ]
}

/** Each line reads like author     jo***@example.com. */
export function g4(lines: readonly string[]): string[] {
  return [
    '✖ pre-commit  address not allowed',
    ...lines.map((line) => `  ${line}`),
    '  Commits use a GitHub noreply address or brad@bradthome.com.',
    '  Fix: git config user.email <your noreply address>, then commit again.',
  ]
}

export function g5(changes: readonly LockedChange[]): string[] {
  const specs = [...new Set(changes.map((change) => `specs/${change.spec}/spec.md`))]
  return [
    '✖ pre-commit  locked test changed',
    ...changes.map((change) => `  ${change.file} is locked by spec ${specNumber(change.spec)}.`),
    '  A locked test changes only with its spec, and Brad approves both.',
    `  Fix: undo the test change, or change ${listed(specs)} on this branch first.`,
  ]
}

export function g6(problems: readonly CopyProblem[]): string[] {
  return [
    '✖ pre-commit  copies out of date',
    ...problems.map((problem) =>
      problem.source === undefined
        ? `  ${problem.copy} has no source in .agents/skills`
        : `  ${problem.copy} doesn't match ${problem.source}`,
    ),
    '  Fix: pnpm sync, then stage the copies.',
  ]
}

/** draft is where git left the message, such as .git/COMMIT_EDITMSG. */
export function g8(lines: readonly number[], draft: string): string[] {
  const where =
    lines.length === 1
      ? `  commit message, line ${lines[0]}. The term isn't shown.`
      : `  commit message, lines ${listed(lines.map(String))}. The terms aren't shown.`
  return ['✖ commit-msg  private term', where, `  Fix: reword the message. Your draft is in ${draft}.`]
}

/** Each line reads like line 9  Co-authored-by: ka***@example.com. */
export function g9(lines: readonly string[]): string[] {
  return [
    '✖ commit-msg  address not allowed in a trailer',
    ...lines.map((line) => `  ${line}`),
    '  Trailers use a GitHub noreply address, brad@bradthome.com or noreply@anthropic.com.',
    "  Fix: use the person's GitHub noreply address, or remove the line.",
  ]
}

export const COMMITLINT_MISSING = [
  '✖ commit-msg  commitlint not installed',
  '  Commits are blocked until the message format can be checked.',
  '  Fix: pnpm install, then commit again.',
]

export const G10 = [
  '✖ pre-push  push to main',
  MAIN_BY_PULL_REQUEST,
  '  Fix: git push -u origin <branch>, then open a pull request.',
]

/** A push that would rewrite history, and why. */
export type Rewrite =
  | { kind: 'lost'; remoteBranch: string; lost: number }
  | { kind: 'unfetched'; remoteBranch: string }
  | { kind: 'moved-tag'; remote: string; tag: string }

export function g11(rewrites: readonly Rewrite[]): string[] {
  const lines: string[] = []
  const fixes = new Set<string>()
  for (const rewrite of rewrites) {
    if (rewrite.kind === 'lost') {
      lines.push(`  ${rewrite.remoteBranch} would lose ${rewrite.lost} ${plural(rewrite.lost, 'commit', 'commits')}.`)
      fixes.add('  Fix: bring main in with git merge instead of a rebase, then push.')
    } else if (rewrite.kind === 'unfetched') {
      lines.push(`  ${rewrite.remoteBranch} has commits that this checkout hasn't fetched.`)
      fixes.add('  Fix: git fetch, bring those commits in with git merge, then push.')
    } else {
      lines.push(`  ${rewrite.remote} already has the tag ${rewrite.tag} on another commit.`)
      fixes.add('  Fix: make a new tag instead of moving one that was pushed.')
    }
  }
  return [
    '✖ pre-push  push would rewrite history',
    ...lines,
    '  Pushes never rewrite history, so a review always matches what was pushed.',
    ...fixes,
  ]
}

export interface FailingCommit {
  /** The commit's 7-character short SHA. */
  short: string
  /** Its subject, or a stand-in when the subject holds a term. */
  subject: string
  problems: string[]
}

export function g12(commits: readonly FailingCommit[], total: number): string[] {
  const width = Math.max(...commits.map((commit) => commit.subject.length))
  const rows = commits.flatMap((commit) =>
    commit.problems.map((problem, index) =>
      index === 0
        ? `  ${commit.short}  ${commit.subject.padEnd(width)}    ${problem}`
        : `  ${' '.repeat(commit.short.length)}  ${' '.repeat(width)}    ${problem}`,
    ),
  )
  const failing = commits.length
  return [
    `✖ pre-push  ${failing} of ${total} new ${plural(total, 'commit', 'commits')} ${plural(failing, 'fails', 'fail')} a check`,
    ...rows,
    '  These commits skipped the commit hooks. Nothing was pushed.',
    '  Fix: amend or drop them, then push again.',
  ]
}

export function g13(kind: 'branch' | 'tag'): string[] {
  if (kind === 'branch') {
    return [
      '✖ pre-push  private term in a branch name',
      "  The branch you're pushing has a term from Brad's private list in its name.",
      "  The name isn't shown, since it holds the term.",
      '  Fix: git branch -m <new-name>, then push again.',
    ]
  }
  return [
    '✖ pre-push  private term in a tag name',
    "  The tag you're pushing has a term from Brad's private list in its name.",
    "  The name isn't shown, since it holds the term.",
    '  Fix: git tag -d <name>, tag the commit again with a new name, then push.',
  ]
}

export const S3_FIX = '  Fix: git config --global bradthome.privateTerms <path to the list>'

const LIST_PROBLEM: Record<TermsProblem, string> = {
  'not-found': 'private-term list not found',
  unreadable: "private-term list can't be read",
  empty: 'private-term list is empty',
}

/** The words for a list problem, as the setup check and the hooks name it. */
export function listProblem(problem: TermsProblem): string {
  return LIST_PROBLEM[problem]
}

/** The fix for a list problem, which depends on where the list was looked for. */
export function listFix(source: TermsSource): string {
  return source === 'env'
    ? '  Fix: put the list in PRIVATE_TERMS, or unset PRIVATE_TERMS to use the bradthome.privateTerms setting.'
    : S3_FIX
}

export function s3(hook: Hook | 'terms', problem: TermsProblem, source: TermsSource): string[] {
  return [
    `✖ ${hook}  ${listProblem(problem)}`,
    "  This check reads Brad's private list, which never enters the repo.",
    `  ${blockedWhat(hook)} blocked until it's found, so nothing private slips through.`,
    listFix(source),
  ]
}

export const S4_FIX = '  Fix: install gitleaks 8.30.1 or later (scoop install gitleaks, or brew install gitleaks).'

export function s4(hook: 'pre-commit' | 'pre-push'): string[] {
  return [`✖ ${hook}  gitleaks not installed`, `  ${blockedWhat(hook)} blocked until the secret scan can run.`, S4_FIX]
}

export function secretScanFailed(hook: 'pre-commit' | 'pre-push'): string[] {
  const command = hook === 'pre-commit' ? 'gitleaks git --staged' : 'gitleaks git'
  return [
    `✖ ${hook}  secret scan failed`,
    `  gitleaks didn't finish, so ${blockedWhat(hook).toLowerCase()} blocked until the secret scan can run.`,
    `  Fix: run ${command} to see what went wrong, then try again.`,
  ]
}

/** A check that crashed blocks too, so nothing slips through a bug (FR-007). */
export function crashed(hook: Hook): string[] {
  return [
    `✖ ${hook}  the check couldn't run`,
    `  ${blockedWhat(hook)} blocked until it can.`,
    `  Fix: try again. If it keeps failing, run node scripts/hooks/${hook}.ts to see why.`,
  ]
}
