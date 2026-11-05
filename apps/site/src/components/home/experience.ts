// The Experience section's words and structure (spec 012). Every sentence in
// it is a public claim's text, shown as written, or comes from a job file;
// this file adds only headings and labels, each made of its claims' words.
// How much room a job gets comes from its job file's `display` (D130):
// Bleacher Report is featured, Bottle Rocket and BookShout are cards, and
// RealPage and the enterprise IT years are one dated line each. Hopper has
// its own section (spec 011), and the timeline links it.

import { monthOf, type Item, type StoryClaim } from './hopper.ts'

/** A job, as the section reads it from the content model. */
export interface ExperienceJob {
  id: string
  company: string
  title: string
  start: string
  end: string
  display: 'story' | 'featured' | 'card' | 'line'
  summary?: string
}

/** The section's eyebrow and heading. Each heading word is in a claim. */
export const EYEBROW = 'Experience · Before Hopper'
export const HEADING = 'Android for brands, a startup and a sports media platform'

/** The timeline's name, and where its Hopper row goes. */
export const TIMELINE_LABEL = 'Timeline, newest first'
export const HOPPER_HREF = '#hopper'

/** The education line's label. Its words are the education claim's. */
export const EDUCATION_LABEL = 'Education'

/** How a featured or card job shows: its kicker, the claims it shows in order, its tags and stats. */
export interface JobLook {
  kicker: string
  claims: readonly string[]
  tags?: { label: string; items: readonly string[] }
  stats?: readonly { value: string; label: string }[]
}

export const LOOKS: Readonly<Record<string, JobLook>> = {
  'bleacher-report': {
    kicker: 'Sports media',
    claims: ['bleacher-report-1', 'bleacher-report-2', 'bleacher-report-3'],
    stats: [
      { value: '10M+', label: "B/R's app installs on Google Play" },
      { value: 'Promoted', label: 'Senior Android Developer, Dec 2020' },
    ],
  },
  'bottle-rocket': {
    kicker: 'Brands',
    claims: ['bottle-rocket-2'],
    tags: { label: 'Brands', items: ['Coca-Cola Freestyle', 'AskPETMD', 'Starwood SPG', 'Chewy'] },
  },
  bookshout: {
    // Brad's wording for the move (D130's card): the claim behind it is a note, so it shows only as this label.
    kicker: 'Startup bet',
    claims: ['bookshout-2', 'bookshout-3'],
    tags: { label: 'Stack', items: ['Kotlin', 'Architecture Components', 'RxJava 2'] },
  },
}

/** Each receipt's short title, made of words its claim holds. */
export const RECEIPT_TITLES: Readonly<Record<string, string>> = {
  'bleacher-report-1': 'Promoted, Dec 2020',
  'bleacher-report-2': 'Android for a sports media platform',
  'bleacher-report-3': '10M+ installs on Google Play',
  'bottle-rocket-2': 'Native Android apps for brands',
  'bookshout-2': 'Modernized the Android app',
  'bookshout-3': 'Rebuilt the ebook reader',
}

/** "2018-04" to "2019-09" as "Apr 2018 – Sep 2019". */
export function datesOf(job: Pick<ExperienceJob, 'start' | 'end'>): string {
  return `${monthOf(job.start)} – ${monthOf(job.end)}`
}

/** Years only, "2008 – 2015", for a job whose summary gives only years. */
export function yearsOf(job: Pick<ExperienceJob, 'start' | 'end'>): string {
  const year = (value: string) => (value === 'present' ? 'Present' : value.slice(0, 4))
  return `${year(job.start)} – ${year(job.end)}`
}

/** A line job's dates: years when it has a summary, which names only years ("enterprise IT, 2008–2015"), months otherwise. */
export function lineDatesOf(job: ExperienceJob): string {
  return job.summary === undefined ? datesOf(job) : yearsOf(job)
}

/** The anchor of a job's card or line in the section, which its timeline row links. */
export function anchorOf(id: string): string {
  return id === 'hopper' ? HOPPER_HREF : `#experience-${id}`
}

/** Newest first, by start month. */
export function byNewest(jobs: readonly ExperienceJob[]): ExperienceJob[] {
  return [...jobs].sort((a, b) => b.start.localeCompare(a.start))
}

/** A card or the featured job, with its claims numbered from `first`. */
export interface JobCard {
  job: ExperienceJob
  look: JobLook
  items: Item[]
}

/**
 * The featured job and the cards, newest first, each with its claims in the
 * look's order, numbered on from the receipts above it (`first`). A missing
 * look or claim throws, so the build fails rather than showing less.
 */
export function cardsOf(
  jobs: readonly ExperienceJob[],
  claims: readonly StoryClaim[],
  first: number,
): { featured: JobCard[]; cards: JobCard[] } {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  let n = first - 1
  const card = (job: ExperienceJob): JobCard => {
    const look = LOOKS[job.id]
    if (!look) throw new Error(`The Experience section has no look for ${job.id}.`)
    const items = look.claims.map((id): Item => {
      const claim = byId.get(id)
      if (!claim) throw new Error(`The Experience section needs the public claim ${id}.`)
      return {
        id,
        n: ++n,
        text: claim.text,
        kind: claim.evidence.length > 0 ? 'proof' : 'ask',
        evidence: claim.evidence,
        title: RECEIPT_TITLES[id] ?? job.company,
      }
    })
    return { job, look, items }
  }
  const newest = byNewest(jobs)
  const featured = newest.filter((job) => job.display === 'featured').map(card)
  const cards = newest.filter((job) => job.display === 'card').map(card)
  return { featured, cards }
}

/** A timeline row's bar, as a share of the years the timeline spans. */
export interface Bar {
  x: number
  width: number
}

/** Months since year 0, with "present" read as `today`. */
const monthIndex = (value: string, today: string) => {
  const at = value === 'present' ? today : value
  return Number(at.slice(0, 4)) * 12 + Number(at.slice(5, 7)) - 1
}

/** Each job's bar, from January of the first job's year to the end of the last job's year, in percent. */
export function barsOf(jobs: readonly ExperienceJob[], today = '2026-12'): Map<string, Bar> {
  const first = Math.min(...jobs.map((job) => monthIndex(job.start, today)))
  const from = first - (first % 12)
  const last = Math.max(...jobs.map((job) => monthIndex(job.end, today)))
  const to = last - (last % 12) + 12
  const span = to - from
  const round = (value: number) => Math.round(value * 100) / 100
  return new Map(
    jobs.map((job) => {
      const start = monthIndex(job.start, today) - from
      const end = monthIndex(job.end, today) + 1 - from
      return [job.id, { x: round((start / span) * 100), width: round(((end - start) / span) * 100) }]
    }),
  )
}
