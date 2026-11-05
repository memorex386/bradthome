// The "On the side" section's words and structure (spec 013). Every sentence
// in it is a public claim's text, shown as written, or comes from a project
// file; this file adds only headings and labels, each made of its claims'
// words. VINDecoded is a side project that does well, never the page's
// headline, and Sudoku World is the small card its project file asks for
// (D132). The receipts link the public pages behind the claims (D133).

import type { Item, StoryClaim } from './hopper.ts'

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

/**
 * How a project shows: its badge (a project's initials, or a grid for the
 * puzzle), its kicker, the claims it shows in order,
 * and its stats. A kicker's and a stat label's words are its claims', but for
 * the project file's start year.
 */
export interface ProjectLook {
  badge: { letters: string } | 'grid'
  kicker: string
  claims: readonly string[]
  stats?: readonly { value: string; label: string; claim: string }[]
  caseStudy?: boolean
}

export const LOOKS: Readonly<Record<string, ProjectLook>> = {
  vindecoded: {
    badge: { letters: 'VD' },
    kicker: 'Vehicle research',
    // Brad's lean weighting (D132): the platform, the downloads and the case study's counts.
    claims: ['vindecoded-2', 'vindecoded-3', 'vindecoded-7'],
    stats: [
      { value: '1M+', label: 'Android downloads · 4.5 stars', claim: 'vindecoded-3' },
      { value: '400K+', label: 'iOS downloads · 4.7 stars', claim: 'vindecoded-3' },
    ],
    caseStudy: true,
  },
  'sudoku-world': {
    badge: 'grid',
    kicker: 'Game · web, Android and iOS',
    claims: ['sudoku-world-1', 'sudoku-world-2'],
  },
}

/** Each receipt's short title, made of words its claim holds. */
export const RECEIPT_TITLES: Readonly<Record<string, string>> = {
  'vindecoded-2': 'Vehicle-history and research platform',
  'vindecoded-3': '1.4M+ downloads',
  'vindecoded-7': "The case study's counts",
  'sudoku-world-1': 'Race other players',
  'sudoku-world-2': 'One Angular game, three platforms',
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

/** A project's card: the full card first, then the small ones. */
export interface ProjectCard {
  project: SideProject
  look: ProjectLook
  kicker: string
  items: Item[]
}

/**
 * The cards, full before small, each with its claims in the look's order,
 * numbered on from the receipts above it (`first`). A missing look or claim,
 * or a stat whose claim isn't on its card, throws, so the build fails rather
 * than showing less.
 */
export function cardsOf(projects: readonly SideProject[], claims: readonly StoryClaim[], first: number): ProjectCard[] {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  let n = first - 1
  const rank = { card: 0, small: 1 } as const
  return [...projects]
    .sort((a, b) => rank[a.display] - rank[b.display] || a.name.localeCompare(b.name))
    .map((project) => {
      const look = LOOKS[project.id]
      if (!look) throw new Error(`The side projects section has no look for ${project.id}.`)
      for (const stat of look.stats ?? []) {
        if (!look.claims.includes(stat.claim)) throw new Error(`A stat on ${project.id} names ${stat.claim}, which its card doesn't show.`)
      }
      const items = look.claims.map((id): Item => {
        const claim = byId.get(id)
        if (!claim) throw new Error(`The side projects section needs the public claim ${id}.`)
        return {
          id,
          n: ++n,
          text: visibleText(id, claim.text),
          kind: claim.evidence.length > 0 ? 'proof' : 'ask',
          evidence: claim.evidence,
          title: RECEIPT_TITLES[id] ?? project.name,
        }
      })
      const since = sinceOf(project)
      return { project, look, kicker: since === undefined ? look.kicker : `${look.kicker} · ${since}`, items }
    })
}

/** A link's words: the site's host, as "vindecoded.com". */
export function hostOf(url: string): string {
  return new URL(url).host.replace(/^www\./, '')
}
