import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// The site's checks and their messages (FR-008, FR-009, FR-012 to FR-014,
// C1–C6). The message functions turn each tool's findings into the mocks'
// words: a header naming the job and the count, the places, indented, and the
// fix last, as spec 001's messages read. The command line runs one tool, as
// CI's lint, format, site-types, html, links and lighthouse jobs run it, and
// prints its findings that way: node scripts/ci/site-report.ts <check>.

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')
const DIST = path.join(SITE, 'dist')

export interface A11yViolation {
  state: string
  rule: string
  wcag: string
  target: string
  detail: string
}

export interface SnapshotDiff {
  state: string
  pixels: number
  diff: string
}

export interface BudgetMiss {
  metric: string
  value: number
  budget: number
}

export interface FileProblem {
  file: string
  line: number
  column: number
  rule: string
  message: string
}

export interface BrokenLink {
  file: string
  link: string
  reason: string
}

export interface MissingHeader {
  path: string
  header: string
}

function counted(count: number, one: string, many: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`
}

/** Items grouped by a key, in the order each key first appears. */
function grouped<T>(items: readonly T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item])
  return [...groups]
}

/** Two columns, the first padded to its widest value, as the mocks align them. */
function columns(rows: readonly [string, string][], indent: string): string[] {
  const width = Math.max(0, ...rows.map(([name]) => name.length))
  return rows.map(([name, value]) => `${indent}${name.padEnd(width)}  ${value}`)
}

function placed(problems: readonly FileProblem[]): string[] {
  return problems.flatMap((problem) => [`  ${problem.file}:${problem.line}:${problem.column}`, `    ${problem.rule}  ${problem.message}`])
}

export function a11yMessage(violations: readonly A11yViolation[]): string[] {
  const lines = [`✖ e2e  ${counted(violations.length, 'accessibility violation', 'accessibility violations')}`]
  for (const [state, found] of grouped(violations, (violation) => violation.state)) {
    lines.push(`  ${state}`)
    for (const violation of found)
      lines.push(`    ${violation.rule} (WCAG 2.2 AA, ${violation.wcag})`, `    ${violation.target}  ${violation.detail}`)
  }
  const contrast = violations.find((violation) => violation.rule === 'color-contrast')
  if (contrast !== undefined && violations.every((violation) => violation.rule === 'color-contrast')) {
    const theme = /\bdark\b/.test(contrast.state) ? 'dark' : 'light'
    const token = /^a\b/.test(contrast.target) ? 'accent' : 'text'
    lines.push(`  Fix: pnpm test:visual, then adjust the ${theme} ${token} token in apps/site/src/styles/tokens.css.`)
  } else {
    lines.push('  Fix: pnpm test:visual, then fix each element above in apps/site/src.')
  }
  return lines
}

export function snapshotMessage(diffs: readonly SnapshotDiff[]): string[] {
  const header = diffs.length === 1 ? '1 snapshot differs' : `${diffs.length} snapshots differ`
  return [
    `✖ e2e  ${header}`,
    ...diffs.flatMap((diff) => [
      `  ${diff.state}`,
      `    ${diff.pixels === 1 ? '1 pixel differs' : `${diff.pixels.toLocaleString('en-US')} pixels differ`} (no tolerance)`,
      `    diff: the run's artifacts, ${diff.diff}`,
    ]),
    '  Fix: if the change is intended, run pnpm test:visual --update in the container,',
    '  and commit the new baseline with the spec.',
  ]
}

const CATEGORIES = new Set(['performance', 'accessibility', 'best-practices', 'seo'])

/** A Lighthouse value as the mocks show it: a score out of 100, seconds, milliseconds or the shift itself. */
function lighthouseValue(metric: string, value: number): string {
  if (CATEGORIES.has(metric)) return String(Math.round(value * 100))
  if (metric === 'largest-contentful-paint' || metric === 'first-contentful-paint') return `${(value / 1000).toFixed(1)} s`
  if (metric === 'total-blocking-time') return `${Math.round(value)} ms`
  return String(Number(value.toFixed(3)))
}

export function lighthouseMessage(page: string, runs: number, misses: readonly BudgetMiss[]): string[] {
  const header = misses.length === 1 ? '1 budget missed' : `${misses.length} budgets missed`
  return [
    `✖ lighthouse  ${header} (median of ${runs} runs)`,
    `  ${page} on a phone profile`,
    ...columns(
      misses.map((miss) => [
        miss.metric,
        `${lighthouseValue(miss.metric, miss.value)}, budget ${lighthouseValue(miss.metric, miss.budget)}`,
      ]),
      '    ',
    ),
    "  Fix: the report is in the run's artifacts.",
  ]
}

export function lintMessage(problems: readonly FileProblem[]): string[] {
  return [
    `✖ lint  ${counted(problems.length, 'problem', 'problems')}`,
    ...placed(problems),
    "  Fix: pnpm lint --fix, or remove the rule's cause.",
  ]
}

export function formatMessage(files: readonly string[]): string[] {
  return [
    `✖ format  ${counted(files.length, 'file', 'files')} not formatted`,
    ...files.map((file) => `  ${file}`),
    '  Fix: pnpm format, then commit the changes.',
  ]
}

export function siteTypesMessage(errors: readonly FileProblem[]): string[] {
  return [
    `✖ site-types  ${counted(errors.length, 'error', 'errors')}`,
    ...placed(errors),
    '  Fix: pnpm site:types shows each error in context.',
  ]
}

export function htmlMessage(problems: readonly FileProblem[]): string[] {
  return [
    `✖ html  ${counted(problems.length, 'problem', 'problems')}`,
    ...placed(problems),
    "  Fix: correct the page's source in apps/site/src, then pnpm site:build and pnpm site:html.",
  ]
}

export function linksMessage(broken: readonly BrokenLink[]): string[] {
  const lines = [`✖ links  ${counted(broken.length, 'broken internal link', 'broken internal links')}`]
  for (const [file, links] of grouped(broken, (link) => link.file)) {
    lines.push(`  ${file}`, ...links.map((link) => `    ${link.link}  ${link.reason}`))
  }
  lines.push('  Fix: point the link at a page the build has.')
  return lines
}

export function headersMessage(missing: readonly MissingHeader[]): string[] {
  const header = missing.length === 1 ? '1 security header missing' : `${missing.length} security headers missing`
  return [
    `✖ e2e  ${header}`,
    ...columns(
      missing.map((entry) => [entry.path, entry.header]),
      '  ',
    ),
    "  Fix: firebase.json's headers, and Astro's CSP hashes for any new inline script.",
  ]
}

// The command line. Each check runs its tool from the repo's root, reads the
// tool's machine-readable report, and prints the message, or one ✓ line.

const slash = (file: string): string => file.replaceAll('\\', '/')
const fromRoot = (file: string): string => slash(path.relative(ROOT, path.resolve(ROOT, file)))
const fromSite = (file: string): string => slash(path.relative(SITE, path.resolve(ROOT, file)))

function tool(
  script: string,
  args: readonly string[],
  cwd = ROOT,
  env: NodeJS.ProcessEnv = process.env,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.error !== undefined) throw result.error
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function report(lines: readonly string[], ok: string): number {
  console.log(lines.length === 0 ? ok : lines.join('\n'))
  return lines.length === 0 ? 0 : 1
}

function crashed(job: string, output: string, fix: string): number {
  if (output.trim() !== '') console.log(output.trim())
  console.log([`✖ ${job}  the check couldn't run`, `  Fix: ${fix}`].join('\n'))
  return 1
}

function builtPages(): string[] | undefined {
  if (!existsSync(DIST)) return undefined
  return readdirSync(DIST, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

function noBuild(job: string): number {
  console.log([`✖ ${job}  no built site in apps/site/dist`, '  Fix: pnpm site:build first.'].join('\n'))
  return 1
}

function lint(args: readonly string[]): number {
  const eslint = path.join(SITE, 'node_modules', 'eslint', 'bin', 'eslint.js')
  const fix = args.includes('--fix') ? ['--fix'] : []
  const result = tool(eslint, ['--config', 'apps/site/eslint.config.js', '--format', 'json', ...fix, 'apps/site', 'scripts'])
  let files: {
    filePath: string
    messages: { ruleId: string | null; message: string; line?: number; column?: number; severity: number }[]
  }[]
  try {
    files = JSON.parse(result.stdout) as typeof files
  } catch {
    return crashed('lint', result.stdout + result.stderr, 'pnpm install, then pnpm lint.')
  }
  const problems = files.flatMap((file) =>
    file.messages
      .filter((message) => message.severity === 2)
      .map((message) => ({
        file: fromRoot(file.filePath),
        line: message.line ?? 0,
        column: message.column ?? 0,
        rule: message.ruleId ?? 'parse-error',
        message: message.message,
      })),
  )
  return report(problems.length === 0 ? [] : lintMessage(problems), '✓ lint  no problems in apps/site or scripts')
}

function format(): number {
  const prettier = path.join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
  const result = tool(prettier, ['--list-different', 'apps/site', 'scripts'])
  if (result.status !== 0 && result.status !== 1)
    return crashed('format', result.stdout + result.stderr, 'pnpm install, then pnpm format:check.')
  const files = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map(fromRoot)
  return report(files.length === 0 ? [] : formatMessage(files), '✓ format  every file in apps/site and scripts is formatted')
}

/** A terminal color code, which astro check prints even when asked not to. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

function astroCheck(): number {
  const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
  const result = tool(astro, ['check', '--minimumSeverity', 'error'], SITE, { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' })
  const output = `${result.stdout}\n${result.stderr}`.replace(ANSI, '')
  const errors: FileProblem[] = []
  for (const match of output.matchAll(/^(\S[^\n]*?):(\d+):(\d+) - error (ts\(\d+\)|\S+?):\s*(.*)$/gm)) {
    errors.push({
      file: fromRoot(path.join(SITE, match[1] ?? '')),
      line: Number(match[2]),
      column: Number(match[3]),
      rule: match[4] ?? '',
      message: (match[5] ?? '').trim(),
    })
  }
  if (errors.length === 0 && result.status !== 0) return crashed('site-types', output, 'pnpm install, then pnpm site:types.')
  return report(errors.length === 0 ? [] : siteTypesMessage(errors), '✓ site-types  astro check found no errors')
}

function html(): number {
  const pages = builtPages()
  if (pages === undefined || pages.length === 0) return noBuild('html')
  const validator = path.join(ROOT, 'node_modules', 'html-validate', 'bin', 'html-validate.mjs')
  const result = tool(validator, ['--formatter', 'json', ...pages.map(fromRoot)])
  let files: { filePath: string; messages: { ruleId: string; message: string; line: number; column: number; severity: number }[] }[]
  try {
    files = JSON.parse(result.stdout === '' ? '[]' : result.stdout) as typeof files
  } catch {
    return crashed('html', result.stdout + result.stderr, 'pnpm install, then pnpm site:html.')
  }
  const problems = files.flatMap((file) =>
    file.messages
      .filter((message) => message.severity === 2)
      .map((message) => ({
        file: fromSite(file.filePath),
        line: message.line,
        column: message.column,
        rule: message.ruleId,
        message: message.message,
      })),
  )
  if (problems.length === 0 && result.status !== 0)
    return crashed('html', result.stdout + result.stderr, 'pnpm install, then pnpm site:html.')
  return report(problems.length === 0 ? [] : htmlMessage(problems), `✓ html  ${counted(pages.length, 'page', 'pages')} valid`)
}

interface LycheeEntry {
  url?: string
  status?: { text?: string; details?: string } | string
}

/** lychee's JSON report: the broken links by the file they're in. */
export function lycheeBroken(report: unknown, rootDir: string): BrokenLink[] {
  const body = (report ?? {}) as { error_map?: Record<string, LycheeEntry[]>; fail_map?: Record<string, LycheeEntry[]> }
  const map = body.error_map ?? body.fail_map ?? {}
  const root = slash(path.resolve(rootDir))
  return Object.entries(map).flatMap(([input, entries]) =>
    entries.map((entry) => {
      const url = entry.url ?? ''
      const local = url.startsWith('file://') ? slash(decodeURIComponent(new URL(url).pathname)).replace(/^\/([A-Za-z]:)/, '$1') : undefined
      const hash = local === undefined ? '' : new URL(url).hash
      const link =
        local !== undefined && local.toLowerCase().startsWith(root.toLowerCase()) ? `${local.slice(root.length) || '/'}${hash}` : url
      const text = typeof entry.status === 'string' ? entry.status : [entry.status?.text, entry.status?.details].filter(Boolean).join(': ')
      const reason = /fragment|anchor/i.test(text)
        ? 'no such anchor'
        : /cannot find|not found|no such file|does not exist/i.test(text)
          ? 'no such page'
          : text
      return { file: fromSite(input), link, reason }
    }),
  )
}

function links(args: readonly string[]): number {
  const pages = builtPages()
  if (pages === undefined || pages.length === 0) return noBuild('links')
  const passed = [...args]
  const at = passed.indexOf('--root-dir')
  const rootDir = at >= 0 && passed[at + 1] !== undefined ? path.resolve(ROOT, passed[at + 1] ?? '') : DIST
  if (at >= 0) passed[at + 1] = rootDir
  const temp = mkdtempSync(path.join(tmpdir(), 'lychee-'))
  try {
    const output = path.join(temp, 'report.json')
    const result = spawnSync('lychee', [...passed, '--no-progress', '--format', 'json', '--output', output, fromRoot(DIST)], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    })
    if (result.error !== undefined || !existsSync(output))
      return crashed('links', `${result.stdout ?? ''}${result.stderr ?? ''}`, 'install lychee 0.24.2, then pnpm site:links.')
    const broken = lycheeBroken(JSON.parse(readFileSync(output, 'utf8')), rootDir)
    if (broken.length === 0 && result.status !== 0)
      return crashed('links', `${result.stdout}${result.stderr}`, "pnpm site:links shows lychee's own error.")
    return report(
      broken.length === 0 ? [] : linksMessage(broken),
      `✓ links  every internal link and anchor in ${counted(pages.length, 'page', 'pages')} resolves`,
    )
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

interface Assertion {
  level?: string
  auditId?: string
  auditProperty?: string
  actual?: number
  expected?: number
  url?: string
}

/** LHCI's assertion results, as the budgets they missed. */
export function lighthouseMisses(results: readonly Assertion[]): BudgetMiss[] {
  return results
    .filter((result) => result.level === 'error')
    .map((result) => ({
      metric: result.auditId === 'categories' ? (result.auditProperty ?? 'categories') : (result.auditId ?? 'unknown'),
      value: Number(result.actual),
      budget: Number(result.expected),
    }))
}

/** An LHCI address as the path Hosting serves it at: /index.html is /, and /page.html is /page. */
export function lighthousePage(url: string): string {
  const pathname = url === '' ? '/' : new URL(url).pathname
  return pathname.replace(/(?:\/index)?\.html$/, '') || '/'
}

/** LHCI's missed budgets, grouped by page in the order they're reported. */
export function lighthouseByPage(results: readonly Assertion[]): Map<string, BudgetMiss[]> {
  const groups = new Map<string, BudgetMiss[]>()
  for (const result of results.filter((entry) => entry.level === 'error')) {
    const page = lighthousePage(result.url ?? '')
    groups.set(page, [...(groups.get(page) ?? []), ...lighthouseMisses([result])])
  }
  return groups
}

/** Budgets tighter than lighthouserc.json's for one page, which LHCI can't assert per page without assertMatrix. */
export const PAGE_BUDGETS: Record<string, Record<string, number>> = {
  // Spec 010's S2.5 and SC-001: the hero's sequence shifts nothing.
  '/v2': { 'cumulative-layout-shift': 0 },
}

interface Report {
  requestedUrl?: string
  audits?: Record<string, { numericValue?: number }>
}

/** The pages whose median, over their runs, misses a budget in PAGE_BUDGETS. */
export function pageBudgetMisses(
  reports: readonly Report[],
  budgets: Record<string, Record<string, number>> = PAGE_BUDGETS,
): Map<string, BudgetMiss[]> {
  const misses = new Map<string, BudgetMiss[]>()
  for (const [page, metrics] of Object.entries(budgets)) {
    const runs = reports.filter((entry) => lighthousePage(entry.requestedUrl ?? '') === page)
    if (runs.length === 0) continue
    for (const [metric, budget] of Object.entries(metrics)) {
      const values = runs.map((entry) => entry.audits?.[metric]?.numericValue ?? Number.POSITIVE_INFINITY).sort((a, b) => a - b)
      const middle = Math.floor(values.length / 2)
      const median = values.length % 2 === 1 ? (values[middle] ?? 0) : ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2
      if (median > budget) misses.set(page, [...(misses.get(page) ?? []), { metric, value: median, budget }])
    }
  }
  return misses
}

async function lighthouse(): Promise<number> {
  const pages = builtPages()
  if (pages === undefined || pages.length === 0) return noBuild('lighthouse')
  const env = { ...process.env }
  if (!env.CHROME_PATH) {
    const { chromium } = await import('@playwright/test')
    env.CHROME_PATH = chromium.executablePath()
  }
  const lhci = path.join(ROOT, 'node_modules', '@lhci', 'cli', 'src', 'cli.js')
  const config = path.join(ROOT, 'lighthouserc.json')
  rmSync(path.join(ROOT, '.lighthouseci'), { recursive: true, force: true })
  const collect = tool(lhci, ['collect', `--config=${config}`], ROOT, env)
  if (collect.status !== 0)
    return crashed('lighthouse', collect.stdout + collect.stderr, "the Chromium in the run's container, then pnpm site:lighthouse.")
  const assert = tool(lhci, ['assert', `--config=${config}`], ROOT, env)
  tool(lhci, ['upload', `--config=${config}`], ROOT, env)
  const file = path.join(ROOT, '.lighthouseci', 'assertion-results.json')
  const results = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Assertion[]) : []
  const groups = lighthouseByPage(results)
  const dir = path.join(ROOT, '.lighthouseci')
  const reports = readdirSync(dir)
    .filter((name) => /^lhr-.*\.json$/.test(name))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), 'utf8')) as Report)
  for (const [page, misses] of pageBudgetMisses(reports)) groups.set(page, [...(groups.get(page) ?? []), ...misses])
  if (groups.size === 0 && assert.status !== 0)
    return crashed('lighthouse', assert.stdout + assert.stderr, "pnpm site:lighthouse shows LHCI's own error.")
  const runs = (JSON.parse(readFileSync(config, 'utf8')) as { ci?: { collect?: { numberOfRuns?: number } } }).ci?.collect?.numberOfRuns ?? 1
  const lines = [...groups].flatMap(([page, misses]) => lighthouseMessage(page, runs, misses))
  return report(lines, `✓ lighthouse  every budget met (median of ${runs} runs)`)
}

async function main(args: readonly string[]): Promise<number> {
  const [check = '', ...rest] = args
  if (check === 'lint') return lint(rest)
  if (check === 'format') return format()
  if (check === 'astro-check') return astroCheck()
  if (check === 'html') return html()
  if (check === 'links') return links(rest)
  if (check === 'lighthouse') return lighthouse()
  console.log(['✖ site-report  no such check', '  Fix: name one of lint, format, astro-check, html, links or lighthouse.'].join('\n'))
  return 1
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
