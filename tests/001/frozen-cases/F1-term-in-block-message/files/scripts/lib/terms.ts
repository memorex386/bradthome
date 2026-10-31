// The private-term list and its matcher, which the hooks share (FR-004,
// FR-005). No output may show a term (SC-002).

export interface Entry {
  readonly text: string
  readonly pattern: RegExp
}

export interface Terms {
  readonly count: number
  readonly entries: readonly Entry[]
}

export interface Match {
  readonly line: number
  /** The list entry that matched, so a false match is quick to find in the list. */
  readonly entry: string
}

const SEPARATORS = String.raw`[\s.\-()[\]+]*`

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compile(entry: string): RegExp {
  if (entry.startsWith('digits:')) {
    const digits = entry.slice('digits:'.length).replace(/\D/g, '').split('')
    return new RegExp(String.raw`(?<!\w)${digits.join(SEPARATORS)}(?!\w)`)
  }
  const words = entry.split(/\s+/).map(escapeRegExp).join(String.raw`\s+`)
  return new RegExp(String.raw`(?<!\w)${words}(?!\w)`, 'i')
}

export function parseTerms(listText: string): Terms {
  const entries = listText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((text) => ({ text, pattern: compile(text) }))
  return { count: entries.length, entries }
}

/** The lines of some text that hold a term, numbered from 1. */
export function findTerms(text: string, terms: Terms): Match[] {
  const matches: Match[] = []
  text.split(/\r?\n/).forEach((line, index) => {
    const entry = terms.entries.find((candidate) => candidate.pattern.test(line))
    if (entry !== undefined) matches.push({ line: index + 1, entry: entry.text })
  })
  return matches
}

/** The G3 block, with the file and line of each match, and the entry it matched. */
export function blockMessage(file: string, matches: readonly Match[]): string {
  const lines = ['✖ pre-commit  private term']
  for (const match of matches) lines.push(`  ${file}:${match.line}  matches the entry "${match.entry}"`)
  lines.push("  A term on Brad's private list is in this change. The term isn't shown.")
  lines.push("  Fix: remove or reword that line. If it's a false match, ask Brad to refine the list.")
  return lines.join('\n')
}
