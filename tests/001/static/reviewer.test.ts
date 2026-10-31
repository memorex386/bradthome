import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { asList, readFrontmatter } from '../helpers/frontmatter.ts'
import { repoPath } from '../helpers/paths.ts'

// The reviewer subagent's definition, and the review skill that starts it.

const REVIEWER = readFrontmatter(readFileSync(repoPath('.claude', 'agents', 'reviewer.md'), 'utf8'))
const REVIEW_SKILL = readFileSync(repoPath('.agents', 'skills', 'review', 'SKILL.md'), 'utf8')

describe('the reviewer', () => {
  test('S6.1 FR-024 is pinned to claude-opus-5-5 by its exact ID', () => {
    expect(REVIEWER.data.name).toBe('reviewer')
    expect(REVIEWER.data.model).toBe('claude-opus-5-5')
  })

  test('S6.1 FR-024 has only the read-only tools Read, Grep and Glob', () => {
    expect(asList(REVIEWER.data.tools).sort()).toEqual(['Glob', 'Grep', 'Read'])
  })

  test('S6.3 FR-024 reports each finding by file, line and S, FR or SC ID, and gives no approve, merge or ready verdict', () => {
    const body = REVIEWER.body
    expect(body).toMatch(/\bfile\b/i)
    expect(body).toMatch(/\bline\b/i)
    expect(body).toMatch(/\b(?:S\d+\.\d+|FR-\d{3}|SC-\d{3})\b|\bS, FR (?:or|and) SC\b/)
    // Each verdict is named after a "never", "don't", "do not" or "no" on the same line, so the
    // prompt forbids it rather than asks for it.
    for (const verdict of ['approv', 'merge', 'ready']) {
      expect(body, verdict).toMatch(new RegExp(`\\b(?:never|don't|do not|no)\\b[^\\n]*\\b${verdict}`, 'i'))
    }
  })
})

describe('the review skill', () => {
  test('S6.1 FR-024 never passes a model when it starts the reviewer, so the pin holds', () => {
    expect(REVIEW_SKILL).not.toMatch(/\bmodel["']?\s*[:=]\s*["']?(?:claude-|opus|sonnet|haiku|fable|inherit)/i)
    expect(REVIEW_SKILL).not.toMatch(/--model\b/)
    expect(REVIEW_SKILL).not.toMatch(/\bclaude-(?:opus|sonnet|haiku|fable)-\d/)
  })

  test('S6.1 FR-024 starts the reviewer subagent by name', () => {
    expect(REVIEW_SKILL).toMatch(/\breviewer\b/)
  })
})
