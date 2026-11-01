import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { type GitResult, runGit, runGitAsync } from './git.ts'

// The private-term list and its matcher (FR-004, FR-005). The list lives
// outside the repo, and nothing here hands a term back: a match is only ever a
// line number.

export interface Terms {
  /** How many entries the list has. */
  readonly count: number
  /** One pattern that matches any entry. Never printed. */
  readonly pattern: RegExp | undefined
}

export type TermsProblem = 'not-found' | 'unreadable' | 'empty'

/** Where the list came from: the PRIVATE_TERMS variable, or the git setting. */
export type TermsSource = 'env' | 'setting'

export type LoadedTerms = { terms: Terms; source: TermsSource } | { problem: TermsProblem; source: TermsSource }

export const SETTING = 'bradthome.privateTerms'
export const VARIABLE = 'PRIVATE_TERMS'

// Letters, digits and _ are word characters, so a term matches only as a
// whole word.
const WORD = String.raw`[\p{L}\p{N}_]`
const STARTS_WITH_WORD = /^[\p{L}\p{N}_]/u
const ENDS_WITH_WORD = /[\p{L}\p{N}_]$/u
// What may sit between the digits of a number written for people to read.
const SEPARATORS = String.raw`[\s.\-()\[\]+]*`
const DIGITS_ENTRY = /^digits:\s*(.*)$/i

function escape(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&')
}

function wordSource(entry: string): string {
  const body = entry.split(/\s+/).map(escape).join(String.raw`\s+`)
  const start = STARTS_WITH_WORD.test(entry) ? `(?<!${WORD})` : ''
  const end = ENDS_WITH_WORD.test(entry) ? `(?!${WORD})` : ''
  return `${start}${body}${end}`
}

function digitsSource(digits: string): string {
  return `(?<![0-9])${[...digits].join(SEPARATORS)}(?![0-9])`
}

/** Reads a list's text: one entry per line, # starts a comment, and digits: marks a number. */
export function parseTerms(listText: string): Terms {
  const sources: string[] = []
  for (const raw of listText.split(/\r?\n/)) {
    const entry = raw.trim()
    if (entry === '' || entry.startsWith('#')) continue
    const digits = DIGITS_ENTRY.exec(entry)
    if (digits !== null) {
      const number = (digits[1] ?? '').replace(/\D/g, '')
      if (number !== '') sources.push(digitsSource(number))
      continue
    }
    sources.push(wordSource(entry))
  }
  return {
    count: sources.length,
    pattern: sources.length === 0 ? undefined : new RegExp(sources.map((source) => `(?:${source})`).join('|'), 'iu'),
  }
}

/** Whether a piece of text, read line by line, holds a term. */
export function holdsTerm(text: string, terms: Terms): boolean {
  return text.split(/\r?\n/).some((line) => terms.pattern?.test(line) === true)
}

/**
 * Whether a path or a ref name holds a term. Names use - _ . and / where words
 * would have spaces, so they're also read with those as spaces.
 */
export function nameHoldsTerm(name: string, terms: Terms): boolean {
  return holdsTerm(name, terms) || holdsTerm(name.replace(/[-_./\\]+/g, ' '), terms)
}

/** The 1-based numbers of the lines that hold a term. */
export function termLines(text: string, terms: Terms): number[] {
  const found: number[] = []
  text.split(/\r?\n/).forEach((line, index) => {
    if (terms.pattern?.test(line) === true) found.push(index + 1)
  })
  return found
}

/** A variable's value whatever the case of its name, since Windows ignores case. */
export function envValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  if (process.platform !== 'win32') return env[name]
  const key = Object.keys(env).find((candidate) => candidate.toLowerCase() === name.toLowerCase())
  return key === undefined ? undefined : env[key]
}

function fromText(text: string, source: TermsSource): LoadedTerms {
  const terms = parseTerms(text)
  return terms.count === 0 ? { problem: 'empty', source } : { terms, source }
}

const LIST_PATH = ['config', '--global', '--type=path', '--get', SETTING]

function pathFrom(result: GitResult): string | undefined {
  const value = result.status === 0 ? result.stdout.trim() : ''
  return value === '' ? undefined : value
}

/** The list's path from the machine's global git config, if it's set. */
export function listPath(env: NodeJS.ProcessEnv, cwd: string): string | undefined {
  return pathFrom(runGit(LIST_PATH, { cwd, env }))
}

function readProblem(error: unknown): LoadedTerms {
  const code = (error as NodeJS.ErrnoException).code
  return { problem: code === 'ENOENT' || code === 'ENOTDIR' ? 'not-found' : 'unreadable', source: 'setting' }
}

/**
 * The term list: PRIVATE_TERMS when it's set, even when it's empty, as in CI.
 * Otherwise the file the bradthome.privateTerms setting names.
 */
export function loadTerms(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): LoadedTerms {
  const fromEnv = envValue(env, VARIABLE)
  if (fromEnv !== undefined) return fromText(fromEnv, 'env')
  const file = listPath(env, cwd)
  if (file === undefined) return { problem: 'not-found', source: 'setting' }
  try {
    return fromText(readFileSync(file, 'utf8'), 'setting')
  } catch (error) {
    return readProblem(error)
  }
}

/** loadTerms, without waiting, for the hooks. */
export async function loadTermsAsync(env: NodeJS.ProcessEnv, cwd: string): Promise<LoadedTerms> {
  const fromEnv = envValue(env, VARIABLE)
  if (fromEnv !== undefined) return fromText(fromEnv, 'env')
  const file = pathFrom(await runGitAsync(LIST_PATH, { cwd, env }))
  if (file === undefined) return { problem: 'not-found', source: 'setting' }
  try {
    return fromText(await readFile(file, 'utf8'), 'setting')
  } catch (error) {
    return readProblem(error)
  }
}
