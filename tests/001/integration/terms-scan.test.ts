import { describe, expect, test } from 'vitest'
import { SCRIPTS } from '../helpers/paths.ts'
import { textWithLineAt, type ScratchRepo } from '../helpers/repo.ts'
import { describeRun, runNode, type RunResult } from '../helpers/run.ts'
import { scratchRepos } from '../helpers/seeds.ts'
import { expectNoTerm } from '../helpers/terms.ts'

// pnpm terms [--files …], run as `node scripts/terms.ts` in a scratch repo:
// the scan of tracked text files on request (FR-006).

const scratch = scratchRepos()

function repoWithFiles(seed: Record<string, string>, options: { terms?: false } = {}): ScratchRepo {
  return scratch({ sandbox: options.terms === false ? { terms: false } : {}, repo: { seed, hooks: false } })
}

function terms(repo: ScratchRepo, ...args: string[]): RunResult {
  return runNode(SCRIPTS.terms, args, { cwd: repo.dir, env: repo.sandbox.env })
}

describe('pnpm terms', () => {
  test('FR-006 SC-002 scans every tracked text file, reporting each file and line but never the term', () => {
    const repo = repoWithFiles({
      'docs/a.md': textWithLineAt(3, 'About Zorblax.'),
      'src/b.ts': 'export const b = 1\n',
      'docs/c.md': textWithLineAt(7, 'Call (555) 555-0147.'),
    })
    repo.write('docs/picture.bin', new Uint8Array([0, 1, 0, ...Buffer.from('zorblax'), 0]))
    repo.gitOk(['add', 'docs/picture.bin'])
    repo.gitOk(['commit', '--quiet', '-m', 'docs(001): add a picture'])
    repo.write('docs/untracked.md', 'About quixmoor.\n')
    const result = terms(repo)
    expect(result.status, describeRun(result)).not.toBe(0)
    const output = result.stdout + result.stderr
    expect(output).toContain('docs/a.md:3')
    expect(output).toContain('docs/c.md:7')
    expect(output).not.toContain('src/b.ts')
    expect(output).not.toContain('docs/picture.bin')
    expect(output).not.toContain('docs/untracked.md')
    expectNoTerm(result)
  })

  test('FR-006 --files scans only the files it names', () => {
    const repo = repoWithFiles({ 'docs/a.md': textWithLineAt(3, 'About zorblax.'), 'src/b.ts': 'export const b = 1\n' })
    const clean = terms(repo, '--files', 'src/b.ts')
    expect(clean.status, describeRun(clean)).toBe(0)
    const found = terms(repo, '--files', 'src/b.ts', 'docs/a.md')
    expect(found.status).not.toBe(0)
    expect(found.stdout + found.stderr).toContain('docs/a.md:3')
    expectNoTerm(found)
  })

  test('FR-006 SC-002 reports a tracked file whose path holds a term, without showing the path', () => {
    const repo = repoWithFiles({ 'docs/vellum-kestrel.md': 'Ordinary notes.\n' })
    const result = terms(repo)
    expect(result.status).not.toBe(0)
    expect(result.stdout + result.stderr).toMatch(/private term/i)
    expectNoTerm(result)
  })

  test('FR-006 passes when no tracked file holds a term', () => {
    const repo = repoWithFiles({ 'docs/a.md': 'Ordinary notes, and a zorblaxian word.\n' })
    const result = terms(repo)
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('FR-006 FR-007 fails closed when the list is missing', () => {
    const repo = repoWithFiles({ 'docs/a.md': 'Ordinary notes.\n' }, { terms: false })
    const result = terms(repo)
    expect(result.status).not.toBe(0)
    expect(result.stdout + result.stderr).toMatch(/private-term list not found/)
  })
})
