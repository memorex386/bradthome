import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { repoPath } from '../helpers/paths.ts'

// package.json, the husky hook files and what the hook scripts import.

interface Package {
  type?: string
  packageManager?: string
  engines?: { node?: string }
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

const PACKAGE = JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as Package

function importsOf(source: string): string[] {
  const found: string[] = []
  for (const pattern of [
    /^\s*import\s[^'"]*?from\s*['"]([^'"]+)['"]/gm,
    /^\s*import\s*['"]([^'"]+)['"]/gm,
    /^\s*export\s[^'"]*?from\s*['"]([^'"]+)['"]/gm,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of source.matchAll(pattern)) if (match[1] !== undefined) found.push(match[1])
  }
  return found
}

describe('installing turns the hooks on', () => {
  test("FR-015 pnpm install turns the git hooks on through husky's prepare script", () => {
    expect(PACKAGE.scripts?.prepare ?? '').toMatch(/\bhusky\b/)
    expect(Object.keys(PACKAGE.devDependencies ?? {})).toContain('husky')
  })

  test('FR-015 FR-029 each git hook is one POSIX sh line that runs its Node script', () => {
    for (const hook of ['pre-commit', 'commit-msg', 'pre-push']) {
      const bytes = readFileSync(repoPath('.husky', hook))
      expect(bytes.includes(Buffer.from('\r')), `${hook} has CRLF line endings`).toBe(false)
      const text = bytes.toString('utf8')
      expect(text, hook).not.toMatch(/^#!.*\b(?:bash|zsh|pwsh|powershell)\b/m)
      const lines = text.split('\n').filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
      expect(lines, hook).toHaveLength(1)
      const [line = ''] = lines
      expect(line, hook).toMatch(/\bnode\b/)
      expect(line, hook).toContain(`scripts/hooks/${hook}.ts`)
      if (hook !== 'pre-commit') expect(line, `${hook} passes git's arguments on`).toMatch(/\$1|\$@/)
    }
  })
})

describe('the toolchain', () => {
  test('FR-029 the package runs as ES modules and pins pnpm, Node and every devDependency', () => {
    expect(PACKAGE.type).toBe('module')
    expect(PACKAGE.packageManager ?? '').toMatch(/^pnpm@12\.\d+\.\d+\+sha512\.[0-9a-f]{128}$/)
    expect(PACKAGE.engines?.node).toBe('>=22.23.4')
    for (const [name, version] of Object.entries({ ...PACKAGE.dependencies, ...PACKAGE.devDependencies })) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  test('FR-029 text files are stored and checked out with LF endings, so the hooks run in Git for Windows and on Linux', () => {
    const attributes = readFileSync(repoPath('.gitattributes'), 'utf8').split(/\r?\n/).map((line) => line.trim())
    expect(attributes).toContain('* text=auto eol=lf')
  })

  test('FR-029 the scripts that pre-commit and pre-push run need only Node built-ins', () => {
    const scripts = repoPath('scripts')
    const files = [
      ...readdirSync(path.join(scripts, 'lib'))
        .filter((name) => name.endsWith('.ts'))
        .map((name) => path.join(scripts, 'lib', name)),
      path.join(scripts, 'hooks', 'pre-commit.ts'),
      path.join(scripts, 'hooks', 'pre-push.ts'),
    ]
    for (const file of files) {
      for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
        const where = path.relative(scripts, file)
        if (specifier.startsWith('node:')) continue
        expect(specifier.startsWith('.'), `${where} imports ${specifier}`).toBe(true)
        const target = path.resolve(path.dirname(file), specifier)
        expect(path.relative(scripts, target).startsWith('..'), `${where} imports ${specifier}`).toBe(false)
      }
    }
  })

  test('FR-012 FR-013 FR-014 FR-025 FR-028 the commands the plan names are package scripts', () => {
    const expected: Record<string, string> = {
      terms: 'scripts/terms.ts',
      lock: 'scripts/lock-tests.ts',
      trace: 'scripts/trace.ts',
      sync: 'scripts/sync.ts',
      'setup:check': 'scripts/setup-check.ts',
      'review:eval': 'scripts/review-eval.ts',
      'guard:install': 'scripts/guard-install.ts',
    }
    for (const [name, file] of Object.entries(expected)) {
      expect(PACKAGE.scripts?.[name] ?? '', name).toContain(file)
    }
    expect(PACKAGE.scripts?.prepare ?? '').toContain('scripts/setup-local.ts')
    for (const name of ['test', 'test:unit', 'typecheck']) expect(PACKAGE.scripts?.[name], name).toBeDefined()
  })
})
