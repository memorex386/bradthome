import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { claimSchemaFor, subjectsIn } from '../../../apps/site/src/content/schema.ts'
import { loadTerms } from '../../../scripts/lib/terms.ts'

// What reaches the repo (FR-015, SC-003, D44, D108). The export has no default
// folder, the slice's files hold no machine path, and the committed claims pass
// the site's schema and the private-term scan.

const CONTENT = path.resolve('apps/site/content')
const MACHINE_PATH = /[A-Za-z]:\\|\/Users\/|\/home\//

/** The slice's own files, apart from the made-up notes that plant a path on purpose. */
function sliceFiles(): string[] {
  const listed = spawnSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      'scripts/content',
      'apps/site/content',
      'apps/site/src/content',
      'apps/site/src/content.config.ts',
    ],
    {
      encoding: 'utf8',
    },
  )
  return listed.stdout.split('\n').filter((file) => file !== '')
}

describe('privacy', () => {
  test('FR-015 the export and the content hold no machine path, and the export names no default folder', () => {
    const files = sliceFiles()
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(MACHINE_PATH)
    const notes = readFileSync('scripts/content/notes.ts', 'utf8')
    expect(notes).toContain('BRADTHOME_NOTES')
    expect(notes).not.toMatch(/knowledge/i)
  })

  test('FR-015 the tests use only the made-up notes', () => {
    const notes = path.resolve('tests/005/fixtures/notes')
    for (const name of readdirSync(notes)) {
      if (name.endsWith('.md')) expect(readFileSync(path.join(notes, name), 'utf8')).toMatch(/Example Co|Widget App|Made-up/)
    }
  })

  test('SC-003 every committed claim passes the site schema and is marked public', () => {
    const claims = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, unknown>
    const schema = claimSchemaFor(subjectsIn(CONTENT))
    expect(Object.keys(claims).length).toBeGreaterThan(0)
    for (const [id, claim] of Object.entries(claims)) expect(schema.safeParse(claim).success, id).toBe(true)
  })

  // CI's privacy job scans every tracked file with the secret list. Here the
  // scan runs wherever a list is set up, as on Brad's PC.
  test.skipIf('problem' in loadTerms(process.env, process.cwd()))('SC-003 pnpm terms passes on every content file', () => {
    const files = sliceFiles().filter((file) => file.startsWith('apps/site/content/'))
    const result = spawnSync(process.execPath, ['scripts/terms.ts', '--files', ...files], { encoding: 'utf8' })
    expect(result.status, result.stdout).toBe(0)
  })
})
