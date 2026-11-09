import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Spec 024's S9.3: v2.2 puts interview prep on bradthome.com. The release
// flag that kept prep off live (D190) is gone, with everything that read it.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')

function filesUnder(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    if (name === 'node_modules' || name === 'dist') return []
    return statSync(full).isDirectory() ? filesUnder(full) : [full]
  })
}

describe('v2.2', () => {
  test('S9.3 FR-009 the release flag and everything that read it are gone', () => {
    expect(existsSync(path.join(ROOT, 'scripts', 'site', 'release.ts'))).toBe(false)
    const files = [
      ...filesUnder(path.join(ROOT, 'apps', 'site', 'src')),
      ...filesUnder(path.join(ROOT, '.github')),
      ...filesUnder(path.join(ROOT, 'scripts', 'site')),
      path.join(ROOT, 'apps', 'site', 'astro.config.mjs'),
    ]
    for (const file of files.filter((name) => /\.(ts|tsx|mjs|astro|ya?ml)$/.test(name))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /BRADTHOME_RELEASE|__BRADTHOME_PREP__|PREP_ON|isRelease\(|prepDefine|withoutPrep/,
      )
    }
  })
})
