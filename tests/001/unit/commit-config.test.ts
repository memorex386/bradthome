import load from '@commitlint/load'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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

  test('FR-010 SC-003 checks a valid message without loading @commitlint/load or @commitlint/format', () => {
    // A fresh Node process records every module it resolves while it loads
    // the linter and checks a valid message.
    const script = [
      "import { registerHooks } from 'node:module'",
      'const seen = []',
      'registerHooks({ resolve(specifier, context, next) { seen.push(specifier); return next(specifier, context) } })',
      `const { loadLinter } = await import(${JSON.stringify(pathToFileURL(path.join(REPO_ROOT, 'scripts/commitlint.ts')).href)})`,
      'const lint = await loadLinter()',
      "const result = await lint('docs(001): check the timing\\n')",
      'console.log(JSON.stringify({ valid: result.valid, seen }))',
    ].join('\n')
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: REPO_ROOT, encoding: 'utf8' })
    expect(child.status, child.stderr).toBe(0)
    const { valid, seen } = JSON.parse(child.stdout) as { valid: boolean; seen: string[] }
    expect(valid).toBe(true)
    expect(seen).toContain('@commitlint/lint')
    expect(seen.filter((specifier) => /^@commitlint\/(load|format)(\/|$)/.test(specifier))).toEqual([])
  })

  test("FR-010 SC-003 runs the same plugin rules as commitlint's own loader", async () => {
    const [ours, theirs] = await Promise.all([resolveConfig(), load({}, { cwd: REPO_ROOT })])
    expect(Object.keys(ours.plugins)).toEqual(Object.keys(theirs.plugins))
    for (const [name, plugin] of Object.entries(theirs.plugins)) {
      expect(Object.keys(ours.plugins[name]?.rules ?? {})).toEqual(Object.keys(plugin.rules))
    }
  })
})
