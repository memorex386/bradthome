import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  buildRecordsOf,
  countsIn,
  dateLabelOf,
  dayOf,
  RECORDS,
  recordsOf,
  repoRootOf,
  REPO,
} from '../../../apps/site/src/components/home/record.ts'

// Spec 033's counts: what record.ts counts in a checkout, how it dates them,
// where each links, and that it fails rather than guess (S2.1–S2.5, FR-002).
// A scratch checkout plants each kind of file, so every rule breaks on its own.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const scratches: string[] = []

afterEach(() => {
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A scratch checkout with the given files and folders, under a pnpm-workspace.yaml. */
function scratch(files: readonly string[], dirs: readonly string[] = []): string {
  const root = mkdtempSync(path.join(tmpdir(), 'records-'))
  scratches.push(root)
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []\n')
  for (const dir of dirs) mkdirSync(path.join(root, dir), { recursive: true })
  for (const file of files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), '# x\n')
  }
  return root
}

const FULL = {
  files: [
    'docs/decisions/0001-one.md',
    'docs/decisions/0002-two.md',
    'docs/decisions/0214-three.md',
    'docs/decisions/README.md',
    'docs/decisions/notes.txt',
    'docs/decisions/12-short.md',
    'specs/README.md',
    'specs/033-a-file.md',
    'docs/releases/v1.0.0.md',
    'docs/releases/v2.0.0.md',
    'docs/releases/v2.0.1.md',
    'docs/releases/v2.0.0-rehearsal.md',
    'docs/releases/rehearsal.md',
    'docs/releases/v2.5.md',
  ],
  dirs: ['specs/001-hooks', 'specs/002-ci', 'specs/031-ask-on-phones', 'specs/templates', 'specs/34-short', 'docs/decisions/0300-a-folder'],
}

describe('what counts (S2.1)', () => {
  test('S2.1 FR-002 decision records are NNNN-….md files, specs NNN-… folders and releases vX.Y.Z.md files; an index, a rehearsal or another file never counts', () => {
    expect(countsIn(scratch(FULL.files, FULL.dirs))).toEqual({ decisions: 3, specs: 3, releases: 3 })
  })

  test('S2.1 SC-002 the repo itself: each count equals its folder, counted here on its own', () => {
    const files = (folder: string) => readdirSync(path.join(ROOT, folder), { withFileTypes: true })
    expect(countsIn(ROOT)).toEqual({
      decisions: files('docs/decisions').filter((entry) => entry.isFile() && /^\d{4}-.+\.md$/.test(entry.name)).length,
      specs: files('specs').filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name)).length,
      releases: files('docs/releases').filter((entry) => entry.isFile() && /^v\d+\.\d+\.\d+\.md$/.test(entry.name)).length,
    })
    const counts = countsIn(ROOT)
    expect(counts.decisions).toBeGreaterThanOrEqual(217)
    expect(counts.specs).toBeGreaterThanOrEqual(31)
    expect(counts.releases).toBeGreaterThanOrEqual(8)
  })

  test('S2.1 a new record counts at the next count', () => {
    const root = scratch(FULL.files, FULL.dirs)
    writeFileSync(path.join(root, 'docs/decisions/0215-four.md'), '# x\n')
    mkdirSync(path.join(root, 'specs/032-next'))
    writeFileSync(path.join(root, 'docs/releases/v2.6.0.md'), '# x\n')
    expect(countsIn(root)).toEqual({ decisions: 4, specs: 4, releases: 4 })
  })
})

describe('the date (S2.2)', () => {
  test("S2.2 the build's day is Dallas–Fort Worth's, as YYYY-MM-DD", () => {
    // 03:30 UTC on the 12th is still the evening of the 11th in Central time.
    expect(dayOf(new Date('2026-11-12T03:30:00Z'))).toBe('2026-11-11')
    expect(dayOf(new Date('2026-11-12T06:30:00Z'))).toBe('2026-11-12')
    expect(dayOf(new Date('2026-07-01T04:59:00Z'))).toBe('2026-06-30')
  })

  test('S2.2 the day reads as "Nov 11, 2026", and anything else fails', () => {
    expect(dateLabelOf('2026-11-11')).toBe('Nov 11, 2026')
    expect(dateLabelOf('2027-01-05')).toBe('Jan 5, 2027')
    expect(() => dateLabelOf('11/11/2026')).toThrow("isn't a YYYY-MM-DD day")
  })

  test('S2.2 recordsOf counts the checkout around a folder, and dates it by the moment given', () => {
    const root = scratch(FULL.files, FULL.dirs)
    mkdirSync(path.join(root, 'apps', 'site'), { recursive: true })
    expect(recordsOf(path.join(root, 'apps', 'site'), new Date('2026-11-11T18:00:00Z'))).toEqual({
      counts: { decisions: 3, specs: 3, releases: 3 },
      counted: '2026-11-11',
    })
  })

  test('S1.2 S2.2 the build counts once, so every page shows the same counts and day, even across midnight', () => {
    const root = scratch(FULL.files, FULL.dirs)
    mkdirSync(path.join(root, 'apps', 'site'), { recursive: true })
    // The first page renders at 23:59 in Dallas–Fort Worth, and the next a minute later, after a new record lands.
    const first = buildRecordsOf(path.join(root, 'apps', 'site'), () => new Date('2026-11-12T05:59:30Z'))
    writeFileSync(path.join(root, 'docs/decisions/0215-four.md'), '# x\n')
    const next = buildRecordsOf(path.join(root, 'apps', 'site'), () => new Date('2026-11-12T06:00:30Z'))
    expect(first).toEqual({ counts: { decisions: 3, specs: 3, releases: 3 }, counted: '2026-11-11' })
    expect(next).toEqual(first)
    // Each count on its own still reads the disk as it is.
    expect(countsIn(root).decisions).toBe(4)
  })
})

describe('where each count links (S2.3, S2.5)', () => {
  test('S2.3 three counts, in order, each linking its records on GitHub', () => {
    expect(REPO).toBe('https://github.com/memorex386/bradthome')
    expect(RECORDS.map((record) => [record.kind, record.folder, record.label, record.href])).toEqual([
      ['decisions', 'docs/decisions', 'decisions', 'https://github.com/memorex386/bradthome/blob/main/docs/decisions/README.md'],
      ['specs', 'specs', 'specs', 'https://github.com/memorex386/bradthome/tree/main/specs'],
      ['releases', 'docs/releases', 'releases', 'https://github.com/memorex386/bradthome/tree/main/docs/releases'],
    ])
  })

  test('S2.5 no count of pull requests, which D161 ended', () => {
    const text = readFileSync(path.join(ROOT, 'apps/site/src/components/home/record.ts'), 'utf8')
    expect(RECORDS.map((record) => record.kind)).not.toContain('pulls')
    for (const record of RECORDS) expect(`${record.label} ${record.href}`).not.toMatch(/pull/i)
    expect(text.replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/pull request|\/pulls/i)
  })
})

describe('it never guesses (S2.4)', () => {
  test('S2.4 FR-002 a checkout without one of the three folders fails, naming it', () => {
    expect(() => countsIn(scratch(['docs/decisions/0001-one.md', 'docs/releases/v1.0.0.md']))).toThrow('specs')
    expect(() => countsIn(scratch(['specs/README.md', 'docs/releases/v1.0.0.md']))).toThrow('docs/decisions')
    expect(() => countsIn(scratch(['docs/decisions/0001-one.md', 'specs/README.md']))).toThrow('docs/releases')
  })

  test('S2.4 the root is the nearest folder holding pnpm-workspace.yaml, and none fails', () => {
    const root = scratch(FULL.files, FULL.dirs)
    mkdirSync(path.join(root, 'apps', 'site', 'src'), { recursive: true })
    expect(repoRootOf(path.join(root, 'apps', 'site', 'src'))).toBe(root)
    expect(repoRootOf(path.join(ROOT, 'apps', 'site'))).toBe(ROOT)
    const bare = mkdtempSync(path.join(tmpdir(), 'no-root-'))
    scratches.push(bare)
    // A temp folder sits outside any workspace, so the walk reaches the drive's root.
    expect(() => repoRootOf(bare)).toThrow('No repo root above')
  })

  test('S2.4 FR-002 the counts read the disk only: no request, no git, no other process', () => {
    const text = readFileSync(path.join(ROOT, 'apps/site/src/components/home/record.ts'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
    expect(text).not.toMatch(/\bfetch\(|node:https?|child_process|spawn|execSync|api\.github\.com|import\.meta\.glob/)
    expect(text.match(/from 'node:[a-z]+'/g)).toEqual(["from 'node:fs'", "from 'node:path'"])
  })
})
