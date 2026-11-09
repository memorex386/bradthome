import { MAX_POSTING_CHARS, MAX_POSTING_WORDS } from './constants.ts'

// Prep's shapes and pure helpers (spec 024), shared by the API and the
// window. It imports nothing but the constants, so the window's bundle
// carries no zod or AI SDK.

/** The most of each kept (S5.5). */
export const PREP_CAPS = { requirements: 12, matches: 12, gaps: 8, questions: 5, role: 100, text: 400 } as const

/** A source as the window shows it: its ID, its page and its label. */
export interface PrepSource {
  id: string
  url: string
  label: string
}

export interface PrepMatch {
  requirement: string
  evidence: string
  sources: PrepSource[]
}

/** The checked answer the window draws (P3, P4, P6). */
export interface PrepAnswer {
  state: PrepState
  kind: 'posting' | 'role' | 'not-a-posting'
  role: string
  requirements: string[]
  matches: PrepMatch[]
  gaps: string[]
  questions: string[]
}

export type PrepState = 'answered' | 'no-fit' | 'not-a-posting'

/** How far the answer has got, as it streams (P2). */
export interface PrepProgress {
  requirements: number
  matches: number
  gaps: number
  questions: number
}

/** A posting's words, counted as runs of non-space characters, as the window counts them. */
export function wordsOf(text: string): number {
  return text.match(/\S+/g)?.length ?? 0
}

/** Whether a posting is within the caps (FR-002). */
export function postingFits(text: string): boolean {
  return text.trim() !== '' && text.length <= MAX_POSTING_CHARS && wordsOf(text) <= MAX_POSTING_WORDS
}

/** The result as plain notes, for Copy as notes and the evals (S4.4). */
export function notesOf(answer: PrepAnswer, labels: { matches: string; gaps: string; questions: string; inferred: string }): string {
  if (answer.state === 'not-a-posting') return ''
  const lines: string[] = [answer.role]
  if (answer.kind === 'role') lines.push(labels.inferred)
  lines.push('', `${labels.matches} (${answer.matches.length} of ${answer.requirements.length})`)
  for (const match of answer.matches) {
    lines.push(`- ${match.requirement}: ${match.evidence}`)
    for (const source of match.sources) lines.push(`  ${source.label}: ${source.url}`)
  }
  lines.push('', labels.gaps, ...answer.gaps.map((gap) => `- ${gap}`))
  lines.push('', labels.questions, ...answer.questions.map((question, n) => `${n + 1}. ${question}`))
  return lines.join('\n')
}
