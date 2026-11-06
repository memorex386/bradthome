import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

// A real build, the release's since v2.0 (S2.2, FR-007, SC-002, spec 019's
// S6.1): the privacy note is in it, and only the one module names Umami's
// host, beside its bradthome.com check, so nothing sends from anywhere else.
// The essay and the 404 page still ship no script. It builds into a scratch
// folder in the checkout's ignored node_modules/.cache, never apps/site/dist:
// Astro moves files from apps/site into the output with a rename, which
// fails across drives, as on CI's Windows runner, where the system temp
// folder is on another drive.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

test("S2.2 FR-007 SC-002 a real build holds the privacy note, only the one module names Umami's host, beside its bradthome.com check, and v1's pages ship no script", () => {
  const cache = path.join(ROOT, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const out = mkdtempSync(path.join(cache, 'bradthome-018-release-'))
  try {
    const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
    // CI's test runners have no WeasyPrint, and a CI build without it fails
    // (spec 015's S4.4). This test reads no PDF, so it builds as a local build
    // does, which leaves the PDFs out with a warning.
    const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], { cwd: SITE, encoding: 'utf8', env: { ...process.env, CI: '' } })
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    const files = filesIn(out).map((file) => path.relative(out, file).replaceAll('\\', '/'))
    expect(files).toContain('index.html')
    expect(files).toContain('privacy.html')
    const naming = files.filter(
      (name) => /\.(html|js|css|json|txt|xml|svg)$/.test(name) && /gateway\.umami\.is/.test(readFileSync(path.join(out, name), 'utf8')),
    )
    expect(naming).toHaveLength(1)
    expect(naming[0]).toMatch(/^_astro\/PreviewLink\.astro_astro_type_script/)
    expect(readFileSync(path.join(out, naming[0] ?? ''), 'utf8')).toContain('bradthome.com')
    for (const page of ['vindecoded-agents.html', '404.html']) expect(readFileSync(path.join(out, page), 'utf8').toLowerCase()).not.toContain('<script')
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})
