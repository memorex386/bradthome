import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { readFrontmatter } from '../helpers/frontmatter.ts'
import { repoPath } from '../helpers/paths.ts'

// Spec Kit and the loop's own skills, as they sit in the repo.

const LOOP_SKILLS = ['interview', 'decision-page', 'record-decision', 'lock-tests', 'review', 'open-pr', 'retro']
const ADAPTED_SKILLS = ['interview', 'review', 'retro']
const SPEC_KIT_SKILLS = ['speckit-specify', 'speckit-plan', 'speckit-tasks', 'speckit-implement']

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort()
}

function folders(dir: string): string[] {
  return readdirSync(dir).filter((name) => statSync(path.join(dir, name)).isDirectory())
}

describe('Spec Kit', () => {
  test("S7.4 FR-026 Spec Kit's skills are installed for Claude Code in .claude/skills and for Codex in .agents/skills", () => {
    for (const base of ['.claude', '.agents']) {
      for (const skill of SPEC_KIT_SKILLS) {
        expect(existsSync(repoPath(base, 'skills', skill, 'SKILL.md')), `${base}/skills/${skill}`).toBe(true)
      }
    }
  })

  test("S7.3 FR-026 Spec Kit's project overrides are exact copies of docs/templates/spec.md and plan.md", () => {
    for (const [template, override] of [
      ['spec.md', 'spec-template.md'],
      ['plan.md', 'plan-template.md'],
    ] as const) {
      expect(readFileSync(repoPath('.specify', 'templates', 'overrides', override)).equals(readFileSync(repoPath('docs', 'templates', template))), override).toBe(true)
    }
  })

  test("FR-026 Spec Kit's constitution points at the charter, the principles and the working agreement", () => {
    const constitution = readFileSync(repoPath('.specify', 'memory', 'constitution.md'), 'utf8')
    for (const doc of ['charter.md', 'principles.md', 'working-agreement.md']) expect(constitution).toContain(doc)
  })
})

describe("the loop's skills", () => {
  test('S7.5 FR-027 .agents/skills holds the seven loop skills, each a SKILL.md in the Agent Skills format', () => {
    for (const skill of LOOP_SKILLS) {
      const file = repoPath('.agents', 'skills', skill, 'SKILL.md')
      expect(existsSync(file), skill).toBe(true)
      const { data } = readFrontmatter(readFileSync(file, 'utf8'))
      expect(data.name, skill).toBe(skill)
      expect(typeof data.description === 'string' && data.description.trim() !== '', `${skill} has a description`).toBe(true)
    }
  })

  test('S7.5 FR-027 each skill adapted from a public one keeps its copyright notice and license', () => {
    for (const skill of ADAPTED_SKILLS) {
      const license = repoPath('.agents', 'skills', skill, 'LICENSE')
      expect(existsSync(license), `${skill}/LICENSE`).toBe(true)
      const text = readFileSync(license, 'utf8')
      expect(text, skill).toMatch(/MIT License/)
      expect(text, skill).toMatch(/Copyright \(c\) \d{4}/i)
    }
  })

  test('S7.1 FR-014 every skill in .agents/skills has an identical copy in .claude/skills, and no copy is stale', () => {
    const sources = folders(repoPath('.agents', 'skills')).filter((name) => !name.startsWith('speckit-'))
    const copies = folders(repoPath('.claude', 'skills')).filter((name) => !name.startsWith('speckit-'))
    expect(copies.sort()).toEqual(sources.sort())
    for (const skill of sources) {
      const source = repoPath('.agents', 'skills', skill)
      const copy = repoPath('.claude', 'skills', skill)
      expect(filesUnder(copy), skill).toEqual(filesUnder(source))
      for (const file of filesUnder(source)) {
        expect(readFileSync(path.join(copy, file)).equals(readFileSync(path.join(source, file))), `${skill}/${file}`).toBe(true)
      }
    }
  })
})
