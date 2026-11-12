import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Spec 033's FR-010: the plan shows slice 5.9, the log holds D216–D218 and
// D220 with D165's and D169's amendments, the specs this slice amends say so,
// the runbook explains the placeholders, and the README is the one D216 chose,
// naming the release that's live.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

const RECORDS = {
  '0216': '0216-the-readme-describes-the-live-site.md',
  '0217': '0217-bradthome-com-gets-a-small-card-with-build-time-counts.md',
  '0218': '0218-the-design-system-gallery-is-linked-from-one-receipt.md',
  '0220': '0220-the-answer-that-writes-the-cache-may-cost-up-to-a-cent.md',
}

describe('the docs (FR-010)', () => {
  test("FR-010 the plan shows slice 5.9's state, and the log holds D216–D218 and D220", () => {
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.9 How bradthome\.com is built \|[^\n]*spec 033[^\n]*D216[^\n]*D217[^\n]*D218[^\n]*D220/)
    const files = readdirSync(path.join(ROOT, 'docs', 'decisions'))
    const log = read('docs', 'decisions', 'README.md')
    for (const [id, file] of Object.entries(RECORDS)) {
      expect(files, file).toContain(file)
      expect(log, id).toContain(`[${id}](${file})`)
      const record = read('docs', 'decisions', file)
      expect(record, file).toMatch(new RegExp(`^---\\nstatus: accepted\\ndate: 2026-11-11\\n[\\s\\S]*\\nlog-id: D${Number(id)}\\n---`))
      expect(record, file).toContain('specs/033-site-build-story/spec.md')
    }
  })

  test('FR-010 D218 amends D165, and D165 says so', () => {
    expect(read('docs', 'decisions', RECORDS['0218'])).toContain('[D165](0165-the-design-system-gallery-goes-live-unlinked.md)')
    expect(read('docs', 'decisions', '0165-the-design-system-gallery-goes-live-unlinked.md')).toContain(`Amended by [D218](${RECORDS['0218']})`)
  })

  test('FR-010 FR-011 D220 amends D169, and D169 says so', () => {
    expect(read('docs', 'decisions', RECORDS['0220'])).toContain('[D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)')
    expect(read('docs', 'decisions', '0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md')).toContain(`Amended by [D220](${RECORDS['0220']})`)
  })

  test('FR-010 each spec this slice amends says how, and the runbook explains the placeholders', () => {
    for (const spec of ['009-design-system', '013-side-projects', '015-resume-pdfs', '016-link-previews', '023-evals', '026-landing-a2'])
      expect(read('specs', spec, 'spec.md'), spec).toMatch(/Changed in spec 033 \(slice 5\.9\), on 2026-11-11/)
    expect(read('docs', 'release.md')).toMatch(/marked `data-record` \(spec 033\), as placeholders/)
  })

  test("FR-010 the README is D216's: the live site, its stack, the loop, where to look, and no word on the suspension", () => {
    const readme = read('README.md')
    for (const heading of ["## What's live", "## What it's built with", '## How a change is made', '## Where to look'])
      expect(readme).toContain(heading)
    expect(readme).toMatch(/Brad approves the spec and its plan before any code is written/)
    expect(readme).toMatch(/Nothing reaches `main` until Brad says push/)
    expect(readme).not.toMatch(/suspend|bradthome-agent|v0, a one-day prototype/i)
    for (const link of ['docs/decisions/README.md', 'specs/', 'docs/releases/', 'https://bradthome.com/evals']) expect(readme).toContain(`](${link})`)
  })

  test('FR-010 the README names the release that is live, and the runbook says to keep it so (D216)', () => {
    // The newest release record is the version live, so a release that adds its record without
    // the README's "What's live" line, as v2.6.0 did before this check, fails here.
    const versions = readdirSync(path.join(ROOT, 'docs', 'releases'))
      .map((file) => /^v(\d+)\.(\d+)\.(\d+)\.md$/.exec(file))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 4).map(Number))
      .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0) || (a[2] ?? 0) - (b[2] ?? 0))
    const [major, minor, patch] = versions.at(-1) ?? []
    expect(major, 'a release record').toBeDefined()
    expect(read('README.md')).toMatch(new RegExp(`\\nbradthome\\.com serves v${major}\\.${minor}(?:\\.${patch})?, released on \\d{4}-\\d{2}-\\d{2}\\.\\n`))
    expect(read('docs', 'release.md')).toMatch(/update the README's "What's live" line/)
  })
})
