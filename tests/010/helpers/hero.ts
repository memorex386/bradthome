import { readFileSync } from 'node:fs'
import path from 'node:path'

// Spec 010's paths and readers for the hero's stylesheet. Found from this
// file, so the tests run from any working directory.

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const repoPath = (...parts: string[]): string => path.join(REPO_ROOT, ...parts)
export const sitePath = (...parts: string[]): string => repoPath('apps', 'site', ...parts)
export const read = (file: string): string => readFileSync(file, 'utf8')

export const FILES = {
  hero: sitePath('src', 'components', 'home', 'Hero.astro'),
  heroData: sitePath('src', 'components', 'home', 'hero.ts'),
  heroCss: sitePath('src', 'styles', 'home', 'hero.css'),
  page: sitePath('src', 'pages', 'v2.astro'),
  pages: sitePath('src', 'pages'),
  src: sitePath('src'),
  claims: sitePath('content', 'claims.yaml'),
  dsTokens: sitePath('src', 'styles', 'ds', 'tokens.css'),
  v1Tokens: sitePath('src', 'styles', 'tokens.css'),
  astro: sitePath('astro.config.mjs'),
  releasePages: repoPath('scripts', 'site', 'release-pages.ts'),
  release: repoPath('.github', 'workflows', 'release.yml'),
  workflows: repoPath('.github', 'workflows'),
  lighthouse: repoPath('lighthouserc.json'),
  plan: repoPath('docs', 'plan.md'),
  agents: repoPath('AGENTS.md'),
  runbook: repoPath('docs', 'release.md'),
}

/** The source with each no-preference reduced-motion block taken out, and those blocks' bodies. */
export function motionBlocks(source: string): { still: string; blocks: string[] } {
  const open = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g
  let still = ''
  let from = 0
  const blocks: string[] = []
  for (let match = open.exec(source); match !== null; match = open.exec(source)) {
    if (match.index < from) continue
    let depth = 1
    let at = match.index + match[0].length
    while (at < source.length && depth > 0) {
      if (source[at] === '{') depth += 1
      if (source[at] === '}') depth -= 1
      at += 1
    }
    still += source.slice(from, match.index)
    blocks.push(source.slice(match.index + match[0].length, at - 1))
    from = at
  }
  return { still: still + source.slice(from), blocks }
}

/** Each rule in a CSS block as its selector list and its declarations, nested at-rules flattened. */
export function rules(css: string): { selectors: string[]; body: string }[] {
  const out: { selectors: string[]; body: string }[] = []
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (match[1] ?? '')
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean)
    out.push({ selectors, body: match[2] ?? '' })
  }
  return out
}

/** A duration or delay as milliseconds: "650ms", "1.1s", or a var() named in vars. */
export function ms(value: string, vars: Record<string, number> = {}): number {
  const trimmed = value.trim()
  const named = /^var\((--[\w-]+)\)$/.exec(trimmed)
  if (named) {
    const found = vars[named[1] ?? '']
    if (found === undefined) throw new Error(`Unknown duration ${trimmed}`)
    return found
  }
  const number = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(trimmed)
  if (!number) throw new Error(`Not a duration: ${trimmed}`)
  return Number(number[1]) * (number[2] === 's' ? 1000 : 1)
}
