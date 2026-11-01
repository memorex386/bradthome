import { existsSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createLayout, type Layout } from '../helpers/layout.ts'
import { SCRIPTS } from '../helpers/paths.ts'
import { describeRun, runNode, type RunResult } from '../helpers/run.ts'
import { createSandbox, type Sandbox } from '../helpers/sandbox.ts'

// pnpm sync [--check], run as `node scripts/sync.ts` from the root of a scratch
// folder laid out like the repo.

const SOURCES: Record<string, string> = {
  '.agents/skills/interview/SKILL.md': '---\nname: interview\ndescription: Interview Brad.\n---\n\nAsk until the spec can be written.\n',
  '.agents/skills/interview/LICENSE': 'MIT License\n\nCopyright (c) 2026 A Made-Up Author\n',
  '.agents/skills/review/SKILL.md': '---\nname: review\ndescription: Review the diff.\n---\n\nCompare the diff with the spec.\n',
  '.agents/skills/review/references/checklist.md': '- Every requirement is implemented.\n',
  '.agents/skills/speckit-plan/SKILL.md': "---\nname: speckit-plan\ndescription: Spec Kit's plan, for Codex.\n---\n",
  'docs/templates/spec.md': '# Spec NNN: [Name]\n',
  'docs/templates/plan.md': '# Plan for spec NNN: [Name]\n',
}

const COPIES: Record<string, string> = {
  '.claude/skills/review/SKILL.md': '---\nname: review\ndescription: An old review.\n---\n',
  '.claude/skills/old-skill/SKILL.md': '---\nname: old-skill\ndescription: Removed from the source.\n---\n',
  '.claude/skills/interview/stale-notes.md': 'Not in the source any more.\n',
  '.claude/skills/speckit-plan/SKILL.md': "---\nname: speckit-plan\ndescription: Spec Kit's plan, for Claude Code.\n---\n",
  '.claude/skills/speckit-specify/SKILL.md': "---\nname: speckit-specify\ndescription: Spec Kit's specify, for Claude Code.\n---\n",
  '.specify/templates/overrides/spec-template.md': '# An old spec template\n',
}

interface Fixture {
  where: Layout
  sync(...args: string[]): RunResult
}

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const created of sandboxes.splice(0)) created.cleanup()
})

function fixture(): Fixture {
  const sandbox = createSandbox()
  sandboxes.push(sandbox)
  const where = createLayout(sandbox, { ...SOURCES, ...COPIES })
  return { where, sync: (...args) => runNode(SCRIPTS.sync, args, { cwd: where.root, env: sandbox.env }) }
}

function exists(where: Layout, file: string): boolean {
  return existsSync(path.join(where.root, file))
}

describe('pnpm sync', () => {
  test('S7.1 FR-014 copies each skill in .agents/skills to .claude/skills, nested files included', () => {
    const { where, sync } = fixture()
    const result = sync()
    expect(result.status, describeRun(result)).toBe(0)
    for (const file of [
      'interview/SKILL.md',
      'interview/LICENSE',
      'review/SKILL.md',
      'review/references/checklist.md',
    ]) {
      expect(where.read(`.claude/skills/${file}`), file).toBe(where.read(`.agents/skills/${file}`))
    }
  })

  test("S7.1 FR-014 removes stale copies, and leaves Spec Kit's speckit-* skills alone", () => {
    const { where, sync } = fixture()
    expect(sync().status).toBe(0)
    expect(exists(where, '.claude/skills/old-skill')).toBe(false)
    expect(exists(where, '.claude/skills/interview/stale-notes.md')).toBe(false)
    expect(where.read('.claude/skills/speckit-plan/SKILL.md')).toBe(COPIES['.claude/skills/speckit-plan/SKILL.md'])
    expect(where.read('.claude/skills/speckit-specify/SKILL.md')).toBe(COPIES['.claude/skills/speckit-specify/SKILL.md'])
  })

  test("FR-014 copies the spec and plan templates to Spec Kit's override folder", () => {
    const { where, sync } = fixture()
    expect(sync().status).toBe(0)
    expect(where.read('.specify/templates/overrides/spec-template.md')).toBe(where.read('docs/templates/spec.md'))
    expect(where.read('.specify/templates/overrides/plan-template.md')).toBe(where.read('docs/templates/plan.md'))
  })

  test('FR-014 --check fails while a copy differs from its source, and passes after the sync', () => {
    const { where, sync } = fixture()
    const before = sync('--check')
    expect(before.status, describeRun(before)).not.toBe(0)
    expect(sync().status).toBe(0)
    where.stage()
    const after = sync('--check')
    expect(after.status, describeRun(after)).toBe(0)
  })
})
