import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { NEW_JOBS } from '../helpers/ci.ts'
import { GITHUB, repoPath } from '../helpers/paths.ts'

// AGENTS.md and the pull request template name the new checks, the preview
// and pnpm test:visual (FR-022, FR-023). Spec 002's locked docs test keeps the
// Checks section's hand-run list to the three commands CI doesn't cover, so
// pnpm test:visual goes in Setup. That test reads a list item starting with a
// backticked name as a hand-run command, so the new jobs are named in bold or
// plain text, as **ci / types** is.

/** A Markdown section: from its heading to the next heading of the same level. */
function section(text: string, heading: string): string {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === heading)
  expect(start, heading).toBeGreaterThanOrEqual(0)
  const level = /^#+/.exec(heading)?.[0].length ?? 2
  const end = lines.findIndex((line, index) => index > start && new RegExp(`^#{1,${level}} `).test(line))
  return lines.slice(start, end < 0 ? undefined : end).join('\n')
}

const agents = (): string => readFileSync(repoPath('AGENTS.md'), 'utf8')

describe('AGENTS.md', () => {
  test('FR-023 the Checks section names each new ci job, and the preview outside the gate', () => {
    const checks = section(agents(), '## Checks')
    for (const id of NEW_JOBS) expect(checks, id).toContain(`ci / ${id}`)
    expect(checks).toContain('preview / deploy')
    expect(checks).toMatch(/nightly/)
  })

  test('FR-022 FR-023 the Setup section names Docker Desktop, pnpm test:visual, and the setup check\'s Docker line', () => {
    const setup = section(agents(), '## Setup')
    expect(setup).toMatch(/Docker Desktop/)
    expect(setup).toContain('pnpm test:visual')
    expect(setup).toMatch(/setup:check[\s\S]*Docker|Docker[\s\S]*setup:check/)
  })

  test('FR-023 the repo map names the site, its Hosting config and the new scripts', () => {
    const map = section(agents(), '## Repo map')
    for (const item of ['`apps/site/`', '`firebase.json`', '`playwright.config.ts`', '`scripts/site/`']) expect(map, item).toContain(item)
  })
})

describe('the pull request template', () => {
  test('FR-023 asks for the preview link, and names the new checks', () => {
    const template = readFileSync(GITHUB.prTemplate, 'utf8')
    expect(section(template, '## Preview')).toMatch(/preview \/ deploy|pr-N|preview link/i)
    for (const id of NEW_JOBS) expect(template, id).toContain(`ci / ${id}`)
  })
})
