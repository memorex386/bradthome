// The addresses a commit may carry (FR-008, D16, D43). Authors and committers
// use a GitHub noreply address or brad@bradthome.com. Trailers may also use
// noreply@anthropic.com, for Claude's co-author line.

const NOREPLY = /^(?:\d+\+)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\[bot\])?@users\.noreply\.github\.com$/
const IDENTITIES = new Set(['noreply@github.com', 'brad@bradthome.com'])
const TRAILERS = new Set(['noreply@anthropic.com'])

export function isAllowedIdentity(address: string): boolean {
  const lower = address.trim().toLowerCase()
  return IDENTITIES.has(lower) || NOREPLY.test(lower)
}

export function isAllowedTrailer(address: string): boolean {
  return isAllowedIdentity(address) || TRAILERS.has(address.trim().toLowerCase())
}

/** An address cut to its first two letters and its domain: jo***@example.com. */
export function maskAddress(address: string): string {
  const at = address.lastIndexOf('@')
  if (at < 0) return `${address.slice(0, 2)}***`
  return `${address.slice(0, Math.min(2, at))}***@${address.slice(at + 1)}`
}

export interface Ident {
  name: string
  email: string
}

/** Reads git's "Name <email> 1234567890 +0000" form. */
export function parseIdent(ident: string): Ident {
  const match = /^(.*?)\s*<([^<>]*)>/.exec(ident)
  return match === null ? { name: ident.trim(), email: '' } : { name: match[1] ?? '', email: match[2] ?? '' }
}

export interface TrailerAddress {
  /** The 1-based line in the message. */
  line: number
  key: string
  address: string
}

const TRAILER = /^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.*)$/
const ADDRESS = /<([^<>\s]+@[^<>\s]+)>|([^\s<>"'(),;:]+@[^\s<>"'(),;:]+\.[^\s<>"'(),;:]+)/g

/**
 * Every address in a message's trailer-shaped lines, such as Co-authored-by.
 * A line that starts with whitespace after a trailer continues it, as git
 * reads trailers. The subject and comment lines are skipped. `lines` holds the
 * message's lines, so the numbers match the file the message came from.
 */
export function trailerAddresses(lines: readonly string[]): TrailerAddress[] {
  const found: TrailerAddress[] = []
  let key: string | undefined
  lines.forEach((text, index) => {
    if (index === 0 || text.startsWith('#')) {
      key = undefined
      return
    }
    let value: string
    const trailer = TRAILER.exec(text)
    if (trailer !== null) {
      key = trailer[1] ?? ''
      value = trailer[2] ?? ''
    } else if (key !== undefined && /^\s/.test(text) && text.trim() !== '') value = text
    else {
      key = undefined
      return
    }
    for (const match of value.matchAll(ADDRESS)) {
      const address = match[1] ?? match[2]
      if (address !== undefined) found.push({ line: index + 1, key, address })
    }
  })
  return found
}
