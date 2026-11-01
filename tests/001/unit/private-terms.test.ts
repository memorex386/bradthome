import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { loadTerms, parseTerms, termLines } from '../../../scripts/lib/terms.ts'
import { slash } from '../helpers/paths.ts'
import { run } from '../helpers/run.ts'
import { createSandbox, getEnv, setEnv, type Sandbox } from '../helpers/sandbox.ts'
import { EMPTY_LIST, MADE_UP_LIST, MADE_UP_TERM_COUNT, MADE_UP_WORDS } from '../helpers/terms.ts'

const terms = parseTerms(MADE_UP_LIST)

function linesFor(...lines: string[]): number[] {
  return termLines(lines.join('\n'), terms)
}

const sandboxes: Sandbox[] = []
function sandbox(options?: Parameters<typeof createSandbox>[0]): Sandbox {
  const created = createSandbox(options)
  sandboxes.push(created)
  return created
}
afterEach(() => {
  for (const created of sandboxes.splice(0)) created.cleanup()
})

function loaded(env: NodeJS.ProcessEnv, cwd: string): ReturnType<typeof parseTerms> {
  const result = loadTerms(env, cwd)
  if (!('terms' in result)) throw new Error(`expected a term list, got the problem ${result.problem}`)
  return result.terms
}

function problemOf(env: NodeJS.ProcessEnv, cwd: string): string {
  const result = loadTerms(env, cwd)
  if (!('problem' in result)) throw new Error('expected a problem, got a term list')
  return result.problem
}

describe('matching', () => {
  test('FR-005 matches a term in any letter case', () => {
    expect(linesFor('a clean line', 'notes on zorblax', 'ZORBLAX again', 'about Quixmoor', 'QUIXMOOR and quixmoor')).toEqual([
      2, 3, 4, 5,
    ])
  })

  test('FR-005 S1.9 matches whole words only, so a term inside a longer word passes', () => {
    expect(linesFor('zorblaxian', 'prezorblax', 'zorblax_v2', 'zorblax2', 'quixmoorland')).toEqual([])
    expect(linesFor('zorblax-v2', '(zorblax)', 'zorblax.', '"zorblax"', 'x zorblax y')).toEqual([1, 2, 3, 4, 5])
  })

  test('FR-005 matches a phrase across any run of whitespace', () => {
    expect(linesFor('vellum kestrel', 'Vellum   Kestrel', 'vellum\tkestrel')).toEqual([1, 2, 3])
    expect(linesFor('vellumkestrel', 'vellum, kestrel', 'vellum kestrels')).toEqual([])
  })

  test('FR-005 S1.10 matches a digits entry with spaces, dots, dashes, brackets or plus signs between the digits', () => {
    expect(
      linesFor(
        'call 5555550147',
        'call 555 555 0147',
        'call 555.555.0147',
        'call 555-555-0147',
        'call (555) 555-0147',
        'call [555] 555 0147',
        'call 555+555+0147',
        'call +1 (555) 555-0147',
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test('FR-005 S1.9 a digits entry matches whole numbers only', () => {
    expect(linesFor('order 95555550147', 'order 55555501479', 'short 555555014')).toEqual([])
  })

  test('FR-005 matches line by line, so a term split across two lines passes', () => {
    expect(linesFor('the vellum', 'kestrel')).toEqual([])
  })

  test('FR-004 a line that starts with # is a comment, and blank lines are skipped', () => {
    expect(terms.count).toBe(MADE_UP_TERM_COUNT)
    expect(linesFor('a quaggle appears')).toEqual([])
  })

  test('FR-004 SC-002 a match reports line numbers only, never the term', () => {
    const found = linesFor('clean', 'zorblax', 'clean', 'vellum kestrel')
    expect(found).toEqual([2, 4])
    const shown = JSON.stringify(found).toLowerCase()
    for (const word of MADE_UP_WORDS) expect(shown.includes(word)).toBe(false)
  })
})

describe('where the list comes from', () => {
  test('FR-004 reads the list from the file the bradthome.privateTerms setting names', () => {
    const box = sandbox()
    const list = loaded(box.env, box.root)
    expect(list.count).toBe(MADE_UP_TERM_COUNT)
    expect(termLines('zorblax', list)).toEqual([1])
  })

  test('FR-004 reads the list from PRIVATE_TERMS ahead of the setting, as CI will', () => {
    const box = sandbox()
    const env = { ...box.env }
    setEnv(env, 'PRIVATE_TERMS', 'snorkelwick\n')
    const list = loaded(env, box.root)
    expect(list.count).toBe(1)
    expect(termLines('snorkelwick', list)).toEqual([1])
    expect(termLines('zorblax', list)).toEqual([])
  })

  test('FR-004 FR-007 an empty PRIVATE_TERMS blocks, even when the setting names a list', () => {
    const box = sandbox()
    const env = { ...box.env }
    setEnv(env, 'PRIVATE_TERMS', '')
    expect(problemOf(env, box.root)).toBe('empty')
  })

  test('FR-007 fails closed when the setting is missing', () => {
    const box = sandbox({ terms: false })
    expect(problemOf(box.env, box.root)).toBe('not-found')
  })

  test('FR-007 fails closed when the setting names a file that is missing', () => {
    const box = sandbox({ terms: false })
    box.setGlobal('bradthome.privateTerms', slash(box.path('no-such-list.txt')))
    expect(problemOf(box.env, box.root)).toBe('not-found')
  })

  test("FR-007 fails closed when the list can't be read", () => {
    const box = sandbox({ terms: false })
    const folder = box.path('a-folder-not-a-file')
    mkdirSync(folder)
    box.setGlobal('bradthome.privateTerms', slash(folder))
    expect(['unreadable', 'not-found']).toContain(problemOf(box.env, box.root))
  })

  test('FR-007 fails closed when the list holds only comments and blank lines', () => {
    const box = sandbox({ terms: EMPTY_LIST })
    expect(problemOf(box.env, box.root)).toBe('empty')
  })
})

describe("the tests' own isolation", () => {
  test("SC-002 FR-004 the test sandbox keeps Brad's real list, git config, Claude Code folder and gh logins out of reach", () => {
    const box = sandbox()
    const inside = (value: string | undefined): boolean => {
      if (value === undefined) return false
      const relative = path.relative(box.root, value)
      return !relative.startsWith('..') && !path.isAbsolute(relative)
    }
    const homes = ['HOME', 'XDG_CONFIG_HOME', 'CLAUDE_CONFIG_DIR', 'GIT_CONFIG_GLOBAL']
    if (process.platform === 'win32') homes.push('USERPROFILE', 'APPDATA')
    for (const name of homes) expect(inside(getEnv(box.env, name)), name).toBe(true)
    expect(getEnv(box.env, 'GIT_CONFIG_NOSYSTEM')).toBe('1')
    for (const name of ['PRIVATE_TERMS', 'GH_CONFIG_DIR', 'GH_TOKEN', 'GITHUB_TOKEN', 'CLAUDE_PROJECT_DIR']) {
      expect(getEnv(box.env, name), name).toBeUndefined()
    }
    for (const dir of box.ghDefaultDirs) expect(inside(dir), dir).toBe(true)

    // Git reads only the sandbox's global config: no system config, and no other file.
    const listed = run('git', ['config', '--list', '--show-origin'], { cwd: box.root, env: box.env })
    expect(listed.status).toBe(0)
    // Each origin is file:<path>, and git quotes a path that holds backslashes.
    const originPath = (origin: string): string => {
      let file = origin.replace(/^file:/, '')
      if (file.startsWith('"') && file.endsWith('"')) file = file.slice(1, -1).replace(/\\(.)/g, '$1')
      return slash(file).toLowerCase()
    }
    const origins = new Set(listed.stdout.split('\n').filter((line) => line !== '').map((line) => line.split('\t')[0] ?? ''))
    expect([...origins].every((origin) => origin.startsWith('file:')), [...origins].join(', ')).toBe(true)
    expect([...origins].map(originPath)).toEqual([slash(box.gitConfig).toLowerCase()])
    const named = run('git', ['config', '--get', 'bradthome.privateTerms'], { cwd: box.root, env: box.env })
    expect(slash(named.stdout.trim())).toBe(slash(box.termsFile))
  })
})
