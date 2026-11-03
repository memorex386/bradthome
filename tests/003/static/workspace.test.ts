import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { readYaml } from '../../002/helpers/workflows.ts'
import { CONFIG } from '../helpers/paths.ts'

// The workspace (FR-001, FR-002): the site is a pnpm workspace package in
// apps/site, every version is exact, and the root keeps its own scripts and
// checks. The site's TypeScript is the 6 API through Microsoft's alias, since
// astro check and typescript-eslint refuse TypeScript 7 (plan).

interface Manifest {
  name?: string
  private?: boolean
  type?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface WorkspaceConfig {
  packages?: string[]
  strictDepBuilds?: boolean
  allowBuilds?: Record<string, boolean>
  minimumReleaseAgeExclude?: unknown
}

const EXACT = /^\d+\.\d+\.\d+$/
const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T
const site = (): Manifest => readJson<Manifest>(CONFIG.sitePackage)
const root = (): Manifest => readJson<Manifest>(CONFIG.rootPackage)
const allDeps = (manifest: Manifest): Record<string, string> => ({ ...manifest.dependencies, ...manifest.devDependencies })

describe('the workspace', () => {
  test('FR-001 is a pnpm workspace with the site in apps/site, as the private package @bradthome/site', () => {
    const workspace = readYaml<WorkspaceConfig>(CONFIG.workspace)
    expect(workspace.packages).toEqual(['apps/*'])
    expect(existsSync(CONFIG.sitePackage)).toBe(true)
    expect(site().name).toBe('@bradthome/site')
    expect(site().private).toBe(true)
    expect(site().type).toBe('module')
  })

  test("FR-001 keeps the repo's checks at the root, and reaches the site's commands from there", () => {
    const scripts = root().scripts ?? {}
    for (const name of ['test', 'test:unit', 'typecheck', 'terms', 'lock', 'trace', 'sync', 'setup:check', 'ruleset:check']) {
      expect(scripts[name], name).toBeDefined()
    }
    for (const name of ['lint', 'format', 'format:check', 'site:types', 'site:build', 'site:html', 'site:links', 'site:lighthouse', 'csp', 'test:e2e', 'test:visual']) {
      expect(scripts[name], name).toBeDefined()
    }
  })

  test("FR-001 keeps pnpm's install rules: install scripts only by name, firebase-tools' two refused, and no release-age exceptions", () => {
    const workspace = readYaml<WorkspaceConfig>(CONFIG.workspace)
    expect(workspace.strictDepBuilds).toBe(true)
    expect(workspace.minimumReleaseAgeExclude).toBeUndefined()
    for (const [name, allowed] of Object.entries(workspace.allowBuilds ?? {})) expect(typeof allowed, name).toBe('boolean')
    if (allDeps(root())['firebase-tools'] !== undefined || allDeps(site())['firebase-tools'] !== undefined) {
      expect(workspace.allowBuilds?.protobufjs).toBe(false)
      expect(workspace.allowBuilds?.re2).toBe(false)
    }
  })
})

describe("the site's stack", () => {
  test('FR-002 builds with Astro 7, React 19, Tailwind CSS 4, Motion and TypeScript, at exact versions', () => {
    const deps = allDeps(site())
    const majors: Record<string, string> = {
      astro: '7',
      '@astrojs/react': '7',
      react: '19',
      'react-dom': '19',
      tailwindcss: '4',
      '@tailwindcss/vite': '4',
    }
    for (const [name, major] of Object.entries(majors)) {
      expect(deps[name], name).toMatch(EXACT)
      expect(deps[name]?.split('.')[0], name).toBe(major)
    }
    expect(deps.motion).toMatch(EXACT)
    expect(deps['@astrojs/check']).toMatch(EXACT)
  })

  test("FR-002 FR-009 the site's TypeScript is the 6 API through Microsoft's alias, and the root keeps TypeScript 7", () => {
    expect(allDeps(site()).typescript).toMatch(/^npm:@typescript\/typescript6@6\.\d+\.\d+$/)
    expect(allDeps(root()).typescript).toMatch(/^7\.\d+\.\d+$/)
  })

  test('FR-002 every version in both packages is exact, apart from the TypeScript alias', () => {
    for (const [file, manifest] of [
      ['apps/site/package.json', site()],
      ['package.json', root()],
    ] as const) {
      for (const [name, version] of Object.entries(allDeps(manifest))) {
        if (file === 'apps/site/package.json' && name === 'typescript') continue
        expect(version, `${file} ${name}`).toMatch(EXACT)
      }
    }
  })

  test('FR-002 FR-008 FR-010 FR-012 FR-013 FR-020 the checks\' tools are installed at exact versions', () => {
    const deps = { ...allDeps(root()), ...allDeps(site()) }
    for (const name of [
      'eslint',
      'eslint-plugin-astro',
      'typescript-eslint',
      'prettier',
      'prettier-plugin-astro',
      '@playwright/test',
      '@axe-core/playwright',
      '@lhci/cli',
      'html-validate',
      'firebase-tools',
      '@stryker-mutator/core',
      '@stryker-mutator/vitest-runner',
    ]) {
      expect(deps[name], name).toMatch(EXACT)
    }
    expect(deps['@playwright/test']).toBe('1.64.1')
  })
})
