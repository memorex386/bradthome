// The exact words from specs/002-ci-and-rulesets/mocks/README.md. Where a mock
// shows a made-up file, commit, address or count, the tests use their own and
// keep the rest of the words. A passing job prints one line, which the mocks
// don't show, so the tests match only its start.

export const PASS = {
  gate: /^✓ gate {2}every ci job passed$/,
  privacy: /^✓ privacy\b/,
  secrets: /^✓ secrets\b/,
  commits: /^✓ commits\b/,
  trace: /^✓ trace\b/,
  hygiene: /^✓ hygiene\b/,
  lock: /^✓ lock\b/,
}

export const K1_TAIL = ['  The gate passes only when every job passes.', '  Fix: open each job above for its message.']

export const K3_HEADER = '✖ privacy  private term'
export const K3_TAIL = [
  "  A term on Brad's private list is in this pull request. The term isn't shown.",
  '  Fix: remove or reword it in a new commit. If it reached a commit message, tell Brad before merging.',
]
export const K3_PLACE = {
  file: (file: string, line: number) => `  ${file}:${line}`,
  message: (sha7: string, line: number) => `  commit ${sha7}, message line ${line}`,
  branch: '  the branch name',
  title: /^ {2}the pull request's title$/,
  description: /^ {2}the pull request's description(?:, line \d+)?$/,
}

export const K4_HEADER = '✖ privacy  address not allowed'
export const K4_TAIL = [
  '  Commits use a GitHub noreply address or brad@bradthome.com.',
  "  Fix: tell Brad. The squash merge sets its own author, but the branch's commits stay visible.",
]

export const K5_HEADER = '✖ secrets  possible secret'
export const K5_TAIL = ['  Secrets never enter the repo.', '  Fix: if it was a real key, rotate it now, then tell Brad.']

export const K6 = [
  '✖ privacy  private-term list not found',
  "  This check reads Brad's private list from the PRIVATE_TERMS secret, which never enters the repo.",
  "  The check fails until it's found, so nothing private slips through.",
  '  Fix: ask Brad to set PRIVATE_TERMS for Actions and for Dependabot.',
]

export const K7_FIX =
  '  Fix: edit the title. Pushes never rewrite history, so for a commit, move the work to a new branch with the message fixed.'
export const K7_TYPE_EMPTY = '    ✖ type may not be empty [type-empty]'
export const K7_SPEC_OR_ISSUE = '    ✖ name the spec, as in feat(001): …, or add a Refs: #N line [spec-or-issue]'

export const K8_HEADER = '✖ lock  locked test changed'
export function k8(file: string, specNumber: string, specFile: string): string[] {
  return [
    K8_HEADER,
    `  ${file} is locked by spec ${specNumber}.`,
    '  A locked test changes only with its spec, and Brad approves both.',
    "  This check runs from main's copy, so changes to it in this pull request don't apply.",
    `  Fix: undo the test change, or change ${specFile} on this branch.`,
  ]
}
export const K8_MAINS_COPY = "  This check runs from main's copy, so changes to it in this pull request don't apply."

export const K9_FIX = '  Fix: add a test named with each ID, as the working agreement asks.'

export const K10_FIX = '  Fix: pnpm sync, and check .gitattributes is respected, then push again.'
export function k10Copy(copy: string, source: string): string {
  return `  ${copy} doesn't match ${source}`
}

export const R1_FILE = [
  '✓ ruleset file  .github/rulesets/main.json has every rule',
  '    pull requests only · squash merges · linear history · signed commits',
  '    the gate and the lock check passing · 1 approval from a code owner · stale approvals dismissed · no force pushes or deletions · no bypass',
]
export const R1_CODEOWNERS = '✓ code owners  .github/CODEOWNERS names Brad for every path'
export const R1_PENDING = "… live ruleset  pending: GitHub serves rulesets for this repo once it's public (slice 1.5)"
export const R1_READY = 'Ready for slice 1.5.'
export const R_NOT_CHECKED = /^… live ruleset {2}not checked: \S/

export const R2_HEADER = '✖ live ruleset  differs from the file'
export const R2_FIX = "  Fix: Brad reapplies the file from slice 1.5's steps, or a pull request changes the file first."

export const S1_REPO = '✓ repo settings: squash merges only, auto-merge off, branches deleted after merging'
