import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  expectBlock,
  expectInOrder,
  findLine,
  g8,
  G7_FOR_UPDATE_HOOKS,
  G7_SPEC_OR_ISSUE,
  G9_HEADER,
  G9_TAIL,
  PASS,
  S3_FIX,
} from '../helpers/messages.ts'
import { slash } from '../helpers/paths.ts'
import { commitAll, type ScratchRepo } from '../helpers/repo.ts'
import { describeRun, filledLines, type RunResult } from '../helpers/run.ts'
import type { Sandbox } from '../helpers/sandbox.ts'
import { scratchRepos } from '../helpers/seeds.ts'
import { EMPTY_LIST, expectNoTerm } from '../helpers/terms.ts'

// commit-msg, run by real git in scratch repos. Only this hook is on, so its
// own words are the only hook output.

const scratch = scratchRepos()

function repoWithCommitMsg(options: { terms?: false } = {}): ScratchRepo {
  return scratch({ sandbox: options.terms === false ? { terms: false } : {}, repo: { hooks: ['commit-msg'] } })
}

let messages = 0

/** Commits staged changes with a message read from a file, the way an editor leaves it. */
function commitWith(repo: ScratchRepo, message: string): RunResult {
  messages += 1
  const file = repo.sandbox.path(`message-${messages}.txt`)
  writeFileSync(file, message)
  repo.write(`docs/change-${messages}.md`, `Change ${messages}.\n`)
  repo.gitOk(['add', '--all'])
  return repo.git(['commit', '-F', file])
}

/** A branch called other, one commit ahead of main, and a commit on the current branch. */
function divergedBranches(repo: ScratchRepo): void {
  repo.gitOk(['switch', '--quiet', '--create', 'other', 'main'])
  repo.write('docs/other.md', 'Notes from the other branch.\n')
  repo.gitOk(['add', '--all'])
  repo.gitOk(['commit', '--quiet', '-m', 'docs(001): add notes from the other branch'])
  repo.gitOk(['switch', '--quiet', '001-demo'])
  repo.write('docs/demo.md', 'Notes from this branch.\n')
  repo.gitOk(['add', '--all'])
  repo.gitOk(['commit', '--quiet', '-m', 'docs(001): add notes from this branch'])
}

describe('G0: messages that follow the convention', () => {
  test('G0 S4.2 FR-010 FR-016 a spec scope passes, and commit-msg prints one line naming what it checked', () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'feat(001): add the setup check\n')
    expect(result.status, describeRun(result)).toBe(0)
    const lines = filledLines(result.stderr)
    expect(lines, result.stderr).toHaveLength(1)
    expect(lines[0]).toMatch(PASS.commitMsg)
  })

  test("G0 S4.3 FR-010 a Refs: #N line passes with a scope that isn't a spec number", () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'fix(repo): handle empty lists\n\nRefs: #12\n')
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('G7: the message does not follow the convention', () => {
  test("G7 S4.1 FR-010 FR-016 blocks a message that isn't a Conventional Commit, with commitlint's report", () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'update hooks\n')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, G7_FOR_UPDATE_HOOKS)
  })

  test("G7 S4.4 FR-010 blocks a scope that isn't a spec number with no Refs line, naming the spec-or-issue rule", () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'docs(repo): fix a typo\n')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, ['⧗   input: docs(repo): fix a typo', G7_SPEC_OR_ISSUE])
  })

  test('G7 S4.5 FR-010 a message that only looks like a merge still follows the format', () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, "Merge branch 'feature'\n")
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('[spec-or-issue]')
  })
})

describe('S4.5: merge commits that git writes', () => {
  test('G0 S4.5 FR-010 skips the format rule for a merge commit that git writes', () => {
    const repo = repoWithCommitMsg()
    divergedBranches(repo)
    const result = repo.git(['merge', '--no-ff', '--no-edit', 'other'])
    expect(result.status, describeRun(result)).toBe(0)
    expect(filledLines(result.stderr).some((line) => PASS.commitMsg.test(line)), result.stderr).toBe(true)
    expect(repo.gitOk(['log', '-1', '--format=%s'])).toBe("Merge branch 'other' into 001-demo")
  })

  test('G8 S4.5 FR-006 SC-002 still checks a merge commit for private terms', () => {
    const repo = repoWithCommitMsg()
    divergedBranches(repo)
    const result = repo.git(['merge', '--no-ff', '-m', "Merge branch 'other' with the zorblax notes", 'other'])
    expect(result.status).not.toBe(0)
    // A merge's draft is in .git/MERGE_MSG, so only the first two lines are the mock's.
    expectBlock(result.stderr, g8(1).slice(0, 2))
    expectNoTerm(result)
  })

  test("G9 S4.5 FR-008 still checks a merge commit's trailer addresses", () => {
    const repo = repoWithCommitMsg()
    divergedBranches(repo)
    const message = ["Merge branch 'other'", '', 'Co-authored-by: Kay Example <ka.example@example.com>'].join('\n')
    const result = repo.git(['merge', '--no-ff', '-m', message, 'other'])
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G9_HEADER, '  line 3  Co-authored-by: ka***@example.com', ...G9_TAIL])
  })
})

describe('G8: a private term in the commit message', () => {
  test('G8 S1.3 FR-006 FR-016 SC-002 blocks a message that holds a private term, naming the line but not the term', () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'feat(001): add notes\n\nMentions Zorblax here.\n')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, g8(3))
    expectNoTerm(result)
  })

  test('G8 S1.3 FR-005 SC-002 finds a term in the subject, and a digits entry in the body', () => {
    const repo = repoWithCommitMsg()
    for (const [message, line] of [
      ['docs(001): add the QUIXMOOR notes\n', 1],
      ['feat(001): add the contact check\n\nThe example is 555.555.0147.\n', 3],
    ] as const) {
      const result = commitWith(repo, message)
      expect(result.status, message).not.toBe(0)
      expectBlock(result.stderr, g8(line))
      expectNoTerm(result)
    }
  })
})

describe('G9: an address in a trailer that is not allowed', () => {
  test("G9 S1.5 FR-008 FR-016 SC-002 blocks a trailer whose address isn't allowed, and masks it", () => {
    const repo = repoWithCommitMsg()
    const message = [
      'feat(001): add the setup check',
      '',
      'Adds the check that runs on a new machine.',
      'It prints the number of terms, never a term.',
      '',
      'It also reports the gitleaks version, and the account',
      'that gh uses for Claude Code here.',
      '',
      'Co-authored-by: Kay Example <ka.example@example.com>',
      '',
    ].join('\n')
    const result = commitWith(repo, message)
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, [G9_HEADER, '  line 9  Co-authored-by: ka***@example.com', ...G9_TAIL])
    expect(result.stdout + result.stderr).not.toContain('ka.example@example.com')
  })

  test("G0 S1.5 FR-008 allows Claude's co-author line and the other allowed trailer addresses", () => {
    const repo = repoWithCommitMsg()
    const message = [
      'feat(001): add the setup check',
      '',
      'Co-authored-by: Brad Thome <brad@bradthome.com>',
      'Signed-off-by: Test Agent <1234567+test-agent@users.noreply.github.com>',
      'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
      '',
    ].join('\n')
    const result = commitWith(repo, message)
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('G9 S1.5 FR-008 SC-002 hides a masked trailer address that still holds a term', () => {
    const repo = repoWithCommitMsg()
    const result = commitWith(repo, 'feat(001): add the setup check\n\nCo-authored-by: Kay <ka@zorblax.example>\n')
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(G9_HEADER)
    expectNoTerm(result)
  })
})

describe('S3: the private-term list is missing', () => {
  test('S3 S1.6 FR-007 FR-016 commit-msg blocks while the list has no setting', () => {
    const repo = repoWithCommitMsg({ terms: false })
    const result = commitWith(repo, 'feat(001): add the lock script\n')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, ['✖ commit-msg  private-term list not found', S3_FIX])
  })

  test("S3 S1.6 FR-007 commit-msg blocks when the list's file is missing, can't be read or holds no terms", () => {
    for (const [problem, prepare, header] of [
      [
        'missing',
        (box: Sandbox) => box.setGlobal('bradthome.privateTerms', slash(box.path('no-such-list.txt'))),
        /^✖ commit-msg {2}private-term list not found$/,
      ],
      [
        'unreadable',
        (box: Sandbox) => {
          mkdirSync(box.path('a-folder-not-a-file'))
          box.setGlobal('bradthome.privateTerms', slash(box.path('a-folder-not-a-file')))
        },
        /^✖ commit-msg {2}private-term list/,
      ],
      ['empty', (box: Sandbox) => writeFileSync(box.termsFile, EMPTY_LIST), /^✖ commit-msg {2}private-term list is empty$/],
    ] as const) {
      const repo = repoWithCommitMsg()
      prepare(repo.sandbox)
      const result = commitWith(repo, 'feat(001): add the lock script\n')
      expect(result.status, problem).not.toBe(0)
      expect(findLine(result.stderr, header), `${problem}\n${result.stderr}`).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the hooks together', () => {
  test('G0 FR-016 with every hook on, a clean commit prints the pre-commit line, then the commit-msg line', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status, describeRun(result)).toBe(0)
    const lines = filledLines(result.stderr)
    expect(lines[0]).toMatch(PASS.preCommit)
    expect(lines[1]).toMatch(PASS.commitMsg)
  })
})
