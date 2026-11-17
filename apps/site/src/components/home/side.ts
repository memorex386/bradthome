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
  /** The badge shown when the card has no picture of its own: initials, or a glyph. */
  badge: { letters: string } | 'grid' | 'code'
  /**
   * The card's picture in place of its badge (spec 039, D233): an app's App
   * Store icon, by its snapshot's key in content/previews/snapshots.json, so
   * the weekly refresh keeps it current; or the site's own mark, its favicon.
   * With no snapshot, the badge shows, as the hero's GitHub chip does (D226).
   */
  icon?: { snapshot: string } | 'site'
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
  /** The claims the résumé PDFs print, when fewer than the card shows, so they keep two pages (spec 041). */
  paper?: readonly string[]
  /** A kicker without "since", so it stays one line on a phone (spec 033). The project file keeps its start. */
  since?: false
  /** The live pulse in place of stats and plain claims (spec 041, D239). */
  pulse?: PulseLook
}

/**
 * VINDecoded's live pulse (spec 041, D239, D240): its one sentence, three
 * tiles, the stack and the AI features, and one line from the case study.
 * Each part names its claim, and every word but the approved labels is that
 * claim's own, which the build checks. The release and merged-PR tiles show
 * the build's numbers, then the site's own API's (D240).
 */
export interface PulseLook {
  /** The card's one sentence. */
  lead: string
  /** The downloads tile: its total and each store's downloads and stars, all in its claim. */
  downloads: { claim: string; value: string; stores: readonly { name: string; value: string; stars: string }[] }
  /** The stack, as tags, each in its claim. */
  stack: { claim: string; tags: readonly string[] }
  /** The AI features, as the claim's list and closing sentence, under a label in place of its lead. */
  ai: { claim: string }
  /** The case study's counts on one line, each one of the claim's items. */
  study: { claim: string; items: readonly string[] }
}

/** The pulse's labels and lines (spec 041): Brad's approved words, the only words on the card that aren't a claim's. */
export const PULSE = {
  downloads: 'Downloads',
  release: 'Latest iOS release',
  merged: 'Merged PRs',
  mergedSub: 'In the last 30 days',
  stack: 'What I built',
  ai: 'AI in production',
  study: 'From the case study, Oct 28:',
  /** The live line's sources, before its age. */
  live: 'Live from the App Store and GitHub',
  built: 'From the App Store and GitHub',
  how: 'How this works',
  note: 'The site’s own API reads the App Store’s public listing and counts the pull requests merged in VINDecoded’s repo, with a read-only token, at most once an hour, and keeps the numbers. This card asks that API, never Apple or GitHub, and shows the numbers it was built with until it answers.',
  steps: [
    { title: 'App Store · GitHub', text: 'Read-only, at most hourly' },
    { title: 'The site’s API', text: 'Cached in Firestore' },
    { title: 'This card', text: 'The build’s numbers, then fresher ones' },
  ],
  code: 'Read the code on GitHub',
} as const

export const LOOKS: Readonly<Record<string, ProjectLook>> = {
  vindecoded: {
    badge: { letters: 'VD' },
    icon: { snapshot: 'appstore-1191483515' },
    kicker: 'Vehicle research',
    // Brad's live pulse (D239, amending D132's lean card): the platform, the
    // downloads, the stack, the AI features and the case study's counts.
    claims: ['vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-7'],
    paper: ['vindecoded-2', 'vindecoded-3', 'vindecoded-4'],
    caseStudy: true,
    pulse: {
      lead: 'vindecoded-2',
      downloads: {
        claim: 'vindecoded-3',
        value: '1.4M+',
        stores: [
          { name: 'Android', value: '1M+', stars: '4.5' },
          { name: 'iOS', value: '400K+', stars: '4.7' },
        ],
      },
      stack: {
        claim: 'vindecoded-4',
        tags: ['React/TypeScript web app', 'Native Android and iOS', 'Node.js/TypeScript API', 'SQL', 'Firebase', 'Azure'],
      },
      ai: { claim: 'vindecoded-5' },
      study: { claim: 'vindecoded-7', items: ['1,530 test files', '113 runbooks', '46 ADRs'] },
    },
  },
  'sudoku-world': {
    badge: 'grid',
    icon: { snapshot: 'appstore-1544613828' },
    kicker: 'Game · web, Android and iOS',
    claims: ['sudoku-world-1', 'sudoku-world-2'],
  },
  // The site itself, after Sudoku World and never bigger than VINDecoded's card
  // (Brad's cards of 11/11): what it is, the loop, releases and the chat's evals.
  'bradthome-com': {
    badge: 'code',
    icon: 'site',
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
  'vindecoded-4': 'Re-platformed from AngularJS/Cordova',
  'vindecoded-5': 'Shipped production AI features',
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
      if (look.pulse) checkPulse(project.id, look.pulse, items)
      // The case study's line shows three of its claim's items, so its sparkle asks about those, under the claim's
      // own lead, and never about the PR count the card leaves off (spec 041).
      const study = look.pulse?.study
      const shownItems =
        study === undefined
          ? items
          : items.map((item) => (item.id === study.claim ? { ...item, text: studyTextOf(item.text, study.items) } : item))
      const since = look.since === false ? undefined : sinceOf(project)
      const kicker = since === undefined ? look.kicker : `${look.kicker} · ${since}`
      return { project, look, kicker, items: shownItems, stats: statsOf(project.id, look.stats ?? [], shownItems) }
    })
}

/**
 * What a card already links (spec 038, D229): its stats' sources, its own
 * site, or the repo for bradthome.com, and the case study. Its sources list
 * doesn't show these again.
 */
export function linksOf(card: Pick<ProjectCard, 'project' | 'look' | 'stats'> & Partial<Pick<ProjectCard, 'items'>>): string[] {
  const pulse = card.look.pulse
  const stores =
    pulse === undefined ? [] : storeLinksOf(card.items?.find((item) => item.id === pulse.downloads.claim)).map((store) => store.href)
  return [
    ...statLinksOf(card.stats),
    card.look.source ? REPO : card.project.url,
    ...stores,
    ...(card.look.caseStudy ? [CASE_STUDY.href] : []),
  ]
}

/** The site's own mark, which its favicon draws (spec 039, D236). */
export const SITE_MARK = '/favicon.svg'

/** A card's picture, by the path it loads from, or undefined when its badge shows instead (spec 039, D233). */
export function iconOf(look: Pick<ProjectLook, 'icon'>, images: Readonly<Record<string, string | undefined>>): string | undefined {
  if (look.icon === undefined) return undefined
  if (look.icon === 'site') return SITE_MARK
  const image = images[look.icon.snapshot]
  return image === undefined ? undefined : `/previews/${image}`
}

/** A link's words: the site's host, as "vindecoded.com". */
export function hostOf(url: string): string {
  return new URL(url).host.replace(/^www\./, '')
}

/** The words a pulse shows from its claims, each checked against its claim's text. */
function checkPulse(card: string, pulse: PulseLook, items: readonly Item[]): void {
  const textOf = (id: string) => {
    const item = items.find((entry) => entry.id === id)
    if (!item) throw new Error(`The pulse on ${card} names ${id}, which its card doesn't show.`)
    return item.text
  }
  const has = (id: string, words: string) => {
    if (!textOf(id).toLowerCase().includes(words.toLowerCase()))
      throw new Error(`The pulse on ${card} shows "${words}", which ${id} doesn't say.`)
  }
  textOf(pulse.lead)
  has(pulse.downloads.claim, pulse.downloads.value)
  has(pulse.downloads.claim, PULSE.downloads)
  for (const store of pulse.downloads.stores)
    for (const words of [`${store.name} has ${store.value}`, `(${store.stars} stars)`]) has(pulse.downloads.claim, words)
  for (const tag of pulse.stack.tags) has(pulse.stack.claim, tag)
  const ai = blocksOf(textOf(pulse.ai.claim))
  if (ai[0]?.kind !== 'p' || ai[1]?.kind !== 'ul')
    throw new Error(`The pulse on ${card} needs ${pulse.ai.claim} as a lead, a list and a closing sentence.`)
  const listed = blocksOf(textOf(pulse.study.claim)).flatMap((block) => (block.kind === 'ul' ? block.items : []))
  for (const item of pulse.study.items) {
    if (!listed.includes(item)) throw new Error(`The pulse on ${card} shows "${item}", which isn't an item of ${pulse.study.claim}.`)
  }
}

/** The numbers a pulse is built with (spec 041): the weekly snapshots' App Store release and merged-PR count. */
export interface PulseBuild {
  version: string
  /** The release's day, YYYY-MM-DD. */
  released: string
  /** The iOS rating, when it has 100 ratings or more (D143). */
  stars?: string
  merged: number
  /** The older of the two snapshots' days, which the line dates the numbers by. */
  asOf: string
}

/** A day as "Nov 10", in UTC, as the build and the visitor's script both write it. */
export function shortDayOf(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** The store links a pulse's footer shows (spec 041): its downloads claim's App Store and Google Play listings, in that order. */
export function storeLinksOf(item: Pick<Item, 'evidence'> | undefined): { key: 'appstore' | 'play'; label: string; href: string }[] {
  const evidence = item?.evidence ?? []
  const apple = evidence.find((href) => new URL(href).hostname === 'apps.apple.com')
  const play = evidence.find((href) => new URL(href).hostname === 'play.google.com')
  return [
    ...(apple === undefined ? [] : [{ key: 'appstore' as const, label: 'App Store', href: apple }]),
    ...(play === undefined ? [] : [{ key: 'play' as const, label: 'Google Play', href: play }]),
  ]
}

/** Where "Read the code on GitHub" points: the API's pulse, in the public repo (spec 041). */
export const PULSE_CODE = `${REPO}/blob/main/apps/chat-api/src/pulse.ts`

/**
 * The numbers a pulse is built with (spec 041, D240): the weekly refresh's
 * release and merged-PR count, dated by the older of their two days, and the
 * App Store snapshot's rating, shown from 100 ratings (D143).
 */
export function pulseBuildOf(
  pulse: { appStore: { fetched: string; version: string; released: string }; github: { fetched: string; merged: number } },
  app: { rating?: number; ratings?: number } | undefined,
): PulseBuild {
  const stars = app?.rating !== undefined && (app.ratings ?? 0) >= 100 ? app.rating.toFixed(1) : undefined
  return {
    version: pulse.appStore.version,
    released: pulse.appStore.released,
    ...(stars === undefined ? {} : { stars }),
    merged: pulse.github.merged,
    asOf: pulse.appStore.fetched < pulse.github.fetched ? pulse.appStore.fetched : pulse.github.fetched,
  }
}

/** A claim written as a lead and a list, with only the items given: "The case study's counts, measured on 10/28:" and three. */
export function studyTextOf(text: string, items: readonly string[]): string {
  const lead = blocksOf(text)[0]
  if (lead?.kind !== 'p') throw new Error('A study line needs its claim to open with a lead.')
  return [lead.text, ...items.map((item) => `- ${item}`)].join('\n')
}
