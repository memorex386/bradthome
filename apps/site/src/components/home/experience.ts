// The Experience section's words and structure (spec 012). Every sentence in
// it is a public claim's text, shown as written, or comes from a job file;
// this file adds only headings and labels, each made of its claims' words.
// How much room a job gets comes from its job file's `display` (D130):
// Bleacher Report is featured, Bottle Rocket and BookShout are cards, and
// RealPage and the enterprise IT years are one dated line each. Hopper has
// its own section (spec 011), and the timeline links it.

import { statHrefOf, type StatItem } from '../ds/proof.ts'
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

/**
 * How a featured or card job shows: its kicker, the claims it shows in order,
 * its tags and stats. A tag list's label is a word of its claims, or "Tags",
 * spec 011's fixed name for a card's list. A stat may name the claim it comes
 * from, and link that claim's source on the host it names (spec 038).
 */
export interface JobLook {
  kicker: string
  claims: readonly string[]
  tags?: { label: string; items: readonly string[] }
  stats?: readonly StatLook[]
}

/** A stat as a look writes it: its figure and label, and the claim and host of the source it links. */
export interface StatLook {
  value: string
  label: string
  claim?: string
  source?: string
}

export const LOOKS: Readonly<Record<string, JobLook>> = {
  'bleacher-report': {
    kicker: 'Sports media',
    claims: ['bleacher-report-1', 'bleacher-report-2', 'bleacher-report-3'],
    stats: [
      { value: '10M+', label: "B/R's app installs on Google Play", claim: 'bleacher-report-3', source: 'play.google.com' },
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
    tags: { label: 'Tags', items: ['Kotlin', 'Architecture Components', 'RxJava 2'] },
  },
}

/** Each claim's short title, made of words it holds, which names its sparkle (spec 038, D230). */
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

/** A card or the featured job, with its claims and its stats as they show. */
export interface JobCard {
  job: ExperienceJob
  look: JobLook
  items: Item[]
  stats: StatItem[]
}

/**
 * A card's stats as they show (spec 038, D229). A linked stat's link is the
 * one URL on its named host in its claim's evidence, and that claim must be
 * on the card, so a stat links only its claim's evidence; anything else
 * fails the build.
 */
export function statsOf(card: string, stats: readonly StatLook[], items: readonly Item[]): StatItem[] {
  return stats.map(({ value, label, claim, source }): StatItem => {
    if (claim === undefined) {
      if (source !== undefined) throw new Error(`A stat on ${card} links ${source} without naming its claim.`)
      return { value, label }
    }
    const item = items.find((entry) => entry.id === claim)
    if (!item) throw new Error(`A stat on ${card} names ${claim}, which its card doesn't show.`)
    return source === undefined ? { value, label } : { value, label, href: statHrefOf(item, source) }
  })
}

/**
 * The featured job and the cards, newest first, each with its claims in the
 * look's order. A missing look or claim throws, so the build fails rather
 * than showing less.
 */
export function cardsOf(jobs: readonly ExperienceJob[], claims: readonly StoryClaim[]): { featured: JobCard[]; cards: JobCard[] } {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  const card = (job: ExperienceJob): JobCard => {
    const look = LOOKS[job.id]
    if (!look) throw new Error(`The Experience section has no look for ${job.id}.`)
    // Only the featured card shows stats, so a card's stats would link a source nowhere (spec 038's review).
    if (job.display !== 'featured' && (look.stats?.length ?? 0) > 0)
      throw new Error(`The Experience section shows stats only on its featured card, so ${job.id}'s would show nowhere.`)
    const items = look.claims.map((id): Item => {
      const claim = byId.get(id)
      if (!claim) throw new Error(`The Experience section needs the public claim ${id}.`)
      return { id, text: claim.text, evidence: claim.evidence, title: RECEIPT_TITLES[id] ?? job.company }
    })
    return { job, look, items, stats: statsOf(job.id, look.stats ?? [], items) }
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

/** Months since year 0 of a YYYY-MM month. */
const monthIndex = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1

/**
 * Each job's bar, from January of the first job's year to the end of the
 * year of the latest month any job names, in percent. A job that ends
 * "present" runs to the end. The span comes from the content alone, so the
 * same content always draws the same bars.
 */
export function barsOf(jobs: readonly ExperienceJob[]): Map<string, Bar> {
  const months = jobs
    .flatMap((job) => [job.start, job.end])
    .filter((value) => value !== 'present')
    .map(monthIndex)
  const first = Math.min(...months)
  const last = Math.max(...months)
  const from = first - (first % 12)
  const to = last - (last % 12) + 12
  const span = to - from
  const round = (value: number) => Math.round(value * 100) / 100
  return new Map(
    jobs.map((job) => {
      const start = monthIndex(job.start) - from
      const end = (job.end === 'present' ? to : monthIndex(job.end) + 1) - from
      return [job.id, { x: round((start / span) * 100), width: round(((end - start) / span) * 100) }]
    }),
  )
}
