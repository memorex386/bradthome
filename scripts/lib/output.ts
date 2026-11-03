import { nameHoldsTerm, type Terms } from './terms.ts'

// The output gate (SC-002). Every line a check prints passes through it. A
// line that holds a term is replaced, whether the term came in through a path,
// a commit subject, a branch name or an address, so no check can show one.
// Lines are read the strict way, as names too, since they may hold paths.

export const HIDDEN_LINE = '(a line that holds a private term is hidden)'

const COLOUR = /\x1b\[[0-9;?]*[A-Za-z]/g

export function gate(lines: readonly string[], terms: Terms | undefined): string[] {
  return lines.map((line) => {
    const plain = line.replace(COLOUR, '')
    if (terms === undefined || !nameHoldsTerm(plain, terms)) return line
    return `${/^\s*/.exec(plain)?.[0] ?? ''}${HIDDEN_LINE}`
  })
}

/** Prints lines through the gate. Hooks write to stderr, the way git shows them. */
export function print(lines: readonly string[], terms: Terms | undefined, stream: NodeJS.WriteStream = process.stderr): void {
  if (lines.length === 0) return
  stream.write(
    `${gate(
      lines.flatMap((line) => line.split('\n')),
      terms,
    ).join('\n')}\n`,
  )
}

/** Text that may hold a term, or a stand-in that says why it isn't shown. */
export function shown(text: string, terms: Terms | undefined, standIn: string): string {
  return terms !== undefined && nameHoldsTerm(text, terms) ? standIn : text
}

/** Seconds since a start time, as the pass lines show them: 0.9s. */
export function seconds(start: number): string {
  return `${((performance.now() - start) / 1000).toFixed(1)}s`
}
