import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { SPEC_DIR } from '../helpers/paths.ts'

// The evidence of real runs, which only GitHub and Google can show (D78, D82).
// The build records it in specs/003-skeleton-and-pipeline/evidence/ci-runs.md,
// in this shape:
//
//   ## Planted failures
//   | State | Planted | Failing job | Required check | First try | Run |
//   one row per planted failure in Stories 2 and 4, in the private sandbox
//   repo: C1 to C3 and C6 once each, C4 for lint, format and site-types, C5
//   for html and links. The required check is ci / gate: failure.
//
//   ## Lighthouse
//   | Metric | Median | Budget |
//   the medians of this pull request's lighthouse job, one row each for
//   performance, accessibility, best-practices, seo (scores from 0 to 100),
//   largest-contentful-paint (s), cumulative-layout-shift and
//   total-blocking-time (ms), then a line linking the run
//
//   ## Keys
//   - `gh secret list`: PRIVATE_TERMS only
//   - `gcloud iam service-accounts keys list --iam-account=preview-deployer@bradthome.iam.gserviceaccount.com --managed-by=user`: none
//
//   ## Sign-in
//   - provider condition: `assertion.repository_id == '1440242332'`
//   - impersonation: `roles/iam.workloadIdentityUser` for
//     `principalSet://…/attribute.repository_id/1440242332`, the only binding
//   each line as gcloud describes the provider and the service account's policy
//
//   ## Preview headers
//   | Header | Value |
//   the real preview's response to / for each header firebase.json sets, plus
//   X-Robots-Tag, then a line linking the run that deployed it
//
//   ## Measured after the merge
//   - SC-003 … reported in slice 2.2's pull request
//   - SC-006 … reported in slice 2.2's pull request
//
// A Run cell is a Markdown link to the run on GitHub.

const FILE = path.join(SPEC_DIR, 'evidence', 'ci-runs.md')
const SANDBOX_RUN = /\]\(https:\/\/github\.com\/bradthome-agent\/bradthome-ci-sandbox\/actions\/runs\/\d+(?:\/job\/\d+)?\)/
const REPO_RUN = /\]\(https:\/\/github\.com\/memorex386\/bradthome\/actions\/runs\/\d+(?:\/job\/\d+)?\)/

function section(heading: string): string {
  const lines = readFileSync(FILE, 'utf8').split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === heading)
  expect(start, `${heading} in ${path.basename(FILE)}`).toBeGreaterThanOrEqual(0)
  const end = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line))
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n')
}

/** A section's table rows, as trimmed cells, without the header and divider rows. */
function rows(heading: string, columns: readonly string[]): string[][] {
  const table = section(heading)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
  expect(table[0], `${heading}'s header`).toEqual([...columns])
  return table.slice(2)
}

const PLANTED: [string, string][] = [
  ['C1', 'e2e'],
  ['C2', 'e2e'],
  ['C3', 'lighthouse'],
  ['C4', 'lint'],
  ['C4', 'format'],
  ['C4', 'site-types'],
  ['C5', 'html'],
  ['C5', 'links'],
  ['C6', 'e2e'],
]

describe('the planted failures', () => {
  test('SC-004 C1 C2 C3 C4 C5 C6 each planted failure in Stories 2 and 4 failed its job and the gate on the first try, in the sandbox', () => {
    const table = rows('## Planted failures', ['State', 'Planted', 'Failing job', 'Required check', 'First try', 'Run'])
    for (const [state, job] of PLANTED) {
      const row = table.find((cells) => cells[0] === state && cells[2] === job)
      expect(row, `${state} ${job}`).toBeDefined()
      expect(row?.[1], `${state} ${job}: what was planted`).not.toBe('')
      expect(row?.[3], `${state} ${job}`).toBe('ci / gate: failure')
      expect(row?.[4], `${state} ${job}`).toBe('yes')
      expect(row?.[5], `${state} ${job}`).toMatch(SANDBOX_RUN)
    }
  })
})

describe("the page's Lighthouse medians", () => {
  test("SC-001 the phone profile's medians are inside the budgets: LCP 2.0 s, CLS 0.05 and TBT 150 ms or less", () => {
    const table = rows('## Lighthouse', ['Metric', 'Median', 'Budget'])
    const median = (metric: string): number => {
      const row = table.find((cells) => cells[0] === metric)
      expect(row, metric).toBeDefined()
      return Number.parseFloat(row?.[1] ?? 'NaN')
    }
    expect(median('largest-contentful-paint')).toBeLessThanOrEqual(2.0)
    expect(median('cumulative-layout-shift')).toBeLessThanOrEqual(0.05)
    expect(median('total-blocking-time')).toBeLessThanOrEqual(150)
    expect(median('performance')).toBeGreaterThanOrEqual(95)
    for (const metric of ['accessibility', 'best-practices', 'seo']) expect(median(metric), metric).toBe(100)
    expect(section('## Lighthouse')).toMatch(REPO_RUN)
  })
})

describe('no Google key', () => {
  test('SC-005 the repo holds no secret for Google, and the preview service account has no user-managed key', () => {
    const keys = section('## Keys')
    expect(keys).toMatch(/^- `gh secret list`: (?:none|PRIVATE_TERMS only)$/m)
    expect(keys).toMatch(/^- `gcloud iam service-accounts keys list --iam-account=preview-deployer@bradthome\.iam\.gserviceaccount\.com --managed-by=user`: none$/m)
  })
})

describe('only this repo signs in', () => {
  test("S3.2 FR-016 the provider admits only this repo's runs, and only they can act as the preview service account", () => {
    const signIn = section('## Sign-in')
    expect(signIn).toMatch(/^- provider condition: `assertion\.repository_id == '1440242332'`$/m)
    expect(signIn).toMatch(/^- impersonation: `roles\/iam\.workloadIdentityUser` for `principalSet:\/\/\S+\/attribute\.repository_id\/1440242332`, the only binding$/m)
    expect(signIn).not.toMatch(/repository_owner_id\/|\/\*`/)
  })
})

describe("the real preview's headers", () => {
  test('S3.6 S4.1 FR-018 FR-019 the deployed preview sends every header the emulator sends, and noindex', () => {
    const table = rows('## Preview headers', ['Header', 'Value'])
    const value = (header: string): string => {
      const row = table.find((cells) => cells[0]?.toLowerCase() === header.toLowerCase())
      expect(row, header).toBeDefined()
      return (row?.[1] ?? '').replace(/^`|`$/g, '')
    }
    expect(value('Content-Security-Policy')).toMatch(/^default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'/)
    // Hosting sends its own HSTS on web.app addresses in place of firebase.json's,
    // so the preview's is at least a year with subdomains. The emulator test
    // checks firebase.json's own value (D99).
    const hsts = value('Strict-Transport-Security')
    expect(Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0)).toBeGreaterThanOrEqual(31_536_000)
    expect(hsts).toMatch(/includeSubDomains/)
    expect(value('X-Content-Type-Options')).toBe('nosniff')
    expect(value('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(value('Permissions-Policy')).not.toBe('')
    expect(value('X-Robots-Tag')).toBe('noindex')
    expect(section('## Preview headers')).toMatch(REPO_RUN)
  })
})

describe('measured after the merge', () => {
  test("SC-003 SC-006 the evidence leaves the preview times and Hosting's use to slice 2.2's pull request, after two weeks of use", () => {
    const later = section('## Measured after the merge')
    expect(later).toMatch(/^- SC-003\b.*slice 2\.2/m)
    expect(later).toMatch(/^- SC-006\b.*slice 2\.2/m)
  })
})
