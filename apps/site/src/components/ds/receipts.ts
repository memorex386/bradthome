// The words of a card's receipts drawer (spec 026, D208). Each is a label,
// not a claim: the count of receipts with and without a public link, the
// source's host, and the way to ask Brad about the ones without.

/** One receipt in a drawer: its number on the page, its short title and its links. */
export interface ReceiptEntry {
  id: string
  n: number
  kind: 'proof' | 'ask'
  title: string
  evidence: readonly string[]
}

export const RECEIPTS = {
  label: 'Receipts',
  ask: 'Ask me',
  askOne: 'Ask Brad about it',
  askMany: 'Ask Brad about these',
  askHref: '#contact',
} as const

/** The drawer's summary, from how many of its receipts have a public link. */
export function summaryOf(items: readonly ReceiptEntry[]): string {
  const proofs = items.filter((item) => item.kind === 'proof').length
  const asks = items.length - proofs
  if (proofs > 0 && asks > 0) return `${proofs} with a public link · ${asks} to ask about`
  if (proofs > 0) return proofs === 1 ? 'Public link' : 'Public links'
  return asks === 1 ? 'No public link yet' : 'No public links yet'
}

/** The drawer's ask link, or nothing when every receipt has a public link. */
export function askOf(items: readonly ReceiptEntry[]): string | undefined {
  const asks = items.filter((item) => item.kind === 'ask').length
  if (asks === 0) return undefined
  return asks === 1 ? RECEIPTS.askOne : RECEIPTS.askMany
}

/** The id of a receipt's row, which its marker links to. */
export function rowIdOf(id: string): string {
  return `receipt-${id}`
}

/** A source's host, as its link reads in the drawer. */
export function hostOf(url: string): string {
  return new URL(url).host.replace(/^www\./, '')
}
