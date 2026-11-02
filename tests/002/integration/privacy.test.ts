import { describe, expect, test } from 'vitest'
import { expectBlock, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import { textWithLineAt } from '../../001/helpers/repo.ts'
import { describeRun, filledLines, type RunResult } from '../../001/helpers/run.ts'
import { EMPTY_LIST, expectNoTerm } from '../../001/helpers/terms.ts'
import {
  ciRepos,
  commitFiles,
  DEPENDABOT,
  DEPENDABOT_LOGIN,
  pullRequestEnv,
  pushEnv,
  runCi,
  short,
  withTerms,
} from '../helpers/ci-repo.ts'
import { K3_HEADER, K3_PLACE, K3_TAIL, K4_HEADER, K4_TAIL, K6, PASS } from '../helpers/messages.ts'
import { CI } from '../helpers/paths.ts'

// The privacy job's script, run in scratch repos with the event file GitHub
// gives it, and the made-up list in PRIVATE_TERMS the way the secret reaches
// the step. The sandbox has no term setting, so the job can only read the
// secret.

const scratch = ciRepos()

const UNMASKED = 'jordan.pike@example.com'

/** The lines between a block's header and the start of its tail. */
function placesIn(result: RunResult, header: string, tailStart: string): string[] {
  const lines = filledLines(result.stdout)
  const start = lines.indexOf(header)
  const end = lines.indexOf(tailStart, start)
  expect(start, result.stdout).toBeGreaterThanOrEqual(0)
  expect(end, result.stdout).toBeGreaterThan(start)
  return lines.slice(start + 1, end)
}

function expectClean(result: RunResult): void {
  expect(result.status, describeRun(result)).toBe(0)
  expectOneLine(result.stdout, PASS.privacy)
  expectNoTerm(result)
}

describe('a clean pull request', () => {
  test('S2.1 FR-005 FR-006 passes in one line when nothing holds a term or a bad address', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': textWithLineAt(3, 'Ordinary words only.') })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes', body: 'Notes.' })))
    expectClean(result)
    expect(filledLines(result.stdout)).toHaveLength(1)
  })

  test('S2.1 FR-005 passes with an empty description, which GitHub sends as null', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    expectClean(runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes', body: null }))))
  })

  test("S2.1 FR-005 scans only the pull request: a term already on main isn't this pull request's", () => {
    const repo = scratch({ seed: { 'docs/old.md': 'An old zorblax note.\n' } })
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    expectClean(runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' }))))
  })
})

describe('K3: a private term in the pull request', () => {
  test("S2.1 FR-005 FR-020 SC-003 K3 names a changed line's file and line, never the term, in the mock's words", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': textWithLineAt(22, 'We met at the Zorblax office.') })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.file('docs/notes.md', 22), ...K3_TAIL])
    expectNoTerm(result)
  })

  test('S2.1 FR-005 FR-020 SC-003 K3 finds a term in every place it can hide, in any letter case, and names each place', () => {
    const repo = scratch({ branch: 'docs/QUIXMOOR-notes' })
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': textWithLineAt(5, 'see VELLUM  kestrel') })
    const sha = commitFiles(repo, 'docs(002): tidy the notes\n\nA second line.\nMet zorBLAX there.\n', { 'docs/more.md': 'More.\n' })
    const result = runCi(
      repo,
      CI.privacy,
      withTerms(pullRequestEnv(repo, { title: 'docs(002): notes from Quixmoor', body: 'Why:\n\nThe zorblax notes.\n' })),
    )
    expect(result.status, describeRun(result)).not.toBe(0)
    const places = placesIn(result, K3_HEADER, K3_TAIL[0] ?? '')
    expect(places).toContain(K3_PLACE.file('docs/notes.md', 5))
    expect(places).toContain(K3_PLACE.message(short(sha), 4))
    expect(places).toContain(K3_PLACE.branch)
    expect(places.some((line) => K3_PLACE.title.test(line)), places.join('\n')).toBe(true)
    expect(places.some((line) => K3_PLACE.description.test(line)), places.join('\n')).toBe(true)
    expectBlock(result.stdout, K3_TAIL)
    expectNoTerm(result)
  })

  test('S2.1 FR-005 K3 finds the made-up digits in any format', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add a contact', { 'docs/contact.md': textWithLineAt(2, 'Call (555) 555-0147.') })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add a contact' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.file('docs/contact.md', 2)])
    expectNoTerm(result)
  })

  test('S2.1 FR-005 FR-020 SC-003 K3 finds a term in a changed path without showing the path', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/zorblax-trip.md': 'Ordinary words only.\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, K3_HEADER), result.stdout).toBeGreaterThanOrEqual(0)
    expectNoTerm(result)
  })

  test('S2.1 FR-005 K3 checks every commit, so a term added and then removed on the branch is still found', () => {
    const repo = scratch()
    const added = commitFiles(repo, 'docs(002): add notes\n\nFrom quixmoor.\n', { 'docs/notes.md': 'Notes.\n' })
    commitFiles(repo, 'docs(002): tidy the notes', { 'docs/notes.md': 'Tidy notes.\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.message(short(added), 3)])
    expectNoTerm(result)
  })

  test('FR-001 FR-005 K3 a push to main scans the pushed commits the same way', () => {
    const repo = scratch()
    const before = repo.gitOk(['rev-parse', 'origin/main'])
    repo.gitOk(['switch', '--quiet', 'main'])
    const after = commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': textWithLineAt(4, 'Zorblax again.') })
    const result = runCi(repo, CI.privacy, withTerms(pushEnv(repo, { before, after })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.file('docs/notes.md', 4)])
    expectNoTerm(result)
  })
})

describe('K4: an address that is not allowed', () => {
  test("S2.2 FR-006 FR-020 SC-003 K4 shows an author's address masked, in the mock's words", () => {
    const repo = scratch()
    const sha = commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' }, { author: { name: 'Jordan', email: UNMASKED } })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K4_HEADER, new RegExp(`^ {2}${short(sha)} {2}author +jo\\*\\*\\*@example\\.com$`), ...K4_TAIL])
    expect(result.stdout).not.toContain(UNMASKED)
  })

  test('S2.2 FR-006 SC-003 K4 checks committers and trailers too, each masked', () => {
    const repo = scratch()
    const committed = commitFiles(repo, 'docs(002): add notes', { 'docs/a.md': 'A.\n' }, {
      author: { name: 'Test Agent', email: '1234567+test-agent@users.noreply.github.com' },
      committer: { name: 'Jordan', email: UNMASKED },
    })
    const trailer = commitFiles(repo, 'docs(002): add more notes\n\nCo-Authored-By: Sam <sam.reyes@example.org>\n', { 'docs/b.md': 'B.\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = placesIn(result, K4_HEADER, K4_TAIL[0] ?? '')
    expect(lines.some((line) => new RegExp(`^ {2}${short(committed)} {2}committer +jo\\*\\*\\*@example\\.com$`).test(line)), lines.join('\n')).toBe(true)
    expect(lines.some((line) => new RegExp(`^ {2}${short(trailer)} {2}trailer +sa\\*\\*\\*@example\\.org$`).test(line)), lines.join('\n')).toBe(true)
    expect(result.stdout).not.toContain(UNMASKED)
    expect(result.stdout).not.toContain('sam.reyes@example.org')
  })

  test("S2.2 FR-006 allows noreply addresses, brad@bradthome.com, and Claude's co-author trailer", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n', { 'docs/a.md': 'A.\n' }, {
      author: { name: 'Brad Thome', email: 'brad@bradthome.com' },
      committer: { name: 'GitHub', email: 'noreply@github.com' },
    })
    expectClean(runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' }))))
  })
})

describe('K6: the list cannot be read', () => {
  test("S2.4 FR-007 K6 a missing secret fails the job with the setup step, in the mock's words", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    const result = runCi(repo, CI.privacy, pullRequestEnv(repo, { title: 'docs(002): add notes' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, K6)
  })

  test("S2.4 FR-007 K6 an empty secret, which is what a missing one reads as in Actions, fails the same way", () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Notes.\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' }), ''))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, K6)
  })

  test('S2.4 FR-007 K6 a list with nothing but comments fails too, and never passes by scanning nothing', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes', { 'docs/notes.md': 'Zorblax.\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): add notes' }), EMPTY_LIST))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, K6)
    expectNoTerm(result)
  })
})

describe("D1: Dependabot's pull requests", () => {
  function dependabotRepo(files: Record<string, string>) {
    const repo = scratch({ branch: 'dependabot/npm_and_yarn/dev-dependencies-1a2b3c4d5e' })
    commitFiles(repo, 'build(deps-dev): bump the dev-dependencies group with 3 updates', files, { author: DEPENDABOT, committer: DEPENDABOT })
    return repo
  }
  const title = 'build(deps-dev): bump the dev-dependencies group with 3 updates'

  test("S2.5 FR-008 D1 a Dependabot pull request is scanned with Dependabot's copy of the secret, and passes when clean", () => {
    const repo = dependabotRepo({ 'package.json': '{ "devDependencies": { "yaml": "2.9.2" } }\n' })
    expectClean(runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title, user: DEPENDABOT_LOGIN, body: 'Bumps the group.' }))))
  })

  test('S2.5 FR-005 D1 a term in a Dependabot pull request fails it, as for any pull request', () => {
    const repo = dependabotRepo({ 'docs/changelog.md': textWithLineAt(3, 'Thanks to quixmoor.') })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title, user: DEPENDABOT_LOGIN })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.file('docs/changelog.md', 3)])
    expectNoTerm(result)
  })

  test("S2.4 S2.5 FR-007 D1 a Dependabot run without its copy of the secret fails with K6, with no exemption", () => {
    const repo = dependabotRepo({ 'package.json': '{}\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title, user: DEPENDABOT_LOGIN }), ''))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, K6)
  })
})

describe('the list stays out of the repo and the log', () => {
  test('FR-008 FR-020 SC-003 the job writes nothing into the checkout, and prints no term even when it finds them all', () => {
    const repo = scratch()
    commitFiles(repo, 'docs(002): add notes\n\nzorblax quixmoor\n', { 'docs/notes.md': 'zorblax, Quixmoor, vellum kestrel, 5555550147\n' })
    const result = runCi(repo, CI.privacy, withTerms(pullRequestEnv(repo, { title: 'docs(002): zorblax', body: 'Quixmoor' })))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K3_HEADER, K3_PLACE.file('docs/notes.md', 1)])
    expectNoTerm(result)
    expect(repo.gitOk(['status', '--porcelain', '--ignored', '--untracked-files=all'])).toBe('')
  })
})
