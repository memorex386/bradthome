import { pathToFileURL } from 'node:url'
import { SCRIPTS } from './paths.ts'

// The build's modules, loaded by path so the type check passes before the
// build adds them. Each runs its command line only when it's the entry point,
// so importing it prints nothing. The build exports exactly these shapes.

async function load<T>(file: string): Promise<T> {
  const url: string = pathToFileURL(file).href
  return (await import(url)) as T
}

// scripts/ci/site-report.ts: each tool's findings, turned into the mocks'
// messages (FR-014, C1–C6). Each returns the lines a failing job prints.

export interface A11yViolation {
  /** The mock state and what it shows, such as P2 home, phone, dark. */
  state: string
  /** axe's rule ID, such as color-contrast. */
  rule: string
  /** The WCAG success criterion, such as 1.4.3. */
  wcag: string
  /** The element's selector, from axe's target. */
  target: string
  /** What's wrong, such as 3.9:1, needs 4.5:1. */
  detail: string
}

export interface SnapshotDiff {
  state: string
  pixels: number
  /** The diff image's file name in the run's artifacts. */
  diff: string
}

export interface BudgetMiss {
  /** A Lighthouse category (performance, accessibility, best-practices, seo) or audit (largest-contentful-paint, cumulative-layout-shift, total-blocking-time). */
  metric: string
  /** The median: a category's score from 0 to 1, a time in milliseconds, or the layout shift. */
  value: number
  budget: number
}

/** A problem at a place in a file, path relative to the repo's root with forward slashes. */
export interface FileProblem {
  file: string
  line: number
  column: number
  /** The rule, such as astro/no-unused-css-selector, or ts(2322) for a type error. */
  rule: string
  message: string
}

export interface BrokenLink {
  /** The built page, such as dist/index.html. */
  file: string
  link: string
  reason: string
}

export interface MissingHeader {
  path: string
  header: string
}

export interface SiteReportModule {
  a11yMessage(violations: readonly A11yViolation[]): string[]
  snapshotMessage(diffs: readonly SnapshotDiff[]): string[]
  lighthouseMessage(page: string, runs: number, misses: readonly BudgetMiss[]): string[]
  lintMessage(problems: readonly FileProblem[]): string[]
  formatMessage(files: readonly string[]): string[]
  siteTypesMessage(errors: readonly FileProblem[]): string[]
  htmlMessage(problems: readonly FileProblem[]): string[]
  linksMessage(broken: readonly BrokenLink[]): string[]
  headersMessage(missing: readonly MissingHeader[]): string[]
}

export const loadSiteReport = (): Promise<SiteReportModule> => load(SCRIPTS.siteReport)

// scripts/site/csp.ts: the Content-Security-Policy header from Astro's hashes
// (FR-019, S4.1, C6). pnpm csp writes it into firebase.json, and
// pnpm csp --check fails the build job when it's out of date.

export interface CspModule {
  /** The policy for every built page, from the hashes in each page's CSP meta tag. */
  pagePolicy(pages: readonly string[]): string
  /** firebase.json's parsed config with the policy as the Content-Security-Policy header on every path (**). */
  applyPolicy(config: unknown, policy: string): unknown
  /** No lines when the config already holds the policy, or the build job's failure lines. */
  policyProblems(config: unknown, policy: string): string[]
}

export const loadCsp = (): Promise<CspModule> => load(SCRIPTS.csp)

// scripts/ci/preview-credentials.ts: Google's federated sign-in file (FR-016,
// S3.2). Its command line writes it to $RUNNER_TEMP and names it in
// $GITHUB_ENV as GOOGLE_APPLICATION_CREDENTIALS.

export interface PreviewCredentialsModule {
  /**
   * The external_account file's content, from GCP_WORKLOAD_IDENTITY_PROVIDER,
   * GCP_PREVIEW_SERVICE_ACCOUNT, ACTIONS_ID_TOKEN_REQUEST_URL and
   * ACTIONS_ID_TOKEN_REQUEST_TOKEN. It throws when one is missing.
   */
  credentialsFor(env: NodeJS.ProcessEnv): Record<string, unknown>
}

export const loadPreviewCredentials = (): Promise<PreviewCredentialsModule> => load(SCRIPTS.previewCredentials)

// scripts/ci/preview-deploy.ts: whether to deploy, the channel deploy's
// arguments, its outcome, and the preview's config (FR-015, FR-017, FR-018,
// S3.3, S3.4, S3.6, V2, V3).

/** The parts of GitHub's pull_request event the preview reads. */
export interface PullRequestEvent {
  number: number
  pull_request: {
    number: number
    head: { sha: string; ref: string; repo: { full_name: string; fork: boolean } | null }
    base: { repo: { full_name: string } }
    user: { login: string }
  }
  repository: { full_name: string }
}

export type DeployOutcome = { ok: true; url: string; expires: string } | { ok: false; lines: string[] }

export interface PreviewDeployModule {
  /** V2's lines when the preview skips, or undefined when it deploys. */
  previewSkip(event: PullRequestEvent, env: NodeJS.ProcessEnv): string[] | undefined
  /** The Firebase CLI's arguments for pull request N's channel. */
  deployArgs(pr: number): string[]
  /** The CLI's --json output and exit status, read as the link and expiry, or V3's lines. */
  deployOutcome(stdout: string, status: number | null): DeployOutcome
  /** firebase.json's parsed config with the noindex header added on every path, for firebase.preview.json. */
  previewConfig(config: unknown): unknown
}

export const loadPreviewDeploy = (): Promise<PreviewDeployModule> => load(SCRIPTS.previewDeploy)

// scripts/ci/preview-comment.ts: the one comment with the link (FR-015, S3.1,
// V1). Its command line reads GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_TOKEN,
// PR_NUMBER, PREVIEW_URL, PREVIEW_SHA and PREVIEW_EXPIRES, and edits its own
// earlier comment, found by the marker, or posts one.

export interface PreviewCommentModule {
  /** The hidden marker that finds the comment again, an HTML comment. */
  MARKER: string
  commentBody(preview: { url: string; sha: string; expires: string }): string
}

export const loadPreviewComment = (): Promise<PreviewCommentModule> => load(SCRIPTS.previewComment)

// scripts/ci/nightly-summary.ts: N1 (FR-020, S5.1, S5.2).

export interface NightlyLinks {
  total: number
  broken: readonly { page: string; url: string; reason: string }[]
}

export interface NightlySummaryModule {
  /** Stryker's mutation score from its JSON report, from 0 to 100: detected over valid mutants. */
  mutationScore(report: unknown): number
  /** N1's lines, for the run's summary. score is undefined when the mutation job didn't report. */
  nightlySummary(links: NightlyLinks, score: number | undefined): string[]
}

export const loadNightlySummary = (): Promise<NightlySummaryModule> => load(SCRIPTS.nightlySummary)
