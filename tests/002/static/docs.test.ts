import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { GITHUB, repoPath } from '../helpers/paths.ts'

// AGENTS.md's Checks section and the pull request template name the CI checks,
// and keep only the hand-run checks CI doesn't cover (FR-021): the setup check,
// the ruleset check, and the address log for commits not yet pushed.

/** A Markdown section: from its heading to the next heading of the same level. */
function section(text: string, heading: string): string {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === heading)
  expect(start, heading).toBeGreaterThanOrEqual(0)
  const level = /^#+/.exec(heading)?.[0].length ?? 2
  const end = lines.findIndex((line, index) => index > start && new RegExp(`^#{1,${level}} `).test(line))
  return lines.slice(start, end < 0 ? undefined : end).join('\n')
}

/** The commands a list names first, as in "- `pnpm setup:check` passes." */
function listedCommands(text: string): string[] {
  return [...text.matchAll(/^\s*(?:-|\d+\.)\s+`([^`]+)`/gm)].map((match) => match[1] ?? '')
}

const HAND_RUN = [/^pnpm setup:check$/, /^pnpm ruleset:check$/, /^git log --format='%ae %ce'/]
const NOW_IN_CI = [/^gitleaks /, /^pnpm terms\b/, /^git ls-files --eol/, /^git diff --check/, /^pnpm trace\b/, /^pnpm lock\b/]

describe('AGENTS.md', () => {
  test("FR-021 the Checks section names the CI checks, with the two the ruleset will require", () => {
    const checks = section(readFileSync(repoPath('AGENTS.md'), 'utf8'), '## Checks')
    expect(checks).toContain('ci / gate')
    expect(checks).toContain('locked-tests / lock')
    for (const name of ['types', 'tests', 'trace', 'privacy', 'secrets', 'commits', 'hygiene']) {
      expect(checks, name).toMatch(new RegExp(`\\b${name}\\b`))
    }
    expect(checks).not.toMatch(/Until then, run these by hand|Slice 1\.4 adds the required CI checks/)
  })

  test('FR-021 the hand-run checks it lists are only the ones CI doesn\'t cover', () => {
    const commands = listedCommands(section(readFileSync(repoPath('AGENTS.md'), 'utf8'), '## Checks'))
    for (const pattern of HAND_RUN) expect(commands.some((command) => pattern.test(command)), String(pattern)).toBe(true)
    for (const command of commands) {
      expect(HAND_RUN.some((pattern) => pattern.test(command)), command).toBe(true)
      expect(NOW_IN_CI.some((pattern) => pattern.test(command)), command).toBe(false)
    }
  })
})

describe('the pull request template', () => {
  test('FR-021 it asks for the CI checks and only the hand-run checks CI doesn\'t cover', () => {
    const template = readFileSync(GITHUB.prTemplate, 'utf8')
    expect(template).toContain('ci / gate')
    expect(template).toContain('locked-tests / lock')
    expect(template).toContain('pnpm setup:check')
    expect(template).toContain('pnpm ruleset:check')
    expect(template).not.toMatch(/Until CI exists/)
    for (const pattern of NOW_IN_CI) {
      for (const command of [...template.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '')) {
        expect(pattern.test(command), command).toBe(false)
      }
    }
  })
})
