import { yearsSince } from './years.ts'

// The role tiles' pictures (spec 036): the years bar on each tile and the
// detail's timeline of the jobs. Both are SVG drawn from the job and project
// files' months, with each place as an x and a width in a 0–100 viewBox, so
// the page needs no inline style and the CSP doesn't change. The build draws
// them for its own month.

/** A month as YYYY-MM, or "present". */
type Month = string

/** A month's place in time: the months since year 0. */
const indexOf = (month: Month): number => {
  const [year, number] = month.split('-').map(Number)
  return (year ?? 0) * 12 + (number ?? 1) - 1
}

/** The year and month of a day in Dallas–Fort Worth's time, where Brad works and the build dates its counts (spec 033). */
export function monthNow(day: Date): [number, number] {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric' }).formatToParts(day)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return [value('year'), value('month')]
}

/** The build's count of a role's years, from its start month to the build's month. */
export const builtYears = (since: string, day: Date): number => yearsSince(since, ...monthNow(day))

/** A stretch on a line: where it starts and how wide it is, out of 100. */
export interface Span {
  x: number
  width: number
}

const round = (value: number): number => Math.round(value * 100) / 100

/** Places a stretch of months on a line that runs from `from` to `to`. A stretch to "present" runs to the end. */
function spanOf(start: Month, end: Month, from: number, to: number): Span {
  const a = Math.max(indexOf(start), from)
  const b = end === 'present' ? to : Math.min(indexOf(end) + 1, to)
  return { x: round(((a - from) / (to - from)) * 100), width: round((Math.max(b - a, 0) / (to - from)) * 100) }
}

/** The month after a day's month, as an index: where "now" ends a line. */
const endOf = (day: Date): number => {
  const [year, month] = monthNow(day)
  return year * 12 + month
}

/**
 * A tile's years bar: the whole career on one line, from the first job's
 * start to now, with the role's years as the stretch at its end.
 */
export function barOf(since: string, careerStart: Month, day: Date): Span {
  return spanOf(since, 'present', indexOf(careerStart), endOf(day))
}

export interface TimelineJob {
  id: string
  company: string
  start: Month
  end: Month
}

export interface Timeline {
  /** The first year on the line, which its left end shows. */
  from: number
  jobs: (TimelineJob & Span)[]
  side?: { label: string; since: Month } & Span
}

/**
 * The detail's timeline: the role's jobs on one line, and its side project on
 * a dashed line under them, from the January of the earliest start to now.
 */
export function timelineOf(jobs: readonly TimelineJob[], side: { label: string; since: Month } | undefined, day: Date): Timeline {
  const starts = [...jobs.map((job) => indexOf(job.start)), ...(side ? [indexOf(side.since)] : [])]
  const first = Math.min(...starts)
  const from = first - (first % 12)
  const to = endOf(day)
  return {
    from: Math.floor(from / 12),
    jobs: jobs.map((job) => ({ ...job, ...spanOf(job.start, job.end, from, to) })),
    side: side ? { ...side, ...spanOf(side.since, 'present', from, to) } : undefined,
  }
}

/** A job's years for the timeline's legend: "2015 – 2017", or one year when it starts and ends in it. */
export function legendYearsOf(start: Month, end: Month): string {
  const a = start.slice(0, 4)
  const b = end === 'present' ? 'now' : end.slice(0, 4)
  return a === b ? a : `${a} – ${b}`
}
