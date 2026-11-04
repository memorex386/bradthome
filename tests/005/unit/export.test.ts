import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { exportContent } from '../../../scripts/content/notes.ts'

// The export over made-up notes (S1.1–S1.7, FR-008–FR-014, SC-001, D108). The
// notes in fixtures/notes use every kind of tag, and fixtures/content holds one
// job and one project for the bullets to attach to. Each test copies both into
// a temp folder, so nothing it writes lands in the repo.

const FIXTURES = path.resolve('tests/005/fixtures')
/** A made-up term list. The words are invented, so nothing private is here. */
const TERMS = 'zanzibarqux\n'

let work: string
let notes: string
let content: string

beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'bradthome-005-'))
  notes = path.join(work, 'notes')
  content = path.join(work, 'content')
  cpSync(path.join(FIXTURES, 'notes'), notes, { recursive: true })
  cpSync(path.join(FIXTURES, 'content'), content, { recursive: true })
})

afterEach(() => rmSync(work, { recursive: true, force: true }))

const run = (args: string[] = ['--notes', notes], env: NodeJS.ProcessEnv = {}) =>
  exportContent({ args, env: { PRIVATE_TERMS: TERMS, ...env }, contentDir: content, cwd: work })

const claimsFile = () => path.join(content, 'claims.yaml')
const written = (): Record<string, Record<string, unknown>> => parse(readFileSync(claimsFile(), 'utf8')) as Record<string, Record<string, unknown>>

describe('what the export writes', () => {
  test('S1.1 FR-009 SC-001 writes exactly the bullets tagged public, and nothing from the others', () => {
    const result = run()
    expect(result.code).toBe(0)
    const claims = written()
    expect(Object.keys(claims)).toEqual(['example-co-platform-1', 'example-co-platform-2', 'widget-app-1', 'widget-app-2', 'widget-app-3'])
    const text = readFileSync(claimsFile(), 'utf8')
    for (const dropped of ['interviewer', 'agents only', 'no tag', 'extra words', 'comes next', 'README', 'raw note', 'no job or project']) {
      expect(text).not.toContain(dropped)
    }
    for (const claim of Object.values(claims)) expect(claim.visibility).toBe('public')
  })

  test('FR-010 keeps the bullet as written without its tag, with its nested list', () => {
    run()
    const claims = written()
    expect(claims['example-co-platform-1']).toEqual({
      subject: 'example-co',
      topic: 'Platform',
      order: 1,
      text: 'Built the public platform.',
      evidence: [],
      visibility: 'public',
    })
    expect(claims['example-co-platform-2']?.text).toBe('Shipped a feature in two parts:\n- the first part\n- the second part\n\nBoth sit behind flags.')
    expect(claims['example-co-platform-2']?.evidence).toEqual(['https://example.com/feature'])
  })

  test('S1.2 FR-010 keeps only https links from the source, and none of its other text', () => {
    run()
    const claims = written()
    expect(claims['widget-app-1']?.evidence).toEqual(['https://widget.example/stats'])
    expect(claims['widget-app-2']?.evidence).toEqual([])
    expect(claims['widget-app-3']?.evidence).toEqual([])
    const text = readFileSync(claimsFile(), 'utf8')
    for (const source of ['résumé', 'research', 'checked', 'someone', 'C:\\', 'the repo', 'http://']) expect(text).not.toContain(source)
  })

  test('S1.3 FR-011 attaches each bullet to the nearest heading that names a job or project, and counts the rest', () => {
    const result = run()
    const claims = written()
    expect(claims['widget-app-1']).toMatchObject({ subject: 'widget-app', order: 1 })
    expect(claims['widget-app-1']).not.toHaveProperty('topic')
    expect(claims['example-co-platform-2']).toMatchObject({ subject: 'example-co', topic: 'Platform', order: 2 })
    expect(result.lines.join('\n')).toMatch(/Unknown Thing.*1/)
  })

  test('FR-012 numbers claims from 1 within each subject and topic, in the notes order', () => {
    run()
    expect(Object.entries(written()).map(([id, claim]) => `${id}:${String(claim.order)}`)).toEqual([
      'example-co-platform-1:1',
      'example-co-platform-2:2',
      'widget-app-1:1',
      'widget-app-2:2',
      'widget-app-3:3',
    ])
  })

  test('S1.6 FR-012 writes the same bytes from the same notes', () => {
    run()
    const first = readFileSync(claimsFile())
    run()
    expect(readFileSync(claimsFile()).equals(first)).toBe(true)
  })

  test('S1.7 FR-008 never reads raw/ or README.md', () => {
    writeFileSync(path.join(notes, 'raw', 'work.md'), '# Example Co\n\n- Another raw fact. *(raw · public)*\n')
    run()
    expect(readFileSync(claimsFile(), 'utf8')).not.toMatch(/raw|README/)
  })
})

describe('when the export stops', () => {
  test('S1.5 FR-008 writes nothing and says how to name the folder when none is given', () => {
    const result = run([], {})
    expect(result.code).toBe(1)
    expect(result.lines.join('\n')).toMatch(/--notes/)
    expect(result.lines.join('\n')).toMatch(/BRADTHOME_NOTES/)
    expect(existsSync(claimsFile())).toBe(false)
  })

  test('S1.5 FR-008 writes nothing when the folder does not exist', () => {
    const result = run(['--notes', path.join(work, 'missing')])
    expect(result.code).toBe(1)
    expect(existsSync(claimsFile())).toBe(false)
  })

  test('FR-008 takes the folder from BRADTHOME_NOTES when there is no argument', () => {
    const result = run([], { BRADTHOME_NOTES: notes })
    expect(result.code).toBe(0)
    expect(Object.keys(written())).toHaveLength(5)
  })

  test('S1.4 FR-013 writes nothing when public text holds a private term, and reports the line without the term', () => {
    writeFileSync(claimsFile(), 'old: file\n')
    writeFileSync(path.join(notes, 'work.md'), `${readFileSync(path.join(notes, 'work.md'), 'utf8')}\n## Later\n\n- Worked with Zanzibarqux. *(résumé v1 · public)*\n`)
    const result = run()
    expect(result.code).toBe(1)
    expect(readFileSync(claimsFile(), 'utf8')).toBe('old: file\n')
    const output = result.lines.join('\n')
    expect(output).toMatch(/line \d+/)
    expect(output.toLowerCase()).not.toContain('zanzibarqux')
  })

  test('FR-013 writes nothing when the private-term list is not found', () => {
    const result = exportContent({ args: ['--notes', notes], env: { PRIVATE_TERMS: '' }, contentDir: content, cwd: work })
    expect(result.code).toBe(1)
    expect(existsSync(claimsFile())).toBe(false)
  })

  test('FR-013 writes nothing when a claim fails the site schema', () => {
    writeFileSync(path.join(notes, 'work.md'), `${readFileSync(path.join(notes, 'work.md'), 'utf8')}\n## Later\n\n- Lived at /home/someone once. *(résumé v1 · public)*\n`)
    const result = run()
    expect(result.code).toBe(1)
    expect(existsSync(claimsFile())).toBe(false)
  })
})

describe('the report', () => {
  test('FR-014 counts claims per subject and drops by tag and reason, with none of a dropped bullet text', () => {
    const output = run().lines.join('\n')
    expect(output).toMatch(/example-co\s+2/)
    expect(output).toMatch(/widget-app\s+3/)
    expect(output).toMatch(/interview\s+1/)
    expect(output).toMatch(/private\s+1/)
    expect(output).toMatch(/no tag\s+2/)
    expect(output).toMatch(/other tag\s+1/)
    expect(output).toMatch(/http link\s+1/)
    for (const dropped of ['interviewer', 'agents only', 'no tag at all', 'extra words', 'comes next', 'old page']) expect(output).not.toContain(dropped)
  })
})
