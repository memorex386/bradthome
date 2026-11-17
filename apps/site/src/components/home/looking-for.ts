import { type Want, WANT_ROWS, WANT_SLOTS, WANT_TRACKS, type WantSlot, wantIdOf, wantsSchema } from '../../content/schema.ts'
import type { Role } from './hero.ts'
import { REPO } from './record.ts'
import { PAGES, type RolePage } from './roles.ts'
import type { PrepWants } from '../chat/wants.ts'

// "What I'm looking for" (spec 042, D241): a fit list between "On the side"
// and "Get in touch" on the home and each role page. Every row and track line
// is one of Brad's public wants, from content/wants.yaml, which the export
// writes from the notes' "Public lines" (FR-001). The eyebrow, heading, row
// labels and buttons are labels, like Get in touch's, and need no source.
// Each line says only what Brad wants: never an exclusion, a comparison or
// pay (FR-004). Like the home's other modules, this file imports nothing from
// Astro's content layer, so plain Node and the tests load it.

export const SECTION_ID = 'looking-for'
export const EYEBROW = 'Next'
export const HEADING = "What I'm looking for"

/** The labels of the rows, in their order. */
export const ROW_LABELS: Readonly<Record<(typeof WANT_ROWS)[number], string>> = {
  role: 'Role',
  team: 'Team',
  build: 'How I build',
  fields: 'Fields',
  people: 'People',
  where: 'Where',
}

/** "Email Brad" goes to Get in touch, so the contact events still mean a click on the address or Copy (FR-007). */
export const EMAIL = { label: 'Email Brad', href: '#contact' } as const

/** "Ask about this" opens the chat with this question in its box, unsent, as the sparkles do (D230). */
export const ASK = { label: 'Ask about this', question: 'What kind of role is Brad looking for?' } as const

/** The "How I build" row's proof: the public repo, where agents build this site. */
export const PROOF = { label: 'See how this site is built', href: REPO } as const

/** The lede's name in the corpus, which names each row and track by its label (spec 042's FR-008). */
export const OVERVIEW = 'Overview'

/** The lit track's tag on a role page. */
export const THIS_PAGE = 'This page'

/** The tracks list's name, for screen readers. */
export const TRACKS_LABEL = 'Tracks'

/** A row or track's anchor on the page, which the corpus links (FR-008). */
export const anchorOf = (slot: WantSlot): string => wantIdOf(slot)

export interface Wants {
  lede: string
  rows: { slot: (typeof WANT_ROWS)[number]; label: string; text: string }[]
  tracks: { slot: RolePage; label: string; href: string; text: string }[]
}

/**
 * The section's lines from the wants, checked: one for every slot, each under
 * its slot's own ID, or the build fails (FR-002).
 */
export function wantsOf(entries: readonly (Want & { id: string })[]): Wants {
  const parsed = wantsSchema.safeParse(Object.fromEntries(entries.map(({ id, ...want }) => [id, want])))
  if (!parsed.success)
    throw new Error(`content/wants.yaml doesn't fill the section: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`)
  const textOf = (slot: WantSlot): string => parsed.data[wantIdOf(slot)]?.text ?? ''
  return {
    lede: textOf('lede'),
    rows: WANT_ROWS.map((slot) => ({ slot, label: ROW_LABELS[slot], text: textOf(slot) })),
    tracks: WANT_TRACKS.map((slot) => ({ slot, label: PAGES[slot].label, href: PAGES[slot].href, text: textOf(slot) })),
  }
}

/**
 * The tracks in a page's order (FR-006): the switch's order on the home, and
 * on a role page its own track first, lit, then the other two, dimmed.
 */
export function tracksOf<T extends { slot: RolePage }>(tracks: readonly T[], role: Role): (T & { state: 'rest' | 'lit' | 'dim' })[] {
  if (role === 'all') return tracks.map((track) => ({ ...track, state: 'rest' as const }))
  const own = tracks.filter((track) => track.slot === role)
  const others = tracks.filter((track) => track.slot !== role)
  return [...own.map((track) => ({ ...track, state: 'lit' as const })), ...others.map((track) => ({ ...track, state: 'dim' as const }))]
}

/** Prep's card's lines (spec 042, D243): the Role, Team and How I build rows, and every track's line. */
export function prepWantsOf(wants: Wants): PrepWants {
  const row = (slot: string): string => wants.rows.find((each) => each.slot === slot)?.text ?? ''
  const track = (slot: RolePage): string => wants.tracks.find((each) => each.slot === slot)?.text ?? ''
  return {
    role: row('role'),
    team: row('team'),
    build: row('build'),
    tracks: { mobile: track('mobile'), fullstack: track('fullstack'), ai: track('ai') },
  }
}

/** Every slot, for the tests. */
export const SLOTS = WANT_SLOTS
