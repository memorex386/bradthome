import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Spec 033's FR-010: the plan shows slice 5.8, the log holds D216–D218 with
// D165's amendment, the specs this slice amends say so, the runbook explains
// the placeholders, and the README is the one D216 chose.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

const RECORDS = {
  '0216': '0216-the-readme-describes-the-live-site.md',
  '0217': '0217-bradthome-com-gets-a-small-card-with-build-time-counts.md',
  '0218': '0218-the-design-system-gallery-is-linked-from-one-receipt.md',
}

describe('the docs (FR-010)', () => {
  test("FR-010 the plan shows slice 5.8's state, and the log holds D216–D218", () => {
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.8 How bradthome\.com is built \|[^\n]*spec 033[^\n]*D216[^\n]*D217[^\n]*D218/)
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

  test('FR-010 each spec this slice amends says how, and the runbook explains the placeholders', () => {
    for (const spec of ['013-side-projects', '015-resume-pdfs', '016-link-previews', '026-landing-a2'])
      expect(read('specs', spec, 'spec.md'), spec).toMatch(/Changed in spec 033 \(slice 5\.8\), on 2026-11-11/)
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
})
