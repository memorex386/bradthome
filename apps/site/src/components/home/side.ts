// The "On the side" section's words and structure (spec 013). Every sentence
// in it is a public claim's text, shown as written, or comes from a project
// file; this file adds only headings and labels, each made of its claims'
// words. VINDecoded is a side project that does well, never the page's
// headline, and Sudoku World is the small card its project file asks for
// (D132). Its stats and links, and its listed sources, link the public
// pages behind the claims at rest (D133, spec 038).
// bradthome.com's small card follows them, with the repo's records counted at
// build (spec 033).

import { statLinksOf, type StatItem } from '../ds/proof.ts'
import { statsOf, type StatLook } from './experience.ts'
import type { Item, StoryClaim } from './hopper.ts'
import { REPO } from './record.ts'

/** A project, as the section reads it from the content model. */
export interface SideProject {
  id: string
  name: string
  role: string
  display: 'card' | 'small'
  url: string
  start?: string
  end?: string
}

/** The section's eyebrow and heading, from the Home v2 board, in the hero's voice. */
export const EYEBROW = 'On the side'
export const HEADING = 'What I build on the side'

/** Where VINDecoded's card points for the whole story: the case study (spec 006). */
export const CASE_STUDY = { label: 'Read the case study', href: '/vindecoded-agents' } as const

/** Where bradthome.com's card points, in place of its own site: the repo (spec 033). Its address is in record.ts. */
export const SOURCE = 'Read the source on GitHub'

/** The line under the counts, around the build's date (spec 033): "Counted from the repo on Nov 11, 2026." One line on a phone. */
export const COUNTED = { before: 'Counted from the repo on ', after: '.' } as const

/**
 * How a project shows: its badge (a project's initials, or a grid for the
 * puzzle), its kicker, the claims it shows in order,
 * and its stats. A kicker's and a stat label's words are its claims', but for
 * the project file's start year.
 */
export interface ProjectLook {
  badge: { letters: string } | 'grid' | 'code'
  kicker: string
  claims: readonly string[]
  /** Each names its claim, and may link that claim's source on the host it names (spec 038). */
  stats?: readonly (StatLook & { claim: string })[]
  caseStudy?: boolean
  /** The repo's records, counted at build, in place of stats (spec 033). */
  records?: true
  /** The card links the repo's source, since its project's site is this page (spec 033). */
  source?: true
  /** Left off the résumé PDFs, Brad's card of 11/11 (spec 033). */
  onPaper?: false
  /** A kicker without "since", so it stays one line on a phone (spec 033). The project file keeps its start. */
  since?: false
}

export const LOOKS: Readonly<Record<string, ProjectLook>> = {
  vindecoded: {
    badge: { letters: 'VD' },
    kicker: 'Vehicle research',
    // Brad's lean weighting (D132): the platform, the downloads and the case study's counts.
    claims: ['vindecoded-2', 'vindecoded-3', 'vindecoded-7'],
    stats: [
      { value: '1M+', label: 'Android downloads · 4.5 stars', claim: 'vindecoded-3', source: 'play.google.com' },
      { value: '400K+', label: 'iOS downloads · 4.7 stars', claim: 'vindecoded-3', source: 'apps.apple.com' },
    ],
    caseStudy: true,
  },
  'sudoku-world': {
    badge: 'grid',
    kicker: 'Game · web, Android and iOS',
    claims: ['sudoku-world-1', 'sudoku-world-2'],
  },
  // The site itself, after Sudoku World and never bigger than VINDecoded's card
  // (Brad's cards of 11/11): what it is, the loop, releases and the chat's evals.
  'bradthome-com': {
    badge: 'code',
    kicker: 'Built in the open',
    claims: ['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4'],
    records: true,
    source: true,
    onPaper: false,
    since: false,
  },
}

/** Each claim's short title, made of words it holds, which names its sparkle (spec 038, D230). */
export const RECEIPT_TITLES: Readonly<Record<string, string>> = {
  'vindecoded-2': 'Vehicle-history and research platform',
  'vindecoded-3': '1.4M+ downloads',
  'vindecoded-7': "The case study's counts",
  'sudoku-world-1': 'Race other players',
  'sudoku-world-2': 'One Angular game on the web, Android and iOS',
  'bradthome-com-1': 'Design, code and process, all public',
  'bradthome-com-2': 'A spec Brad approves',
  'bradthome-com-3': 'Each release, with a written record',
  'bradthome-com-4': 'Its latest eval run, case by case',
}

/**
 * A claim's closing sentence that is a rule for the site, not words for a
 * visitor. The section never shows it, and fails the build if the claim
 * stops ending with it, so a changed claim is read again before it shows.
 */
export const SITE_RULES: Readonly<Record<string, string>> = {
  'vindecoded-7': 'Never say the 1,235 PRs all went through the newer workflow.',
}

/** A claim's words for a visitor: its text, less any closing rule for the site. */
export function visibleText(id: string, text: string): string {
  const rule = SITE_RULES[id]
  if (rule === undefined) return text
  const trimmed = text.trimEnd()
  if (!trimmed.endsWith(rule)) throw new Error(`The claim ${id} no longer ends with its rule for the site.`)
  return trimmed.slice(0, -rule.length).trimEnd()
}

/** A block of a claim's text: a paragraph, or a list of items. */
export type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] }

/** A claim's text as paragraphs and lists: lines starting "- " are list items. */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const last = blocks.at(-1)
    if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2)
      if (last?.kind === 'ul') last.items.push(item)
      else blocks.push({ kind: 'ul', items: [item] })
    } else {
      blocks.push({ kind: 'p', text: trimmed })
    }
  }
  return blocks
}

/** "2015-05" as "since 2015". */
export function sinceOf(project: Pick<SideProject, 'start'>): string | undefined {
  return project.start === undefined ? undefined : `since ${project.start.slice(0, 4)}`
}

/** The projects the résumé PDFs print: all but those whose look stays off paper (spec 033). */
export function onPaper<T extends Pick<SideProject, 'id'>>(projects: readonly T[]): T[] {
  return projects.filter((project) => LOOKS[project.id]?.onPaper !== false)
}

/** A project's card: the full card first, then the small ones. */
export interface ProjectCard {
  project: SideProject
  look: ProjectLook
  kicker: string
  items: Item[]
  stats: StatItem[]
}

/**
 * The cards, full before small, then in the order LOOKS lists them, each with
 * its claims in the look's order. A missing look or claim, a stat whose claim
 * isn't on its card, or a stat's source that isn't in that claim's evidence
 * (spec 038), throws, so the build fails rather than showing less.
 */
export function cardsOf(projects: readonly SideProject[], claims: readonly StoryClaim[]): ProjectCard[] {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  const rank = { card: 0, small: 1 } as const
  const order = Object.keys(LOOKS)
  return [...projects]
    .sort((a, b) => rank[a.display] - rank[b.display] || order.indexOf(a.id) - order.indexOf(b.id))
    .map((project) => {
      const look = LOOKS[project.id]
      if (!look) throw new Error(`The side projects section has no look for ${project.id}.`)
      for (const stat of look.stats ?? []) {
        if (!look.claims.includes(stat.claim)) throw new Error(`A stat on ${project.id} names ${stat.claim}, which its card doesn't show.`)
      }
      const items = look.claims.map((id): Item => {
        const claim = byId.get(id)
        if (!claim) throw new Error(`The side projects section needs the public claim ${id}.`)
        return { id, text: visibleText(id, claim.text), evidence: claim.evidence, title: RECEIPT_TITLES[id] ?? project.name }
      })
      const since = look.since === false ? undefined : sinceOf(project)
      const kicker = since === undefined ? look.kicker : `${look.kicker} · ${since}`
      return { project, look, kicker, items, stats: statsOf(project.id, look.stats ?? [], items) }
    })
}

/**
 * What a card already links (spec 038, D229): its stats' sources, its own
 * site, or the repo for bradthome.com, and the case study. Its sources list
 * doesn't show these again.
 */
export function linksOf(card: Pick<ProjectCard, 'project' | 'look' | 'stats'>): string[] {
  return [...statLinksOf(card.stats), card.look.source ? REPO : card.project.url, ...(card.look.caseStudy ? [CASE_STUDY.href] : [])]
}

/** A link's words: the site's host, as "vindecoded.com". */
export function hostOf(url: string): string {
  return new URL(url).host.replace(/^www\./, '')
}
