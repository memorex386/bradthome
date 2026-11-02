import path from 'node:path'

// Loads commitlint and the repo's config, for the commit-msg hook and the CI
// commits job. It lives outside lib/, which keeps to Node's built-ins (FR-029).
// The config and packages are the ones in the repo this file lives in,
// whichever repo is being checked.

const HOME = path.resolve(import.meta.dirname, '..')

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

/** Loads commitlint and the repo's config. Undefined when commitlint isn't installed. */
export async function loadLinter(): Promise<Linter | undefined> {
  let modules
  try {
    modules = await Promise.all([import('@commitlint/load'), import('@commitlint/lint'), import('@commitlint/format')])
  } catch {
    return undefined
  }
  const [{ default: load }, { default: lint }, { default: format }] = modules
  const config = await load({}, { cwd: HOME })
  return async (message, options = {}) => {
    const rules = Object.fromEntries(Object.entries(config.rules).filter(([name]) => !(options.without ?? []).includes(name)))
    const result = await lint(message, rules, {
      parserOpts: config.parserPreset?.parserOpts as NonNullable<Parameters<typeof lint>[2]>['parserOpts'],
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
    if (result.valid && problems.length === 0) return { valid: true, report: [], problems }
    const report = format({ results: [result] }, { color: false, helpUrl: config.helpUrl, legacyOutput: true }).split('\n')
    return { valid: result.valid, report: result.valid ? [] : report, problems }
  }
}
