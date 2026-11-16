// The share cards (spec 039, D232): the picture an app shows when someone
// pastes a link to the site. Each is a 1200 × 630 PNG drawn when the site is
// built, from its page's own words and data, by scripts/site/share-cards.ts,
// as the résumé PDFs are. Visitors never load them; only an app that unfurls
// a link fetches one, so the pages' weight and the CSP don't change.
//
// Six pages have a card of their own: the home, the three role pages, the
// essay and /evals. A page with share tags and no card of its own uses the
// home's, and the 404 page sets no share tags at all (spec 007).

import { EYEBROW, LINES, TILES, WORDS, type Role } from '../home/hero.ts'
import { ORIGIN, PAGES, ROLES, type RolePage } from '../home/roles.ts'
import { builtYears } from '../home/tiles.ts'
import { figureOf } from '../home/years.ts'
import { essayTitleOf, sectionsOf } from '../../corpus/essay.ts'
import { modelName, runDate, TITLE as EVALS_TITLE, accuracyOf } from '../evals/evals.ts'
import type { Results } from '../../../../evals/src/results.ts'

/** A card's size, in pixels: the size LinkedIn, Slack and the rest show best. */
export const WIDTH = 1200
export const HEIGHT = 630

/** The cards, in the order the gallery shows them. */
export type CardId = 'home' | RolePage | 'vindecoded-agents' | 'evals'
export const CARD_IDS: readonly CardId[] = ['home', ...ROLES, 'vindecoded-agents', 'evals']

/** The page each card belongs to, by its path. */
export const PAGE_OF: Readonly<Record<CardId, string>> = {
  home: '/',
  mobile: PAGES.mobile.href,
  fullstack: PAGES.fullstack.href,
  ai: PAGES.ai.href,
  'vindecoded-agents': '/vindecoded-agents',
  evals: '/evals',
}

/** Where the cards are built: dist/share/<card>.png, from the print page dist/share/<card>.html. */
export const FOLDER = 'share'

/** A card's path on the site. */
export const pathOf = (id: CardId): string => `/${FOLDER}/${id}.png`

/** A card's address, which the share tags give: always bradthome.com's, as the canonical links are. */
export const urlOf = (id: CardId): string => `${ORIGIN}${pathOf(id)}`

/** The card a page shares: its own, or the home's (FR-004). A path with a trailing slash or none both count. */
export function cardFor(pathname: string): CardId {
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  return CARD_IDS.find((id) => PAGE_OF[id] === path) ?? 'home'
}

/** A card's top line: "Brad Thome · …" on the left and the page's address on the right. */
export interface Top {
  label: string
  address: string
}

/** The home's and the role pages' card: the hero's words and tiles, with a role page's lit. */
export interface HeroCard {
  kind: 'hero'
  id: CardId
  top: Top
  /** The hero's three words; on a role page, `lit` marks its own and the others are quiet. */
  words: readonly { text: string; lit: boolean }[]
  tiles: readonly { name: string; figure: string; unit?: string; label: string; lit: boolean }[]
  line: string
  /** Whether one role is lit, so the others are quiet. */
  role: boolean
}

/** The essay's card: its title, its diagram's six phases and its summary's counts. */
export interface EssayCard {
  kind: 'essay'
  id: CardId
  top: Top
  title: string
  phases: readonly { number: string; name: string }[]
  /** "1,235 pull requests merged, 83% from agent branches," then its dates. */
  stat: { lead: string; dates: string }
}

/** /evals' card: its title and the latest run's safe and accurate counts, model and date. */
export interface EvalsCard {
  kind: 'evals'
  id: CardId
  top: Top
  title: string
  numbers: readonly { label: string; value: string }[]
  line: string
}

export type Card = HeroCard | EssayCard | EvalsCard

/** The address as a card shows it: no scheme, and the home's with no slash. */
const addressOf = (path: string): string => `bradthome.com${path === '/' ? '' : path}`

/** The home's or a role page's card, with the tiles' years counted for the build's day (D224). */
export function heroCardOf(role: Role, day: Date): HeroCard {
  const id: CardId = role === 'all' ? 'home' : role
  return {
    kind: 'hero',
    id,
    top: { label: role === 'all' ? `Brad Thome · ${EYEBROW.all}` : PAGES[role].title, address: addressOf(PAGE_OF[id]) },
    words: WORDS.map((word) => ({ text: word.text, lit: role !== 'all' && word.role === role })),
    tiles: TILES.map((tile) => ({
      name: tile.name,
      figure: tile.since === undefined ? (tile.figure ?? '') : figureOf(builtYears(tile.since, day)),
      ...(tile.since === undefined ? {} : { unit: 'yrs' }),
      label: tile.label,
      lit: role !== 'all' && tile.role === role,
    })),
    line: LINES[0],
    role: role !== 'all',
  }
}

/** The essay's date from its front matter, as its byline shows it: "October 28, 2026". */
export function essayDateOf(source: string): string {
  const date = /^---\n[\s\S]*?^date:\s*(\d{4}-\d{2}-\d{2})\s*$[\s\S]*?\n---\n/m.exec(source)?.[1]
  if (date === undefined) throw new Error("The essay's front matter has no date.")
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** The six phase names of the essay's diagram, "The system at a glance", in order, from its component. */
export function phasesOf(diagram: string): { number: string; name: string }[] {
  const phases = [...diagram.matchAll(/phase\(r\d, '(\d) · ([^']+)'\)/g)].map((match) => ({ number: match[1] ?? '', name: match[2] ?? '' }))
  if (phases.length !== 6 || phases.some((phase, index) => phase.number !== String(index + 1)))
    throw new Error(`The essay's diagram should have six numbered phases; the share card found ${phases.length}.`)
  return phases
}

/**
 * The summary's counts, in its own words: "From June 13 to October 28, 2026,
 * 1,235 pull requests merged …, and 1,028 of them (83%) came from agent
 * branches". The build fails if the summary stops saying them this way.
 */
export function essayStatOf(source: string): { lead: string; dates: string } {
  const summary = sectionsOf(source).find((section) => section.id === 'essay-summary')?.text ?? ''
  const match = /From (\w+ \d{1,2}) to (\w+ \d{1,2}, \d{4}), ([\d,]+) pull requests merged\b[^.]*?\((\d+%)\) came from agent branches/.exec(
    summary,
  )
  if (match === null)
    throw new Error(
      "The essay's summary no longer gives its merged pull requests and the share of agent branches as the share card reads them.",
    )
  const [, from, to, merged, share] = match
  return { lead: `${merged} pull requests merged, ${share} from agent branches,`, dates: `${from} to ${to}` }
}

/** The essay's card, from its MDX and its diagram's component. */
export function essayCardOf(source: string, diagram: string): EssayCard {
  return {
    kind: 'essay',
    id: 'vindecoded-agents',
    top: { label: `Brad Thome · ${essayDateOf(source)}`, address: addressOf(PAGE_OF['vindecoded-agents']) },
    // Non-breaking hyphens keep "1.4M-download" on one line, as the essay's heading does.
    title: essayTitleOf(source).replaceAll('-', '‑'),
    phases: phasesOf(diagram),
    stat: essayStatOf(source),
  }
}

/** /evals' card, from the latest full run's results, as the page shows them. */
export function evalsCardOf(results: Results): EvalsCard {
  const accuracy = accuracyOf(results)
  return {
    kind: 'evals',
    id: 'evals',
    top: { label: 'Brad Thome · Ask about Brad', address: addressOf(PAGE_OF.evals) },
    title: EVALS_TITLE,
    numbers: [
      { label: 'Safe answers', value: `${results.totals.safe} of ${results.totals.cases}` },
      { label: 'Accurate answers', value: `${accuracy.passed} of ${accuracy.cases}` },
      { label: 'Model that answers', value: modelName(results.model) },
    ],
    line: `Run on ${runDate(results.runAt)}, on the real model, every answer checked.`,
  }
}

/** A card's words, for its og:image:alt, in the order the card reads. */
export function altOf(card: Card): string {
  const plain = (text: string): string => text.replaceAll('‑', '-')
  switch (card.kind) {
    case 'hero': {
      const tiles = card.tiles.map((tile) =>
        tile.unit === undefined ? `${tile.name}: ${tile.figure} ${tile.label}` : `${tile.name}: ${tile.figure} years, ${tile.label}`,
      )
      return `${card.top.label}. ${card.words.map((word) => `${word.text}.`).join(' ')} ${tiles.join('. ')}. ${card.line}`
    }
    case 'essay':
      // The phases' names hold commas, so the list takes semicolons.
      return `${plain(card.title)}, by ${card.top.label.replace(' · ', ', ')}. Its six phases: ${card.phases.map((phase) => phase.name).join('; ')}. ${card.stat.lead} ${card.stat.dates}.`
    case 'evals':
      return `${card.title}: ${card.numbers.map((number) => `${number.label.toLowerCase()}, ${number.value}`).join('; ')}. ${card.line}`
  }
}
