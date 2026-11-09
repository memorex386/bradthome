import type { CopyProblem } from './copies.ts'
import { type LockedChange, specNumber } from './locks.ts'
import type { TermsProblem, TermsSource } from './terms.ts'

// The words the checks print: the mocks' exact words, in
// specs/001-hooks-and-agent-rules/mocks/README.md (FR-016). Cases the mocks
// don't show follow their style.

export type Hook = 'pre-commit' | 'commit-msg' | 'pre-push'

const COMMITS_ON_A_BRANCH = '  Commits go on a branch, which reaches main once Brad says push.'

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
  COMMITS_ON_A_BRANCH,
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

export const G10 = ['✖ pre-push  deletes main', '  Main is never deleted.', '  Fix: name the branch you meant to delete.']

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

// Spec 002's words for the CI jobs, the ruleset check and the setup check's
// repo line: specs/002-ci-and-rulesets/mocks/README.md (FR-020). Cases the
// mocks don't show follow their style.

export type CiJob = 'gate' | 'privacy' | 'secrets' | 'commits' | 'trace' | 'hygiene' | 'lock' | 'evals'

export function k1(failing: readonly { name: string; result: string }[], total: number): string[] {
  const width = Math.max(...failing.map((job) => job.name.length))
  return [
    `✖ gate  ${failing.length} of ${total} jobs didn't pass`,
    ...failing.map((job) => `  ${job.name.padEnd(width)}  ${job.result}`),
    '  The gate passes only when every job passes.',
    '  Fix: open each job above for its message.',
  ]
}

export const PASS_GATE = '✓ gate  every ci job passed'
export const PASS_GATE_DRAFT = "✓ gate  every quick job passed. A draft runs the full suite once it's ready for review."

/** The gate couldn't read the jobs' results, so it fails rather than pass on nothing. */
export function gateUnread(reason: string): string[] {
  return [
    `✖ gate  the jobs' results can't be read: ${reason}`,
    "  The gate fails until it can see every job's result, so a missing check never reads as a pass.",
    '  Fix: re-run the workflow. If it fails again, open the gate job for the reason above.',
  ]
}

export function k3(places: readonly string[]): string[] {
  return [
    '✖ privacy  private term',
    ...places.map((place) => `  ${place}`),
    "  A term on Brad's private list is in this pull request. The term isn't shown.",
    '  Fix: remove or reword it in a new commit. If it reached a commit message, tell Brad before merging.',
  ]
}

/** Each line reads like e4f5a6b  author     jo***@example.com. */
export function k4(lines: readonly string[]): string[] {
  return [
    '✖ privacy  address not allowed',
    ...lines.map((line) => `  ${line}`),
    '  Commits use a GitHub noreply address or brad@bradthome.com.',
    "  Fix: tell Brad. The squash merge sets its own author, but the branch's commits stay visible.",
  ]
}

/** The list is missing, empty or only comments (S2.4). The source doesn't matter in CI: it's the secret. */
export const K6 = [
  '✖ privacy  private-term list not found',
  "  This check reads Brad's private list from the PRIVATE_TERMS secret, which never enters the repo.",
  "  The check fails until it's found, so nothing private slips through.",
  '  Fix: ask Brad to set PRIVATE_TERMS for Actions and for Dependabot.',
]

/** Each finding reads like e4f5a6b  scripts/deploy.ts:14  rule generic-api-key  value REDACTED. */
export function k5(findings: readonly string[]): string[] {
  return [
    '✖ secrets  possible secret',
    ...findings.map((finding) => `  ${finding}`),
    '  Secrets never enter the repo.',
    '  Fix: if it was a real key, rotate it now, then tell Brad.',
  ]
}

export const K5_NOT_INSTALLED = [
  '✖ secrets  gitleaks not installed',
  "  The secret scan can't run, so the job fails rather than pass on nothing.",
  "  Fix: check the job's gitleaks step, which installs 8.30.1 from its release.",
]

export const K5_FAILED = [
  '✖ secrets  secret scan failed',
  "  gitleaks didn't finish, so the job fails rather than pass on nothing.",
  '  Fix: re-run the job. If it fails again, run gitleaks git on the branch to see why.',
]

export interface FailingMessage {
  /** title, or the commit's 7-character short SHA. */
  label: string
  /** The title, or the commit's subject. */
  subject: string
  /** commitlint's problems, as ✖ message [rule]. */
  problems: string[]
}

export function k7(failing: readonly FailingMessage[], titleFails: boolean, commitsFailing: number, commitsTotal: number): string[] {
  const commits = `${commitsFailing} of ${commitsTotal} ${plural(commitsTotal, 'commit', 'commits')}`
  const header = titleFails
    ? commitsFailing > 0
      ? `✖ commits  the title and ${commits} fail the message rules`
      : '✖ commits  the title fails the message rules'
    : `✖ commits  ${commits} ${plural(commitsFailing, 'fails', 'fail')} the message rules`
  return [
    header,
    ...failing.flatMap((item) => [`  ${item.label.padEnd(7)}  ${item.subject}`, ...item.problems.map((problem) => `    ${problem}`)]),
    '  Fix: edit the title. Pushes never rewrite history, so for a commit, move the work to a new branch with the message fixed.',
  ]
}

export function k8(changes: readonly LockedChange[]): string[] {
  const specs = [...new Set(changes.map((change) => `specs/${change.spec}/spec.md`))]
  return [
    '✖ lock  locked test changed',
    ...changes.map((change) => `  ${change.file} is locked by spec ${specNumber(change.spec)}.`),
    '  A locked test changes only with its spec, and Brad approves both.',
    "  This check runs from main's copy, so changes to it in this pull request don't apply.",
    `  Fix: undo the test change, or change ${listed(specs)} on this branch.`,
  ]
}

/** A head whose tests.lock doesn't match its test files. Each line reads like changed  tests/001/unit/a.test.ts. */
export function k8Stale(lock: string, folder: string, lines: readonly string[]): string[] {
  return [
    `✖ lock  ${lock} doesn't match ${folder}/`,
    ...lines.map((line) => `  ${line}`),
    "  This check runs from main's copy, so changes to it in this pull request don't apply.",
    `  Fix: run pnpm lock ${lock.replace(/\/tests\.lock$/, '')} once Brad approves the spec change, and push the lock.`,
  ]
}

export function k9(spec: string, missing: readonly string[], total: number): string[] {
  return [
    `✖ trace  ${missing.length} of the ${total} IDs in ${spec}/spec.md lead no test name`,
    `  ${missing.join('  ')}`,
    '  Fix: add a test named with each ID, as the working agreement asks.',
  ]
}

export function k10(problems: readonly string[]): string[] {
  return [
    `✖ hygiene  ${problems.length} ${plural(problems.length, 'problem', 'problems')}`,
    ...problems.map((problem) => `  ${problem}`),
    '  Fix: pnpm sync, and check .gitattributes is respected, then push again.',
  ]
}

/** A CI job that crashed fails, so nothing slips through a bug (FR-020). */
export function ciCrashed(job: CiJob): string[] {
  return [
    `✖ ${job}  the check couldn't run`,
    '  The job fails until it can, so nothing slips through.',
    `  Fix: re-run the job. If it fails again, run node scripts/ci/${job === 'trace' ? 'trace-all' : job}.ts in a checkout to see why.`,
  ]
}

export const R1_FILE_PASS = [
  '✓ ruleset file  .github/rulesets/main.json has every rule',
  '    pull requests only · squash merges · linear history · signed commits',
  '    the gate, the text check and the lock check passing · 1 approval from a code owner · stale approvals dismissed · no force pushes or deletions · only the admin role bypasses',
]
export const R1_CODEOWNERS_PASS = '✓ code owners  .github/CODEOWNERS names Brad for every path'
export const R1_PENDING = "… live ruleset  pending: GitHub serves rulesets for this repo once it's public (slice 1.5)"
export const R1_READY = 'Ready for slice 1.5.'
export const R2_HEADER = '✖ live ruleset  differs from the file'
export const R2_FIX = "  Fix: Brad reapplies the file from slice 1.5's steps, or a pull request changes the file first."

export const S1_REPO_PASS = 'repo settings: squash merges only, auto-merge on, branches deleted after merging'
