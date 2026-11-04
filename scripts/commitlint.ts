import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { QualifiedRules, UserConfig } from '@commitlint/types'

// Loads commitlint and the repo's config, for the commit-msg hook and the CI
// commits job. It lives outside lib/, which keeps to Node's built-ins (FR-029).
// The config and packages are the ones in the repo this file lives in,
// whichever repo is being checked.
//
// It reads the config itself rather than through @commitlint/load, whose
// config search, TypeScript loader and schema check cost more start-up time
// than the rest of the hook, and the hooks have a time budget (SC-003). A unit
// test holds the result equal to what @commitlint/load makes of the same
// config.

const HOME = path.resolve(import.meta.dirname, '..')
const CONFIG = pathToFileURL(path.join(HOME, 'commitlint.config.ts')).href

/**
 * The parser options of conventional-changelog-conventionalcommits, the
 * parser preset that @commitlint/config-conventional names. Importing the
 * preset loads its changelog writer too, so its parser options are copied here.
 */
export const PARSER_OPTS = {
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
  headerCorrespondence: ['type', 'scope', 'subject'],
  noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
  revertCorrespondence: ['header', 'hash'],
  issuePrefixes: ['#'],
}

export interface Problem {
  /** 2 for an error, 1 for a warning. */
  level: number
  /** The rule's name, such as type-empty. */
  name: string
  message: string
}

export interface LintResult {
  valid: boolean
  /** commitlint's own report, as the hook prints it. Empty when the message is valid. */
  report: string[]
  problems: Problem[]
}

export interface LintOptions {
  /** Rules to leave out, such as spec-or-issue for Dependabot's commits. */
  without?: readonly string[]
}

export type Linter = (message: string, options?: LintOptions) => Promise<LintResult>

type Rules = QualifiedRules
type Plugin = NonNullable<UserConfig['plugins']>[number]

/** The config the linter runs with, the way @commitlint/load resolves it. */
export interface ResolvedConfig {
  rules: Rules
  parserOpts: typeof PARSER_OPTS
  plugins: Record<string, Exclude<Plugin, string>>
  ignores: NonNullable<UserConfig['ignores']> | undefined
  defaultIgnores: boolean | undefined
  helpUrl: string | undefined
}

/** Reads commitlint.config.ts and the shared configs it extends. */
export async function resolveConfig(): Promise<ResolvedConfig> {
  const { default: config } = (await import(CONFIG)) as { default: UserConfig }
  const extended = await Promise.all(
    [config.extends ?? []].flat().map(async (name) => ((await import(name)) as { default: UserConfig }).default),
  )
  let rules: Rules = {}
  for (const base of [...extended, config]) rules = { ...rules, ...(base.rules as Rules) }
  const plugins: ResolvedConfig['plugins'] = {}
  for (const plugin of config.plugins ?? []) {
    if (typeof plugin === 'string') throw new Error(`commitlint plugins by name aren't supported here: ${plugin}`)
    plugins.local = plugin
  }
  return {
    rules,
    parserOpts: PARSER_OPTS,
    plugins,
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores,
    helpUrl: config.helpUrl,
  }
}

/** Loads commitlint and the repo's config. Undefined when commitlint isn't installed. */
export async function loadLinter(): Promise<Linter | undefined> {
  let lint
  try {
    ;({ default: lint } = await import('@commitlint/lint'))
  } catch {
    return undefined
  }
  const config = await resolveConfig()
  return async (message, options = {}) => {
    const rules = Object.fromEntries(Object.entries(config.rules).filter(([name]) => !(options.without ?? []).includes(name)))
    const result = await lint(message, rules, {
      parserOpts: config.parserOpts,
      plugins: config.plugins,
      ignores: config.ignores,
      defaultIgnores: config.defaultIgnores,
      helpUrl: config.helpUrl,
    })
    const problems = [...result.errors, ...result.warnings].map((problem) => ({
      level: Number(problem.level),
      name: problem.name,
      message: problem.message,
    }))
    if (result.valid) return { valid: true, report: [], problems }
    // The report's format is needed only when the message fails.
    const { default: format } = await import('@commitlint/format')
    const report = format({ results: [result] }, { color: false, helpUrl: config.helpUrl, legacyOutput: true }).split('\n')
    return { valid: false, report, problems }
  }
}
