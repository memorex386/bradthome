import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

// Spec 020's S1.2 in the real build's content step: a copy of the site's
// content, config and schema in a folder inside apps/site, with one planted
// claim that isn't public, then astro sync, the step of astro build that loads
// and checks the collections (as spec 005's sync test does). Each kind of mark
// is planted in turn: interview, private and none.

const SITE = path.resolve('apps/site')
const ASTRO = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
const MARKS = ['  visibility: interview\n', '  visibility: private\n', '']

let root: string
let claims: string
let committed: string

beforeAll(() => {
  root = mkdtempSync(path.join(SITE, '.sync-test-020-'))
  cpSync(path.join(SITE, 'content'), path.join(root, 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content'), path.join(root, 'src', 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content.config.ts'), path.join(root, 'src', 'content.config.ts'))
  writeFileSync(path.join(root, 'astro.config.mjs'), "import { defineConfig } from 'astro/config'\nexport default defineConfig({})\n")
  claims = path.join(root, 'content', 'claims.yaml')
  committed = readFileSync(claims, 'utf8')
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('the build with a planted claim', () => {
  test('S1.2 FR-002 SC-002 a claim marked interview, private or nothing fails the build, and the failure names it', () => {
    for (const mark of MARKS) {
      writeFileSync(claims, `${committed}planted-1:\n  subject: hopper\n  order: 99\n  text: Planted.\n  evidence: []\n${mark}`)
      const result = spawnSync(process.execPath, [ASTRO, 'sync', '--root', root], {
        encoding: 'utf8',
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      })
      expect(result.status, mark || 'no mark').not.toBe(0)
      expect(`${result.stdout}${result.stderr}`, mark || 'no mark').toContain('planted-1')
    }
  })
})
