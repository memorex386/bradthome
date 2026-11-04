import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

// The real build's content check (S2.1–S2.5, FR-001, FR-006, SC-002). Each test
// copies the site's content, its config and its schema into a folder inside
// apps/site, so Astro resolves from the site's own node_modules, plants one
// fault, and runs astro sync, the step of astro build that loads and checks
// the collections.

const SITE = path.resolve('apps/site')
const ASTRO = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')

let root: string

beforeEach(() => {
  root = mkdtempSync(path.join(SITE, '.sync-test-'))
  cpSync(path.join(SITE, 'content'), path.join(root, 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content'), path.join(root, 'src', 'content'), { recursive: true })
  cpSync(path.join(SITE, 'src', 'content.config.ts'), path.join(root, 'src', 'content.config.ts'))
  writeFileSync(path.join(root, 'astro.config.mjs'), "import { defineConfig } from 'astro/config'\nexport default defineConfig({})\n")
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function sync(): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [ASTRO, 'sync', '--root', root], { encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

const file = (relative: string) => path.join(root, 'content', relative)
const append = (relative: string, text: string) => writeFileSync(file(relative), `${readFileSync(file(relative), 'utf8')}${text}`)
const plantClaim = (yaml: string) => append('claims.yaml', `planted-1:\n${yaml}`)

describe('astro sync over the content', () => {
  test('S2.5 FR-001 SC-002 passes the committed content', () => {
    const result = sync()
    expect(result.output).not.toMatch(/error/i)
    expect(result.status).toBe(0)
  })

  test('S2.1 FR-002 SC-002 fails on a field a job does not name, and names the entry', () => {
    append('jobs/hopper.yaml', 'location: Remote\n')
    const result = sync()
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('hopper')
  })

  test('S2.1 FR-002 SC-002 fails on a field a project does not name', () => {
    append('projects/vindecoded.yaml', 'stars: 5\n')
    expect(sync().status).not.toBe(0)
  })

  test('S2.1 FR-002 SC-002 fails on a field a claim does not name', () => {
    plantClaim('  subject: hopper\n  order: 99\n  text: Planted.\n  evidence: []\n  visibility: public\n  source: résumé\n')
    const result = sync()
    expect(result.status).not.toBe(0)
    expect(result.output).toContain('planted-1')
  })

  test('S2.2 SC-002 fails on a claim marked interview', () => {
    plantClaim('  subject: hopper\n  order: 99\n  text: Planted.\n  evidence: []\n  visibility: interview\n')
    expect(sync().status).not.toBe(0)
  })

  test('S2.2 SC-002 fails on a claim with no mark', () => {
    plantClaim('  subject: hopper\n  order: 99\n  text: Planted.\n  evidence: []\n')
    expect(sync().status).not.toBe(0)
  })

  test('S2.3 FR-006 SC-002 fails on a claim whose job or project does not exist', () => {
    plantClaim('  subject: nowhere\n  order: 1\n  text: Planted.\n  evidence: []\n  visibility: public\n')
    expect(sync().status).not.toBe(0)
  })

  test('S2.4 SC-002 fails on a machine path in a claim', () => {
    plantClaim('  subject: hopper\n  order: 99\n  text: Kept in /Users/someone/notes.\n  evidence: []\n  visibility: public\n')
    expect(sync().status).not.toBe(0)
  })
})
