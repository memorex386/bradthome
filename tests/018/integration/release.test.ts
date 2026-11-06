import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'

// A real release build (S2.2, FR-007, SC-002): with BRADTHOME_RELEASE=1 the
// site builds without phase 3, so no file in it names Umami's host, and there
// is no privacy note. It builds into a scratch folder, never apps/site/dist.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

test('S2.2 FR-007 SC-002 a real release build holds no privacy note and no file that names Umami, and v1 ships no script', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'bradthome-018-release-'))
  try {
    const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
    const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], {
      cwd: SITE,
      env: { ...process.env, BRADTHOME_RELEASE: '1' },
      encoding: 'utf8',
    })
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    const files = filesIn(out).map((file) => path.relative(out, file).replaceAll('\\', '/'))
    expect(files).toContain('index.html')
    expect(files).not.toContain('privacy.html')
    for (const file of files.filter((name) => /\.(html|js|css|json|txt|xml|svg)$/.test(name))) {
      const text = readFileSync(path.join(out, file), 'utf8')
      expect(text, file).not.toMatch(/umami/i)
      if (file.endsWith('.html')) expect(text.toLowerCase().includes('<script src='), file).toBe(false)
    }
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})
