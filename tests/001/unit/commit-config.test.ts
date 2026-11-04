import load from '@commitlint/load'
import { describe, expect, test } from 'vitest'
import { resolveConfig } from '../../../scripts/commitlint.ts'
import { REPO_ROOT } from '../helpers/paths.ts'

// The hooks read commitlint's config themselves, which keeps commit-msg inside
// SC-003's budget (#34). These tests hold what they read equal to what
// commitlint's own loader makes of the same config.

describe("the hooks' commitlint config", () => {
  test("FR-010 SC-003 resolves the same rules, parser options, ignores and help link as commitlint's own loader", async () => {
    const [ours, theirs] = await Promise.all([resolveConfig(), load({}, { cwd: REPO_ROOT })])
    expect(ours.rules).toEqual(theirs.rules)
    expect(ours.parserOpts).toEqual(theirs.parserPreset?.parserOpts)
    expect(ours.ignores).toEqual(theirs.ignores)
    expect(ours.defaultIgnores).toBe(theirs.defaultIgnores)
    expect(ours.helpUrl).toBe(theirs.helpUrl)
  })

  test("FR-010 SC-003 runs the same plugin rules as commitlint's own loader", async () => {
    const [ours, theirs] = await Promise.all([resolveConfig(), load({}, { cwd: REPO_ROOT })])
    expect(Object.keys(ours.plugins)).toEqual(Object.keys(theirs.plugins))
    for (const [name, plugin] of Object.entries(theirs.plugins)) {
      expect(Object.keys(ours.plugins[name]?.rules ?? {})).toEqual(Object.keys(plugin.rules))
    }
  })
})
