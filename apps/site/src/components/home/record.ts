import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

// The repo's own records, counted when the site is built (spec 033): the
// decision records in docs/decisions, the specs in specs and the release
// records in docs/releases. Nothing is fetched, at build or when a visitor
// views the page (D48): the build reads the folders of the checkout it builds
// from, and the card dates the counts by the build. A folder that's missing
// fails the build, so a count is never a guess. Plain Node, so the tests
// count the same folders the same way.

/** The repo on GitHub, where every record the counts name can be read. */
export const REPO = 'https://github.com/memorex386/bradthome'

export type RecordKind = 'decisions' | 'specs' | 'releases'

export interface RecordFolder {
  kind: RecordKind
  /** The folder, from the repo's root. */
  folder: string
  /** What counts in it: decision records and release records are files, specs are folders. */
  entry: RegExp
  dirs: boolean
  /** The count's words on the card. */
  label: string
  /** Where the count links: the records themselves, on GitHub. */
  href: string
}

/** The three counts, in the card's order. A rehearsal or an index never counts. */
export const RECORDS: readonly RecordFolder[] = [
  {
    kind: 'decisions',
    folder: 'docs/decisions',
    entry: /^\d{4}-[a-z0-9-]+\.md$/,
    dirs: false,
    label: 'decisions',
    href: `${REPO}/blob/main/docs/decisions/README.md`,
  },
  { kind: 'specs', folder: 'specs', entry: /^\d{3}-[a-z0-9-]+$/, dirs: true, label: 'specs', href: `${REPO}/tree/main/specs` },
  {
    kind: 'releases',
    folder: 'docs/releases',
    entry: /^v\d+\.\d+\.\d+\.md$/,
    dirs: false,
    label: 'releases',
    href: `${REPO}/tree/main/docs/releases`,
  },
]

/** The counts and the build's date, as the card shows them. */
export interface Records {
  counts: Readonly<Record<RecordKind, number>>
  /** The day the build counted them, as YYYY-MM-DD in Dallas–Fort Worth's time. */
  counted: string
}

/** The repo's root: the nearest folder at or above `from` that holds pnpm-workspace.yaml. */
export function repoRootOf(from: string): string {
  let dir = path.resolve(from)
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error(`No repo root above ${from}: the records' counts need the checkout the site is built from.`)
    dir = parent
  }
}

/** How many records each folder holds. */
export function countsIn(root: string): Record<RecordKind, number> {
  const counts = { decisions: 0, specs: 0, releases: 0 }
  for (const record of RECORDS) {
    const dir = path.join(root, record.folder)
    if (!existsSync(dir)) throw new Error(`The records' counts need ${record.folder}, which this checkout doesn't have.`)
    counts[record.kind] = readdirSync(dir, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() === record.dirs && record.entry.test(entry.name),
    ).length
  }
  return counts
}

const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
const LABEL = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })

/** A moment's day in Dallas–Fort Worth, as YYYY-MM-DD. */
export function dayOf(now: Date): string {
  return DAY.format(now)
}

/** "2026-11-11" as "Nov 11, 2026". */
export function dateLabelOf(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`${day} isn't a YYYY-MM-DD day.`)
  return LABEL.format(new Date(`${day}T00:00:00Z`))
}

/** The counts for the build that runs now, from the checkout around `from`. */
export function recordsOf(from: string, now: Date): Records {
  return { counts: countsIn(repoRootOf(from)), counted: dayOf(now) }
}

const taken = new Map<string, Records>()

/**
 * The counts for this build, taken once per checkout and kept, so every page the
 * build writes shows the same counts and day, even when the build runs across
 * midnight (S1.2). A dev server keeps them until it restarts.
 */
export function buildRecordsOf(from: string, now: () => Date = () => new Date()): Records {
  const root = repoRootOf(from)
  const records = taken.get(root) ?? recordsOf(root, now())
  taken.set(root, records)
  return records
}
