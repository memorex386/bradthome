import { mkdirSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  expectBlock,
  expectInOrder,
  findLine,
  G1,
  G2_HEADER,
  G2_TAIL,
  G3_HEADER,
  G3_TAIL,
  G4_HEADER,
  G4_TAIL,
  g5,
  G5_HEADER,
  G6_FIX,
  G6_HEADER,
  g6Line,
  PASS,
  S3_FIX,
  S3_PRE_COMMIT,
  S4_PRE_COMMIT,
} from '../helpers/messages.ts'
import { SCRIPTS, slash } from '../helpers/paths.ts'
import { commitAll, textWithLineAt } from '../helpers/repo.ts'
import { describeRun, filledLines, runNode } from '../helpers/run.ts'
import { setEnv, withoutOnPath } from '../helpers/sandbox.ts'
import {
  copiesSeed,
  FAKE_TOKEN,
  fileWithToken,
  LOCK_FILE,
  LOCKED_SPEC,
  LOCKED_TEST,
  lockedSeed,
  scratchRepos,
  SKILL_COPY,
  SKILL_SOURCE,
  SPEC_KIT_SKILL,
  SPEC_OVERRIDE,
  SPEC_TEMPLATE,
} from '../helpers/seeds.ts'
import { EMPTY_LIST, expectNoTerm } from '../helpers/terms.ts'

// pre-commit, run by real git in scratch repos whose origin is a local bare
// repo. Messages go to stderr.

const scratch = scratchRepos()

describe('G0: a clean commit', () => {
  test('G0 S1.9 FR-016 a clean commit passes, and each commit hook prints one line naming what it checked', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status, describeRun(result)).toBe(0)
    const lines = filledLines(result.stderr)
    expect(lines, result.stderr).toHaveLength(2)
    expect(lines[0]).toMatch(PASS.preCommit)
    expect(lines[1]).toMatch(PASS.commitMsg)
  })

  test('G0 S1.9 FR-005 a term inside a longer word passes', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'zorblaxian\nprezorblax\nzorblax_v2\nquixmoorland\norder 95555550147\n')
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status, describeRun(result)).toBe(0)
    expect(filledLines(result.stderr)[0]).toMatch(PASS.preCommit)
  })

  test("G0 FR-004 a word that's only in the list's comments isn't a term", () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'A quaggle is fine.\n')
    expect(commitAll(repo, 'docs(001): add notes').status).toBe(0)
  })

  test("G0 FR-006 binary files aren't scanned for terms", () => {
    const repo = scratch()
    repo.write('docs/picture.bin', new Uint8Array([0, 1, 2, 0, ...Buffer.from('zorblax'), 0, 255]))
    const result = commitAll(repo, 'docs(001): add a picture')
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('G1: a commit on main', () => {
  test('G1 S2.1 FR-001 FR-016 blocks a commit on main and leaves the changes staged', () => {
    const repo = scratch({ repo: { branch: false } })
    const before = repo.gitOk(['rev-parse', 'HEAD'])
    repo.write('docs/typo.md', 'A fixed typo.\n')
    repo.gitOk(['add', 'docs/typo.md'])
    const result = repo.git(['commit', '-m', 'docs(repo): fix a typo'])
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, G1)
    expect(repo.gitOk(['rev-parse', 'HEAD'])).toBe(before)
    expect(repo.gitOk(['diff', '--cached', '--name-only'])).toBe('docs/typo.md')
  })

  test('G1 S2.1 FR-001 SC-002 a commit on main stops first, before any other check', () => {
    const repo = scratch({ repo: { branch: false } })
    repo.write('docs/notes.md', 'About zorblax.\n')
    const result = commitAll(repo, 'docs(repo): add notes')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, G1)
    expect(findLine(result.stderr, G3_HEADER)).toBe(-1)
    expectNoTerm(result)
  })

  test("S2.1 FR-001 a commit on a detached HEAD isn't blocked", () => {
    const repo = scratch()
    repo.gitOk(['switch', '--quiet', '--detach'])
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('G2: a possible secret', () => {
  test('G2 S1.1 FR-003 FR-016 SC-002 blocks a staged secret, naming the file, line and rule with the value redacted', () => {
    const repo = scratch()
    repo.write('scripts/deploy.ts', fileWithToken(14))
    const result = commitAll(repo, 'feat(001): call the API')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G2_HEADER, /^ {2}scripts\/deploy\.ts:14 {2}rule [\w-]+ {2}value REDACTED$/])
    expectBlock(result.stderr, G2_TAIL)
    expect(result.stdout + result.stderr).not.toContain(FAKE_TOKEN)
    expect(result.stdout + result.stderr).not.toContain(FAKE_TOKEN.slice(4, 20))
  })

  test("G0 S1.1 FR-003 a secret that isn't staged doesn't block", () => {
    const repo = scratch()
    repo.write('scripts/deploy.ts', fileWithToken(3))
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    repo.gitOk(['add', 'docs/notes.md'])
    const result = repo.git(['commit', '-m', 'docs(001): add notes'])
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('G3: a private term in a change', () => {
  test("G3 S1.2 FR-005 FR-016 SC-002 blocks a staged private term in any letter case, naming the file and line but not the term", () => {
    const repo = scratch()
    for (const line of ['Notes about ZORBLAX.', 'Notes about Zorblax.', 'Notes about quixmoor.', 'The Vellum   Kestrel plan.']) {
      repo.write('docs/notes.md', textWithLineAt(22, line))
      const result = commitAll(repo, 'docs(001): add setup notes')
      expect(result.status, line).not.toBe(0)
      expectBlock(result.stderr, [G3_HEADER, '  docs/notes.md:22', ...G3_TAIL])
      expectNoTerm(result)
    }
  })

  test('G3 S1.10 FR-005 SC-002 blocks a phone number listed as digits, in any format', () => {
    const repo = scratch()
    for (const number of ['5555550147', '555-555-0147', '(555) 555-0147', '555.555.0147', '[555] 555 0147', '+1 555 555 0147']) {
      repo.write('docs/contact.md', textWithLineAt(5, `Call ${number} after six.`))
      const result = commitAll(repo, 'docs(001): add contact notes')
      expect(result.status, number).not.toBe(0)
      expectBlock(result.stderr, [G3_HEADER, '  docs/contact.md:5', ...G3_TAIL])
      expectNoTerm(result)
    }
  })

  test('G3 S1.2 FR-006 FR-016 SC-002 blocks a file whose path holds a term, without showing the path', () => {
    const repo = scratch()
    repo.write('docs/zorblax-notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G3_HEADER)).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })

  test('G3 S1.2 FR-016 SC-002 reports each file and line that holds a term', () => {
    const repo = scratch()
    repo.write('docs/a.md', textWithLineAt(3, 'zorblax'))
    repo.write('docs/b.md', textWithLineAt(5, 'quixmoor'))
    const result = commitAll(repo, 'docs(001): add notes')
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('docs/a.md:3')
    expect(result.stderr).toContain('docs/b.md:5')
    expectBlock(result.stderr, G3_TAIL)
    expectNoTerm(result)
  })

  test('G3 S1.2 FR-004 SC-002 PRIVATE_TERMS takes the place of the setting', () => {
    const repo = scratch()
    const env = { ...repo.sandbox.env }
    setEnv(env, 'PRIVATE_TERMS', 'snorkelwick\n')
    repo.write('docs/notes.md', 'About snorkelwick.\n')
    const blocked = commitAll(repo, 'docs(001): add notes', { env })
    expect(blocked.status).not.toBe(0)
    expectBlock(blocked.stderr, [G3_HEADER, '  docs/notes.md:1', ...G3_TAIL])
    expect((blocked.stdout + blocked.stderr).toLowerCase()).not.toContain('snorkelwick')
    repo.write('docs/notes.md', 'About zorblax, which only the file lists.\n')
    const passed = commitAll(repo, 'docs(001): add notes', { env })
    expect(passed.status, describeRun(passed)).toBe(0)
  })
})

describe('G4: an author or committer address that is not allowed', () => {
  test('G4 S1.4 FR-008 FR-016 SC-002 blocks an author address that is not allowed, and masks it', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const env = { GIT_AUTHOR_NAME: 'Jo Example', GIT_AUTHOR_EMAIL: 'jo.example@example.com' }
    const result = commitAll(repo, 'feat(001): add the setup check', { env })
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, [G4_HEADER, '  author     jo***@example.com', ...G4_TAIL])
    expect(result.stdout + result.stderr).not.toContain('jo.example@example.com')
  })

  test('G4 S1.4 FR-008 blocks a committer address that is not allowed', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const env = { GIT_COMMITTER_NAME: 'Ce Example', GIT_COMMITTER_EMAIL: 'ce.example@example.com' }
    const result = commitAll(repo, 'feat(001): add the setup check', { env })
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G4_HEADER, /^ {2}committer +ce\*\*\*@example\.com$/, ...G4_TAIL])
    expect(result.stdout + result.stderr).not.toContain('ce.example@example.com')
  })

  test("G4 S1.4 FR-008 blocks a fresh clone's commits until its identity is set", () => {
    const repo = scratch()
    repo.gitOk(['config', 'user.email', 'jo.example@example.com'])
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the setup check')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G4_HEADER, /jo\*\*\*@example\.com/, ...G4_TAIL])
    expect(result.stdout + result.stderr).not.toContain('jo.example@example.com')
  })

  test('G0 S1.4 FR-008 allows brad@bradthome.com and GitHub noreply addresses', () => {
    const repo = scratch()
    for (const [n, email] of ['brad@bradthome.com', '350475588+bradthome-agent@users.noreply.github.com'].entries()) {
      repo.write('docs/notes.md', `Ordinary notes, take ${n + 1}.\n`)
      const result = commitAll(repo, 'docs(001): add notes', { env: { GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_EMAIL: email } })
      expect(result.status, `${email}\n${describeRun(result)}`).toBe(0)
    }
  })

  test('G4 S1.4 FR-008 SC-002 hides a masked address that still holds a term', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the setup check', { env: { GIT_AUTHOR_EMAIL: 'jo@zorblax.example' } })
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G4_HEADER)).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })
})

describe('G5: a locked test changed without its spec', () => {
  test("G5 S3.1 FR-011 FR-016 blocks a change to a locked test when the branch doesn't change its spec", () => {
    const repo = scratch({ repo: { seed: lockedSeed() } })
    repo.write(LOCKED_TEST, 'export const demo = 2\n')
    const result = commitAll(repo, 'test(001): loosen a check')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, g5(LOCKED_TEST, '001', LOCKED_SPEC))
  })

  test('G0 S3.2 FR-011 lets a locked test change when the branch also changes its spec', () => {
    const repo = scratch({ repo: { seed: lockedSeed() } })
    repo.write(LOCKED_SPEC, '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works better.\n')
    repo.write(LOCKED_TEST, 'export const demo = 2\n')
    const result = commitAll(repo, 'test(001): follow the changed scenario')
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('G0 S3.2 FR-011 lets a locked test change after an earlier commit on the branch changed its spec', () => {
    const repo = scratch({ repo: { seed: lockedSeed() } })
    repo.write(LOCKED_SPEC, '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works better.\n')
    expect(commitAll(repo, 'docs(001): change the scenario').status).toBe(0)
    repo.write(LOCKED_TEST, 'export const demo = 2\n')
    const result = commitAll(repo, 'test(001): follow the changed scenario')
    expect(result.status, describeRun(result)).toBe(0)
  })

  test("G5 S3.3 FR-011 FR-016 blocks a change to a tests.lock when the branch doesn't change its spec", () => {
    const repo = scratch({ repo: { seed: lockedSeed() } })
    repo.write(LOCK_FILE, `${'0'.repeat(64)}  ${LOCKED_TEST}\n`)
    const result = commitAll(repo, 'test(001): relock the tests')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, [G5_HEADER, /specs\/001-demo\/tests\.lock/, /^ {2}Fix: .*specs\/001-demo\/spec\.md/])
  })

  test('G0 FR-011 a test that no tests.lock lists changes freely', () => {
    const repo = scratch({ repo: { seed: lockedSeed() } })
    repo.write('tests/001/unit/other.test.ts', 'export const other = 1\n')
    const result = commitAll(repo, 'test(001): add another test')
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('G6: copies out of date', () => {
  test('G6 S7.2 FR-014 FR-016 blocks a skill copy that differs from its source', () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SKILL_SOURCE, `${repo.read(SKILL_SOURCE)}Ask one question at a time.\n`)
    const result = commitAll(repo, 'docs(001): tighten the interview skill')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, [G6_HEADER, g6Line(SKILL_COPY, SKILL_SOURCE), G6_FIX])
  })

  test('G6 S7.2 FR-014 blocks an edited copy too', () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SKILL_COPY, `${repo.read(SKILL_COPY)}An edit made to the copy.\n`)
    const result = commitAll(repo, 'docs(001): edit the copy')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, [G6_HEADER, g6Line(SKILL_COPY, SKILL_SOURCE), G6_FIX])
  })

  test('G6 S7.3 FR-014 blocks a template override that differs from docs/templates, and the sync makes them identical', () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SPEC_TEMPLATE, '# Spec NNN: [Name]\n\n## Summary\n')
    const blocked = commitAll(repo, 'docs(001): add a summary to the spec template')
    expect(blocked.status).not.toBe(0)
    expectBlock(blocked.stderr, [G6_HEADER, g6Line(SPEC_OVERRIDE, SPEC_TEMPLATE), G6_FIX])
    const sync = runNode(SCRIPTS.sync, [], { cwd: repo.dir, env: repo.sandbox.env })
    expect(sync.status, describeRun(sync)).toBe(0)
    expect(repo.read(SPEC_OVERRIDE)).toBe(repo.read(SPEC_TEMPLATE))
    const passed = commitAll(repo, 'docs(001): add a summary to the spec template')
    expect(passed.status, describeRun(passed)).toBe(0)
  })

  test("G6 S7.2 S7.3 FR-014 compares what's staged, so a synced copy that isn't staged still blocks", () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SKILL_SOURCE, `${repo.read(SKILL_SOURCE)}Ask one question at a time.\n`)
    expect(runNode(SCRIPTS.sync, [], { cwd: repo.dir, env: repo.sandbox.env }).status).toBe(0)
    repo.gitOk(['add', SKILL_SOURCE])
    const blocked = repo.git(['commit', '-m', 'docs(001): tighten the interview skill'])
    expect(blocked.status).not.toBe(0)
    expectBlock(blocked.stderr, [G6_HEADER, g6Line(SKILL_COPY, SKILL_SOURCE), G6_FIX])
    repo.gitOk(['add', SKILL_COPY])
    const passed = repo.git(['commit', '-m', 'docs(001): tighten the interview skill'])
    expect(passed.status, describeRun(passed)).toBe(0)
  })

  test('G6 S7.2 S7.3 FR-014 FR-016 lists every copy that is out of date', () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SKILL_SOURCE, `${repo.read(SKILL_SOURCE)}Ask one question at a time.\n`)
    repo.write(SPEC_TEMPLATE, '# Spec NNN: [Name]\n\n## Summary\n')
    const result = commitAll(repo, 'docs(001): tighten the interview skill')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, [G6_HEADER, g6Line(SKILL_COPY, SKILL_SOURCE), g6Line(SPEC_OVERRIDE, SPEC_TEMPLATE), G6_FIX])
  })

  test("G0 S7.1 FR-014 Spec Kit's own speckit-* skills have no source here, so they're not flagged", () => {
    const repo = scratch({ repo: { seed: copiesSeed() } })
    repo.write(SPEC_KIT_SKILL, `${repo.read(SPEC_KIT_SKILL)}Spec Kit rewrote this.\n`)
    const result = commitAll(repo, 'chore(001): update Spec Kit')
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('S3: the private-term list is missing or empty', () => {
  test('S3 S1.6 FR-007 FR-016 blocks every commit while the list has no setting, before any other check', () => {
    const repo = scratch({ sandbox: { terms: false } })
    repo.write('scripts/deploy.ts', fileWithToken(4))
    const result = commitAll(repo, 'feat(001): add the lock script')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, S3_PRE_COMMIT)
    expect(findLine(result.stderr, G2_HEADER)).toBe(-1)
  })

  test('S3 S1.6 FR-007 blocks when the setting names a file that is missing', () => {
    const repo = scratch({ sandbox: { terms: false } })
    repo.sandbox.setGlobal('bradthome.privateTerms', slash(repo.sandbox.path('no-such-list.txt')))
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the lock script')
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, S3_PRE_COMMIT)
  })

  test("S3 S1.6 FR-007 blocks when the list can't be read", () => {
    const repo = scratch({ sandbox: { terms: false } })
    const folder = repo.sandbox.path('a-folder-not-a-file')
    mkdirSync(folder)
    repo.sandbox.setGlobal('bradthome.privateTerms', slash(folder))
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the lock script')
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, /^✖ pre-commit {2}private-term list/)).toBeGreaterThanOrEqual(0)
    expect(repo.gitOk(['log', '--format=%s', '-1'])).toBe('chore(repo): start the scratch repo')
  })

  test('S3 S1.6 FR-007 blocks when the list holds no terms', () => {
    const repo = scratch({ sandbox: { terms: EMPTY_LIST } })
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the lock script')
    expect(result.status).not.toBe(0)
    expectInOrder(result.stderr, ['✖ pre-commit  private-term list is empty', S3_FIX])
  })

  test('S3 S1.6 FR-004 FR-007 an empty PRIVATE_TERMS blocks, even when the setting names a list', () => {
    const repo = scratch()
    const env = { ...repo.sandbox.env }
    setEnv(env, 'PRIVATE_TERMS', '')
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const result = commitAll(repo, 'feat(001): add the lock script', { env })
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, '✖ pre-commit  private-term list is empty')).toBeGreaterThanOrEqual(0)
  })
})

describe('S4: gitleaks is not installed', () => {
  test('S4 S1.7 FR-007 FR-016 blocks every commit while gitleaks is not installed', () => {
    const repo = scratch()
    repo.write('docs/notes.md', 'Ordinary notes.\n')
    const env = withoutOnPath(repo.sandbox, 'gitleaks')
    const result = commitAll(repo, 'feat(001): add the lock script', { env })
    expect(result.status).not.toBe(0)
    expectBlock(result.stderr, S4_PRE_COMMIT)
  })
})

describe('several blocks at once', () => {
  test('FR-016 SC-002 shows every block when several checks fail', () => {
    const repo = scratch()
    repo.write('scripts/deploy.ts', fileWithToken(2))
    repo.write('docs/notes.md', 'About zorblax.\n')
    const result = commitAll(repo, 'feat(001): call the API')
    expect(result.status).not.toBe(0)
    expect(findLine(result.stderr, G2_HEADER)).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stderr, G3_HEADER)).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })
})
