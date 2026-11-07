import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

// Spec 020's S1.2 in the real build's content step: a copy of the site's
// content, config and schema in a folder inside apps/site, with one planted
// claim that isn't public, then astro sync, the step of astro build that loads
// and checks the collections (as spec 005's sync test does).

const SITE = path.resolve('apps/site')
const ASTRO = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')

let root: string

beforeAll(() => {
  root = mkdtempSync(path.join(SITE, '.sync-test-020-'))
  cpSync(path.join(SITE, 'content'), path.join(root, 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content'), path.join(root, 'src', 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content.config.ts'), path.join(root, 'src', 'content.config.ts'))
  writeFileSync(path.join(root, 'astro.config.mjs'), "import { defineConfig } from 'astro/config'\nexport default defineConfig({})\n")
  const claims = path.join(root, 'content', 'claims.yaml')
  writeFileSync(
    claims,
    `${readFileSync(claims, 'utf8')}planted-1:\n  subject: hopper\n  order: 99\n  text: Planted.\n  evidence: []\n  visibility: private\n`,
  )
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('the build with a planted claim', () => {
  test('S1.2 FR-002 SC-002 a claim marked private fails the build, and the failure names it', () => {
    const result = spawnSync(process.execPath, [ASTRO, 'sync', '--root', root], {
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    })
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('planted-1')
  })
})
