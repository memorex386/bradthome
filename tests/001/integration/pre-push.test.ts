import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  expectBlock,
  expectInOrder,
  expectOneLine,
  findLine,
  G10,
  g11,
  G11_HEADER,
  g12Header,
  G12_TAIL,
  G13,
  PASS,
  S3_FIX,
  S4_FIX,
} from '../helpers/messages.ts'
import { slash } from '../helpers/paths.ts'
import { commitSkippingHooks, type ScratchRepo, textWithLineAt } from '../helpers/repo.ts'
import { describeRun, run, type RunResult } from '../helpers/run.ts'
import { type Sandbox, withoutOnPath } from '../helpers/sandbox.ts'
import { FAKE_TOKEN, fileWithToken, scratchRepos } from '../helpers/seeds.ts'
import { EMPTY_LIST, expectNoTerm } from '../helpers/terms.ts'

// pre-push, run by real git pushing to a local bare repo. Only pre-push is on,
// so the commits here are made the way commits made with the hooks skipped
// would be.

const scratch = scratchRepos()

function repoWithPrePush(options: { terms?: false } = {}): ScratchRepo {
  return scratch({ sandbox: options.terms === false ? { terms: false } : {}, repo: { hooks: ['pre-push'] } })
}

let changes = 0

/** A clean commit, with the hooks skipped. Returns its short SHA. */
function cleanCommit(repo: ScratchRepo, subject = 'docs(001): add notes'): string {
  changes += 1
  repo.write(`docs/change-${changes}.md`, `Change ${changes}.\n`)
  return commitSkippingHooks(repo, subject)
}

/** The SHA a ref has on origin, or '' when origin doesn't have it. */
function onOrigin(repo: ScratchRepo, ref: string): string {
  const result = run('git', ['ls-remote', slash(repo.origin), ref], { cwd: repo.dir, env: repo.sandbox.env })
  return result.stdout.trim().split(/\s+/)[0] ?? ''
}

/** The G12 block: its header first, a line for each failing commit, and its closing lines last. */
function expectFailingCommits(result: RunResult, failing: number, total: number, lines: readonly RegExp[]): void {
  const header = findLine(result.stderr, g12Header(failing, total))
  expect(header, result.stderr).toBeGreaterThanOrEqual(0)
  const tail = findLine(result.stderr, G12_TAIL[0] ?? '')
  for (const line of lines) {
    const at = findLine(result.stderr, line)
    expect(at, `${String(line)}\n${result.stderr}`).toBeGreaterThan(header)
    expect(at, `${String(line)}\n${result.stderr}`).toBeLessThan(tail)
  }
  expectBlock(result.stderr, G12_TAIL)
}

describe('G0: a clean push', () => {
  test("G0 S1.8 FR-009 FR-016 a new branch's first push checks every commit the remote doesn't have, in one line", () => {
    const repo = repoWithPrePush()
    for (let n = 0; n < 3; n += 1) cleanCommit(repo)
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
    expect(result.status, describeRun(result)).toBe(0)
    const match = expectOneLine(result.stderr, PASS.prePush)
    expect(match[1]).toBe('3')
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe(repo.gitOk(['rev-parse', 'HEAD']))
  })

  test("G0 FR-009 a later push checks only the commits the remote doesn't have", () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    cleanCommit(repo)
    expect(repo.git(['push', '--set-upstream', 'origin', '001-demo']).status).toBe(0)
    cleanCommit(repo)
    const result = repo.git(['push'])
    expect(result.status, describeRun(result)).toBe(0)
    expect(expectOneLine(result.stderr, PASS.prePush)[1]).toBe('1')
  })

  test('G0 FR-002 deleting a remote branch other than main passes', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    expect(repo.git(['push', 'origin', '001-demo']).status).toBe(0)
    const result = repo.git(['push', 'origin', '--delete', '001-demo'])
    expect(result.status, describeRun(result)).toBe(0)
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe('')
  })

  test('G0 S1.11 FR-006 FR-009 pushing a clean tag passes, and checks the commit it sends', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    repo.gitOk(['tag', 'v0.1.0'])
    const result = repo.git(['push', 'origin', 'v0.1.0'])
    expect(result.status, describeRun(result)).toBe(0)
    expect(expectOneLine(result.stderr, PASS.prePush)[1]).toBe('1')
  })
})

describe('G10: a push that deletes main', () => {
  test('G10 S2.2 FR-002 FR-016 blocks a push that deletes main', () => {
    const repo = repoWithPrePush()
    const main = onOrigin(repo, 'refs/heads/main')
    const result = repo.git(['push', 'origin', '--delete', 'main'])
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, G10)
    expect(onOrigin(repo, 'refs/heads/main')).toBe(main)
  })

  test('G0 S2.2 FR-002 FR-009 a push to main passes, from a branch, to refs/heads/main or from main, and checks each new commit', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    const fromBranch = repo.git(['push', 'origin', 'HEAD:main'])
    expect(fromBranch.status, describeRun(fromBranch)).toBe(0)
    expect(expectOneLine(fromBranch.stderr, PASS.prePush)[1]).toBe('1')
    expect(onOrigin(repo, 'refs/heads/main')).toBe(repo.gitOk(['rev-parse', 'HEAD']))
    cleanCommit(repo)
    const fullRef = repo.git(['push', 'origin', '001-demo:refs/heads/main'])
    expect(fullRef.status, describeRun(fullRef)).toBe(0)
    repo.gitOk(['switch', '--quiet', 'main'])
    repo.gitOk(['merge', '--quiet', '--ff-only', '001-demo'])
    cleanCommit(repo, 'docs(repo): fix a typo')
    const fromMain = repo.git(['push', 'origin', 'main'])
    expect(fromMain.status, describeRun(fromMain)).toBe(0)
    expect(onOrigin(repo, 'refs/heads/main')).toBe(repo.gitOk(['rev-parse', 'HEAD']))
  })

  test('G0 S2.2 FR-002 a commit on a detached HEAD pushed to main passes', () => {
    const repo = repoWithPrePush()
    repo.gitOk(['switch', '--quiet', '--detach'])
    cleanCommit(repo)
    const result = repo.git(['push', 'origin', 'HEAD:main'])
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('G11 G12 S2.2 S2.3 FR-002 a push to main still gets every other check: no rewrites and no secrets', () => {
    const repo = repoWithPrePush()
    const start = onOrigin(repo, 'refs/heads/main')
    cleanCommit(repo)
    expect(repo.git(['push', 'origin', 'HEAD:main']).status).toBe(0)
    const main = onOrigin(repo, 'refs/heads/main')
    repo.gitOk(['switch', '--quiet', '--detach', start])
    cleanCommit(repo)
    const rewrite = repo.git(['push', '--force', 'origin', 'HEAD:main'])
    expect(rewrite.status).not.toBe(0)
    expect(findLine(rewrite.stderr, G11_HEADER), rewrite.stderr).toBeGreaterThanOrEqual(0)
    expect(onOrigin(repo, 'refs/heads/main')).toBe(main)
    repo.gitOk(['switch', '--quiet', '001-demo'])
    repo.write('scripts/deploy.ts', fileWithToken(14))
    commitSkippingHooks(repo, 'feat(001): call the API')
    const secret = repo.git(['push', 'origin', 'HEAD:main'])
    expect(secret.status).not.toBe(0)
    expect(findLine(secret.stderr, g12Header(1, 1)), secret.stderr).toBeGreaterThanOrEqual(0)
    expect(onOrigin(repo, 'refs/heads/main')).toBe(main)
  })
})

describe('G11: a push that rewrites history', () => {
  function pushedThree(): { repo: ScratchRepo; remote: string } {
    const repo = repoWithPrePush()
    for (let n = 0; n < 3; n += 1) cleanCommit(repo)
    expect(repo.git(['push', '--set-upstream', 'origin', '001-demo']).status).toBe(0)
    return { repo, remote: onOrigin(repo, 'refs/heads/001-demo') }
  }

  test('G11 S2.3 FR-002 FR-016 blocks a push that would drop commits the remote branch already has', () => {
    const { repo, remote } = pushedThree()
    repo.gitOk(['reset', '--quiet', '--hard', 'HEAD~2'])
    cleanCommit(repo, 'docs(001): rewrite the notes')
    const result = repo.git(['push', '--force', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, g11('origin/001-demo', 2))
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe(remote)
  })

  test('G11 S2.3 FR-002 blocks a rewrite pushed with --force-with-lease', () => {
    const { repo, remote } = pushedThree()
    repo.gitOk(['commit', '--quiet', '--amend', '--no-verify', '-m', 'docs(001): reword the last commit'])
    const result = repo.git(['push', '--force-with-lease', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G11_HEADER, /^ {2}origin\/001-demo would lose 1 commits?\.$/])
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe(remote)
  })

  test('G11 S2.3 FR-002 blocks moving a tag the remote already has', () => {
    const { repo } = pushedThree()
    repo.gitOk(['tag', 'v1', 'HEAD~1'])
    expect(repo.git(['push', 'origin', 'v1']).status).toBe(0)
    repo.gitOk(['tag', '--force', 'v1', 'HEAD'])
    const result = repo.git(['push', '--force', 'origin', 'v1'])
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G11_HEADER), result.stderr).toBeGreaterThanOrEqual(0)
  })

  test("G11 S2.3 FR-002 blocks a push over a remote commit that hasn't been fetched, and says to fetch", () => {
    const { repo } = pushedThree()
    const other = repo.sandbox.path('other-clone')
    for (const args of [
      ['clone', '--quiet', slash(repo.origin), other],
      ['-C', other, 'switch', '--quiet', '001-demo'],
    ]) {
      expect(run('git', args, { cwd: repo.sandbox.root, env: repo.sandbox.env }).status).toBe(0)
    }
    const elsewhere = (args: readonly string[]) => run('git', ['-C', other, ...args], { cwd: repo.sandbox.root, env: repo.sandbox.env })
    expect(elsewhere(['commit', '--quiet', '--allow-empty', '-m', 'docs(001): a commit pushed from elsewhere']).status).toBe(0)
    expect(elsewhere(['push', '--quiet', 'origin', '001-demo']).status).toBe(0)
    const remote = onOrigin(repo, 'refs/heads/001-demo')
    cleanCommit(repo, 'docs(001): a commit made here')
    const result = repo.git(['push', '--force', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G11_HEADER), result.stderr).toBeGreaterThanOrEqual(0)
    expect(result.stderr).toMatch(/fetch/i)
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe(remote)
  })
})

describe('G12: an outgoing commit fails a check', () => {
  test('G12 S1.8 FR-009 FR-016 SC-002 blocks a push of commits that skipped the hooks, listing each failing commit', () => {
    const repo = repoWithPrePush()
    repo.write('docs/notes.md', textWithLineAt(22, 'About zorblax.'))
    const withTerm = commitSkippingHooks(repo, 'docs(001): add notes')
    repo.write('package.json', '{ "version": "0.0.2" }\n')
    const withAddress = commitSkippingHooks(repo, 'chore(001): bump a version', ['--author', 'Jo Example <jo.example@example.com>'])
    cleanCommit(repo, 'docs(001): add more notes')
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectFailingCommits(result, 2, 3, [
      new RegExp(`^ {2}${withTerm} {2}docs\\(001\\): add notes +private term at docs/notes\\.md:22$`),
      new RegExp(`^ {2}${withAddress} {2}chore\\(001\\): bump a version +author jo\\*\\*\\*@example\\.com not allowed$`),
    ])
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe('')
    expectNoTerm(result)
    expect(result.stdout + result.stderr).not.toContain('jo.example@example.com')
  })

  test('G12 S1.8 FR-003 FR-009 blocks a skipped commit that holds a secret, without showing it', () => {
    const repo = repoWithPrePush()
    repo.write('scripts/deploy.ts', fileWithToken(14))
    const sha = commitSkippingHooks(repo, 'feat(001): call the API')
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectFailingCommits(result, 1, 1, [new RegExp(`^ {2}${sha} {2}.*scripts/deploy\\.ts:14`)])
    expect(result.stdout + result.stderr).not.toContain(FAKE_TOKEN)
  })

  test('G12 S1.8 FR-006 FR-009 SC-002 blocks a skipped commit whose message holds a term, without showing the subject', () => {
    const repo = repoWithPrePush()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const sha = commitSkippingHooks(repo, 'docs(001): the quixmoor notes')
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectFailingCommits(result, 1, 1, [new RegExp(`^ {2}${sha}\\b`)])
    expectNoTerm(result)
  })

  test("G12 S1.8 FR-008 FR-009 blocks a skipped commit whose committer or trailer address isn't allowed", () => {
    for (const make of [
      (repo: ScratchRepo) => {
        repo.write('docs/a.md', 'A.\n')
        repo.gitOk(['add', '--all'])
        repo.gitOk(['commit', '--quiet', '--no-verify', '-m', 'docs(001): add a'], {
          env: { GIT_COMMITTER_NAME: 'Ce Example', GIT_COMMITTER_EMAIL: 'ce.example@example.com' },
        })
        return { sha: repo.short(), shown: /committer ce\*\*\*@example\.com/ }
      },
      (repo: ScratchRepo) => {
        repo.write('docs/b.md', 'B.\n')
        const sha = commitSkippingHooks(repo, 'docs(001): add b\n\nCo-authored-by: Kay Example <ka.example@example.com>')
        return { sha, shown: /ka\*\*\*@example\.com/ }
      },
    ]) {
      const repo = repoWithPrePush()
      const { sha, shown } = make(repo)
      const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
      expect(result.status).not.toBe(0)
      expectFailingCommits(result, 1, 1, [new RegExp(`^ {2}${sha} {2}.*${shown.source}`)])
      expect(result.stdout + result.stderr).not.toMatch(/ce\.example@|ka\.example@/)
    }
  })

  test('G12 S1.8 FR-009 SC-002 checks the commits a tag push sends', () => {
    const repo = repoWithPrePush()
    repo.write('docs/notes.md', 'About zorblax.\n')
    const sha = commitSkippingHooks(repo, 'docs(001): add notes')
    repo.gitOk(['tag', 'v0.2.0'])
    const result = repo.git(['push', 'origin', 'v0.2.0'])
    expect(result.status).not.toBe(0)
    expectFailingCommits(result, 1, 1, [new RegExp(`^ {2}${sha} {2}docs\\(001\\): add notes +private term at docs/notes\\.md:1$`)])
    expect(onOrigin(repo, 'refs/tags/v0.2.0')).toBe('')
    expectNoTerm(result)
  })

  test('G12 S1.8 FR-009 blocks the whole push when one of its branches has a failing commit', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    repo.gitOk(['switch', '--quiet', '--create', '001-second', 'main'])
    repo.write('docs/notes.md', 'About zorblax.\n')
    commitSkippingHooks(repo, 'docs(001): add notes')
    const result = repo.git(['push', 'origin', '001-demo', '001-second'])
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, g12Header(1, 2)), result.stderr).toBeGreaterThanOrEqual(0)
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe('')
    expect(onOrigin(repo, 'refs/heads/001-second')).toBe('')
    expectNoTerm(result)
  })
})

describe('G13: a private term in a branch or tag name', () => {
  test('G13 S1.11 FR-006 FR-016 SC-002 blocks a branch whose name holds a private term, without showing the name', () => {
    const repo = repoWithPrePush()
    repo.gitOk(['switch', '--quiet', '--create', 'feature/zorblax-notes'])
    cleanCommit(repo)
    const result = repo.git(['push', '--set-upstream', 'origin', 'HEAD'])
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, G13)
    expectNoTerm(result)
    expect(onOrigin(repo, 'refs/heads/feature/zorblax-notes')).toBe('')
  })

  test('G13 S1.11 FR-006 SC-002 blocks a push to a remote branch whose name holds a term', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    const result = repo.git(['push', 'origin', 'HEAD:refs/heads/notes-Quixmoor'])
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G13[0] ?? ''), result.stderr).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })

  test('G13 S1.11 FR-006 SC-002 blocks a tag whose name holds a private term', () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    expect(repo.git(['push', '--set-upstream', 'origin', '001-demo']).status).toBe(0)
    repo.gitOk(['tag', 'v1-zorblax'])
    const result = repo.git(['push', 'origin', 'v1-zorblax'])
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, /^✖ pre-push {2}private term in a tag(?:'s)? name$/), result.stderr).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })
})

describe('S3 and S4: a check that cannot run', () => {
  test('S3 S1.6 FR-007 FR-016 pre-push blocks while the private-term list has no setting', () => {
    const repo = repoWithPrePush({ terms: false })
    cleanCommit(repo)
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, ['✖ pre-push  private-term list not found', S3_FIX])
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe('')
  })

  test("S3 S1.6 FR-007 pre-push blocks when the list's file is missing, can't be read or holds no terms", () => {
    for (const [problem, prepare, header] of [
      [
        'missing',
        (box: Sandbox) => box.setGlobal('bradthome.privateTerms', slash(box.path('no-such-list.txt'))),
        /^✖ pre-push {2}private-term list not found$/,
      ],
      [
        'unreadable',
        (box: Sandbox) => {
          mkdirSync(box.path('a-folder-not-a-file'))
          box.setGlobal('bradthome.privateTerms', slash(box.path('a-folder-not-a-file')))
        },
        /^✖ pre-push {2}private-term list/,
      ],
      ['empty', (box: Sandbox) => writeFileSync(box.termsFile, EMPTY_LIST), /^✖ pre-push {2}private-term list is empty$/],
    ] as const) {
      const repo = repoWithPrePush()
      prepare(repo.sandbox)
      cleanCommit(repo)
      const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'])
      expect(result.status, problem).not.toBe(0)
      expect(findLine(result.stderr, header), `${problem}\n${result.stderr}`).toBeGreaterThanOrEqual(0)
      expect(onOrigin(repo, 'refs/heads/001-demo'), problem).toBe('')
    }
  })

  test("S4 S1.7 FR-007 FR-016 pre-push blocks while gitleaks isn't installed", () => {
    const repo = repoWithPrePush()
    cleanCommit(repo)
    const result = repo.git(['push', '--set-upstream', 'origin', '001-demo'], {
      env: withoutOnPath(repo.sandbox, 'gitleaks'),
    })
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, ['✖ pre-push  gitleaks not installed', S4_FIX])
    expect(onOrigin(repo, 'refs/heads/001-demo')).toBe('')
  })
})
