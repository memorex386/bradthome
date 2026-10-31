import load from '@commitlint/load'
import lint from '@commitlint/lint'
import { beforeAll, describe, expect, test } from 'vitest'
import { REPO_ROOT } from '../helpers/paths.ts'

// The repo's commitlint config, loaded the way commitlint loads it, with the
// spec-or-issue rule from commitlint.config.ts.

type LintOptions = NonNullable<Parameters<typeof lint>[2]>

let config: Awaited<ReturnType<typeof load>>

beforeAll(async () => {
  config = await load({}, { cwd: REPO_ROOT })
})

async function check(message: string): Promise<{ valid: boolean; errors: string[]; messages: string[] }> {
  const result = await lint(message, config.rules, {
    parserOpts: config.parserPreset?.parserOpts as LintOptions['parserOpts'],
    plugins: config.plugins,
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores,
    helpUrl: config.helpUrl,
  })
  return {
    valid: result.valid,
    errors: result.errors.map((error) => error.name),
    messages: result.errors.map((error) => error.message),
  }
}

const SPEC_OR_ISSUE = 'name the spec, as in feat(001): …, or add a Refs: #N line'

describe('the spec-or-issue rule', () => {
  test('FR-010 accepts a three-digit spec number as the scope', async () => {
    expect(await check('feat(001): add the setup check')).toMatchObject({ valid: true })
    expect(await check('test(001): lock the tests for spec 001')).toMatchObject({ valid: true })
  })

  test('FR-010 accepts any scope with a Refs: #N trailer', async () => {
    expect(await check('fix(repo): handle empty lists\n\nRefs: #12')).toMatchObject({ valid: true })
    expect(await check('docs(repo): fix a typo\n\nExplains the fix.\n\nRefs: #3')).toMatchObject({ valid: true })
  })

  test("FR-010 rejects a scope that isn't a spec number when there's no Refs line", async () => {
    const result = await check('docs(repo): fix a typo')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('spec-or-issue')
    expect(result.messages).toContain(SPEC_OR_ISSUE)
  })

  test("FR-010 rejects a spec number that isn't three digits", async () => {
    for (const message of ['feat(1): add a thing', 'feat(0001): add a thing', 'feat(abc): add a thing']) {
      const result = await check(message)
      expect(result.valid, message).toBe(false)
      expect(result.errors, message).toContain('spec-or-issue')
    }
  })

  test('FR-010 rejects a Refs line without an issue number', async () => {
    for (const message of ['docs(repo): fix a typo\n\nRefs: #', 'docs(repo): fix a typo\n\nRefs: 12']) {
      const result = await check(message)
      expect(result.valid, message).toBe(false)
      expect(result.errors, message).toContain('spec-or-issue')
    }
  })

  test("FR-010 rejects a message that isn't a Conventional Commit, with commitlint's own rules first", async () => {
    const result = await check('update hooks')
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['subject-empty', 'type-empty', 'spec-or-issue'])
  })

  test('FR-010 lints a message that only looks like a merge, since the default ignores are off', async () => {
    const result = await check("Merge branch 'feature'")
    expect(result.valid).toBe(false)
  })
})
