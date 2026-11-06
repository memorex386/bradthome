import { expect } from 'vitest'
import { linesOf } from './run.ts'

// The exact words from specs/001-hooks-and-agent-rules/mocks/README.md. Where a
// mock shows a made-up file, address, number or time, the tests use their own
// and keep the rest of the words.

export const PASS = {
  preCommit: /^✓ pre-commit {2}main, secrets, private terms, addresses, locked tests, copies · \d+(?:\.\d+)?s$/,
  commitMsg: /^✓ commit-msg {2}format, private terms, trailers · \d+(?:\.\d+)?s$/,
  prePush: /^✓ pre-push {2}(\d+) new commits? checked · \d+(?:\.\d+)?s$/,
}

export const G1 = [
  '✖ pre-commit  commit on main',
  '  Commits go on a branch, which reaches main once Brad says push.',
  '  Your changes are still staged.',
  '  Fix: git switch -c fix/short-name, then commit again.',
]

export const G2_HEADER = '✖ pre-commit  possible secret'
export const G2_TAIL = [
  '  Secrets never enter the repo.',
  '  Fix: move it to an environment variable. If it was a real key, rotate it now.',
]

export const G3_HEADER = '✖ pre-commit  private term'
export const G3_TAIL = [
  "  A term on Brad's private list is in this change. The term isn't shown.",
  "  Fix: remove or reword that line. If it's a false match, ask Brad to refine the list.",
]

export const G4_HEADER = '✖ pre-commit  address not allowed'
export const G4_TAIL = [
  '  Commits use a GitHub noreply address or brad@bradthome.com.',
  '  Fix: git config user.email <your noreply address>, then commit again.',
]

export const G5_HEADER = '✖ pre-commit  locked test changed'
export function g5(file: string, specNumber: string, specFile: string): string[] {
  return [
    G5_HEADER,
    `  ${file} is locked by spec ${specNumber}.`,
    '  A locked test changes only with its spec, and Brad approves both.',
    `  Fix: undo the test change, or change ${specFile} on this branch first.`,
  ]
}

export const G6_HEADER = '✖ pre-commit  copies out of date'
export const G6_FIX = '  Fix: pnpm sync, then stage the copies.'
export function g6Line(copy: string, source: string): string {
  return `  ${copy} doesn't match ${source}`
}

export const G7_FOR_UPDATE_HOOKS = [
  '⧗   input: update hooks',
  '✖   subject may not be empty [subject-empty]',
  '✖   type may not be empty [type-empty]',
  '✖   name the spec, as in feat(001): …, or add a Refs: #N line [spec-or-issue]',
  '',
  '✖   found 3 problems, 0 warnings',
  'ⓘ   Get help: docs/working-agreement.md#conventions',
]
export const G7_SPEC_OR_ISSUE = '✖   name the spec, as in feat(001): …, or add a Refs: #N line [spec-or-issue]'

export function g8(line: number): string[] {
  return [
    '✖ commit-msg  private term',
    `  commit message, line ${line}. The term isn't shown.`,
    '  Fix: reword the message. Your draft is in .git/COMMIT_EDITMSG.',
  ]
}

export const G9_HEADER = '✖ commit-msg  address not allowed in a trailer'
export const G9_TAIL = [
  '  Trailers use a GitHub noreply address, brad@bradthome.com or noreply@anthropic.com.',
  "  Fix: use the person's GitHub noreply address, or remove the line.",
]

export const G10 = ['✖ pre-push  deletes main', '  Main is never deleted.', '  Fix: name the branch you meant to delete.']

export const G11_HEADER = '✖ pre-push  push would rewrite history'
export function g11(remoteBranch: string, lost: number): string[] {
  return [
    G11_HEADER,
    `  ${remoteBranch} would lose ${lost} commits.`,
    '  Pushes never rewrite history, so a review always matches what was pushed.',
    '  Fix: bring main in with git merge instead of a rebase, then push.',
  ]
}

/** The G12 header. The mock shows "2 of 3 new commits fail a check"; other counts may be singular. */
export function g12Header(failing: number, total: number): RegExp {
  return new RegExp(`^✖ pre-push {2}${failing} of ${total} new commits? fails? a check$`)
}
export const G12_TAIL = [
  '  These commits skipped the commit hooks. Nothing was pushed.',
  '  Fix: amend or drop them, then push again.',
]

export const G13 = [
  '✖ pre-push  private term in a branch name',
  "  The branch you're pushing has a term from Brad's private list in its name.",
  "  The name isn't shown, since it holds the term.",
  '  Fix: git branch -m <new-name>, then push again.',
]

export const S3_FIX = '  Fix: git config --global bradthome.privateTerms <path to the list>'
export const S3_PRE_COMMIT = [
  '✖ pre-commit  private-term list not found',
  "  This check reads Brad's private list, which never enters the repo.",
  "  Commits are blocked until it's found, so nothing private slips through.",
  S3_FIX,
]

export const S4_PRE_COMMIT = [
  '✖ pre-commit  gitleaks not installed',
  '  Commits are blocked until the secret scan can run.',
  '  Fix: install gitleaks 8.30.1 or later (scoop install gitleaks, or brew install gitleaks).',
]
export const S4_FIX = '  Fix: install gitleaks 8.30.1 or later (scoop install gitleaks, or brew install gitleaks).'

export const C = {
  merge: 'Brad merges pull requests. Ask for the merge in the pull request.',
  approve: 'Only Brad approves pull requests. Leave a comment instead.',
  skipHooks: "Don't skip the git hooks. Fix what they report instead.",
  browser:
    "The browser stays off this repo's pull request and settings pages. Read pull requests with gh.",
  userGuard: 'Brad merges bradthome pull requests, from any folder.',
  locked: (file: string) =>
    `${file} is locked by spec 001. Change the spec first; Brad approves both in the pull request.`,
}

export const C7 = [
  'Stop hook: the fast checks failed, so keep working.',
  "  ✖ types  scripts/private-terms.ts:41  Type 'string | undefined' is not assignable to type 'string'.",
  '  ✖ tests  2 failed in tests/private-terms.test.ts',
  '  Fix these, then finish.',
]

/** The index of the first line that matches, or -1. */
export function findLine(text: string, line: string | RegExp): number {
  return linesOf(text).findIndex((candidate) => (typeof line === 'string' ? candidate === line : line.test(candidate)))
}

/** Expects these lines to appear one after another in the output, each whole. */
export function expectBlock(text: string, block: readonly (string | RegExp)[]): void {
  const lines = linesOf(text)
  const first = block[0]
  if (first === undefined) return
  const start = lines.findIndex((line, index) =>
    block.every((expected, offset) => {
      const actual = lines[index + offset]
      if (actual === undefined) return false
      return typeof expected === 'string' ? actual === expected : expected.test(actual)
    }),
  )
  expect(start, `expected these lines together:\n${block.join('\n')}\n\nin:\n${text}`).toBeGreaterThanOrEqual(0)
}

/** Expects these lines to appear in this order, each whole, with anything between them. */
export function expectInOrder(text: string, items: readonly (string | RegExp)[]): void {
  const lines = linesOf(text)
  let from = 0
  for (const item of items) {
    const offset = lines
      .slice(from)
      .findIndex((line) => (typeof item === 'string' ? line === item : item.test(line)))
    expect(offset, `expected ${String(item)} after line ${from} in:\n${text}`).toBeGreaterThanOrEqual(0)
    from += offset + 1
  }
}

/** Expects exactly one line of the output to match. */
export function expectOneLine(text: string, pattern: RegExp): RegExpExecArray {
  const matches = linesOf(text)
    .map((line) => pattern.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
  expect(matches.length, `expected one line matching ${pattern} in:\n${text}`).toBe(1)
  const match = matches[0]
  if (match === undefined) throw new Error('unreachable')
  return match
}
