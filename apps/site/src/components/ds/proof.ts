// Proof on the card (spec 038, D229, D230). Each claim ends with the Ask
// button's sparkle, which opens Ask about Brad with the claim's words in its
// box, and keeps the anchor its receipt had, so every link to a claim still
// lands on it. A card shows its proof at rest: a stat links its source, and
// any other source lists under the claims with its label and host. These are
// labels, not claims.

/** The sparkle's words and where it goes with no script (D153, D213). */
export const ASK = {
  href: '#contact',
  /** The tooltip, shown on hover and keyboard focus. */
  tip: 'Ask about this',
} as const

/** The heading over a card's listed sources. */
export const SOURCES_LABEL = 'Sources'

/** This site's own host: a source here is linked by its path, and carries no outside-link mark. */
export const SITE_HOST = 'bradthome.com'

/** This site's address, which a path is read against. */
const SITE = 'https://bradthome.com'

/** A claim's words as one line: its paragraphs joined by a space, a list's items by "; ". */
export function wordsOf(text: string): string {
  const parts: string[] = []
  let list: string[] = []
  const flush = (): void => {
    if (list.length > 0) parts.push(list.join('; '))
    list = []
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    if (trimmed.startsWith('- ')) list.push(trimmed.slice(2))
    else {
      flush()
      parts.push(trimmed)
    }
  }
  flush()
  return parts.join(' ')
}

/**
 * The question the sparkle puts in Ask about Brad's box (D213, D230): the
 * claim's own words, so it adds none of its own. The visitor sends it.
 */
export function questionOf(text: string): string {
  return `Tell me more about this: “${wordsOf(text)}”`
}

/** The sparkle's accessible name, which holds its tooltip and tells the 30 apart by their claims' titles. */
export function askNameOf(title: string): string {
  return `${ASK.tip}: ${title}`
}

/**
 * The id a claim carries on the page. It's the anchor its receipt's row had,
 * so `/corpus.json`, `/llms.txt` and every chat answer's source link still
 * land on it (D229).
 */
export function anchorOf(id: string): string {
  return `receipt-${id}`
}

/** A source's host, as its link reads: "play.google.com". */
export function hostOf(url: string): string {
  return new URL(url).host.replace(/^www\./, '')
}

/** A link on this site by its path, so a preview or `next` keeps it there; any other as written. */
export function hrefOf(url: string): string {
  const parsed = new URL(url)
  return hostOf(url) === SITE_HOST ? `${parsed.pathname}${parsed.search}${parsed.hash}` : url
}

/** A URL as one key, so a card link written as a path matches its claim's evidence. */
export function keyOf(url: string): string {
  const parsed = new URL(url, SITE)
  return `${parsed.host.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`
}

/** A source a card lists under its claims. */
export interface Source {
  href: string
  label: string
  host: string
  /** Whether the link leaves this site, so it carries the outside-link mark. */
  outside: boolean
  /** The claim whose evidence it is. */
  claim: string
}

/** A card's source labels: by claim, then by each source's host. */
export type SourceLabels = Readonly<Record<string, Readonly<Record<string, string>>>>

/**
 * The sources a card lists: each of its claims' evidence, in order, that the
 * card doesn't already link from a stat or its own links, once each, labeled
 * by its claim and host. A source with no label, or two from one claim on one
 * host, fails the build, so nothing shows unnamed or under another's label.
 */
export function sourcesOf(
  items: readonly { id: string; evidence: readonly string[] }[],
  shown: readonly string[],
  labels: SourceLabels,
): Source[] {
  const seen = new Set(shown.map(keyOf))
  const sources: Source[] = []
  for (const item of items) {
    const listed = item.evidence.filter((url) => !seen.has(keyOf(url)))
    for (const url of listed) {
      const key = keyOf(url)
      if (seen.has(key)) continue
      seen.add(key)
      const host = hostOf(url)
      const label = labels[item.id]?.[host]
      if (label === undefined) throw new Error(`The source ${url} on ${item.id} has no label.`)
      if (listed.filter((other) => hostOf(other) === host).length > 1)
        throw new Error(`The claim ${item.id} lists two sources on ${host}, so a label can't tell them apart.`)
      sources.push({ href: hrefOf(url), label, host, outside: host !== SITE_HOST, claim: item.id })
    }
  }
  return sources
}

/** A stat as a card shows it: a figure and what it counts, and the source it links, if any. */
export interface StatItem {
  value: string
  label: string
  /** The stat's source, one of its claim's evidence URLs, linked at rest (D229). */
  href?: string
}

/** The sources a card's stats already link, which its list doesn't show again. */
export function statLinksOf(stats: readonly StatItem[]): string[] {
  return stats.flatMap((stat) => (stat.href === undefined ? [] : [stat.href]))
}

/**
 * A stat's link: the one URL in its claim's evidence on the host it names.
 * A stat may link only its claim's evidence, so a host its claim doesn't
 * hold, or holds twice, fails the build.
 */
export function statHrefOf(claim: { id: string; evidence: readonly string[] }, host: string): string {
  const found = claim.evidence.filter((url) => hostOf(url) === host)
  if (found.length !== 1)
    throw new Error(`A stat on ${claim.id} links ${host}, which its claim's evidence holds ${found.length} times, not once.`)
  return found[0] as string
}
