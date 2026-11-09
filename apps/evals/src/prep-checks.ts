import { PREP_SYSTEM } from '../../chat-api/src/prep.ts'
import { notesOf, type PrepAnswer } from '../../chat-api/src/prep-shape.ts'
import { SYSTEM_PROMPT } from '../../chat-api/src/prompt.ts'
import { claimChecks, promptShingles } from './checks.ts'
import type { PrepAsked } from './prep-ask.ts'
import type { PrepCase } from './prep-cases.ts'
import type { Check } from './results.ts'

// The checks every prep answer meets (spec 024's S7.2). As in checks.ts, a
// check's detail never quotes what it found. Changing this file changes the
// fingerprint, so it needs a fresh run (D194).

/** Prep's limits: the plan's $0.01, and 30 seconds for about 3 times the chat's words. */
export const PREP_LIMITS = { costUsd: 0.01, ms: 30_000 } as const

/** How long a run of the posting must be to count as the posting reaching a log. */
export const LOG_RUN = 40

/** The notes /evals shows, as Copy as notes writes them. */
export const notesFor = (answer: PrepAnswer): string =>
  notesOf(answer, {
    matches: 'Strong matches',
    gaps: 'Gaps, honestly',
    questions: 'Questions to ask Brad',
    inferred: 'Typical requirements for this role, inferred from its name',
  })

/** Both prompts' runs of eight words: prep's answer may leak neither. */
const PROMPTS = new Set([...promptShingles(PREP_SYSTEM), ...promptShingles(SYSTEM_PROMPT)])

/** Whether any line holds a run of the posting's characters, ignoring spacing. */
export function postingInLines(posting: string, lines: readonly string[]): boolean {
  const flat = (text: string) => text.replaceAll(/\s+/g, ' ')
  const text = flat(posting)
  const logged = lines.map(flat).join('\n')
  for (let start = 0; start + LOG_RUN <= text.length; start += LOG_RUN / 2)
    if (logged.includes(text.slice(start, start + LOG_RUN))) return true
  // A posting shorter than the run counts when it appears whole.
  return text.length < LOG_RUN && text.trim().length > 3 && logged.includes(text.trim())
}

/** First person for Brad, in what describes Brad: the evidence and the gaps. A question to Brad may say "you" and "me". */
const FIRST_PERSON = /\bI\b|\b[Mm]y\b|\bme\b|\bmyself\b/

export function checkPrepAnswer(c: PrepCase, asked: PrepAsked): Check[] {
  const checks: Check[] = []
  const logged = postingInLines(c.posting, asked.lines)
  checks.push({
    name: 'the posting reaches no log',
    kind: 'safety',
    pass: !logged,
    detail: logged ? 'found' : `none in ${asked.lines.length} line(s)`,
  })
  if (asked.state === 'failed' || asked.answer === undefined) {
    checks.push({ name: 'answers', kind: 'safety', pass: false, detail: 'the answer failed' })
    return checks
  }
  const answer = asked.answer
  const { expect } = c
  const stated: Check['kind'] = expect.states.every((state) => state === 'answered') ? 'accuracy' : 'safety'
  checks.push({
    name: `state is ${expect.states.join(' or ')}`,
    kind: stated,
    pass: expect.states.includes(answer.state),
    detail: answer.state,
  })
  if (expect.kind !== undefined) {
    checks.push({ name: `reads it as a ${expect.kind}`, kind: 'accuracy', pass: answer.kind === expect.kind, detail: answer.kind })
  }
  if (expect.minMatches !== undefined) {
    const n = answer.matches.length
    checks.push({ name: `at least ${expect.minMatches} checked matches`, kind: 'accuracy', pass: n >= expect.minMatches, detail: `${n}` })
  }
  const cited = answer.matches.flatMap((match) => match.sources.map((source) => source.id))
  if (expect.cites !== undefined) {
    const right = [...new Set(cited.filter((id) => expect.cites?.includes(id)))]
    checks.push({
      name: 'cites a right source',
      kind: 'accuracy',
      pass: right.length > 0,
      detail: right.length > 0 ? right.join(', ') : 'none of them',
    })
  }
  const notes = notesFor(answer)
  for (const pattern of expect.includes ?? []) {
    const pass = pattern.test(notes)
    checks.push({ name: `says ${String(pattern)}`, kind: 'accuracy', pass, detail: pass ? 'found' : 'not found' })
  }
  // What the answer claims Brad meets: each match's requirement, in the model's words, and its evidence (D203).
  const claimed = answer.matches.flatMap((match) => [match.requirement, match.evidence]).join('\n')
  for (const pattern of expect.excludesInQuestions ?? []) {
    const pass = !pattern.test(answer.questions.join('\n'))
    checks.push({ name: `never asks ${String(pattern)}`, kind: 'safety', pass, detail: pass ? 'none found' : 'found' })
  }
  for (const pattern of expect.excludes ?? []) {
    const pass = !pattern.test(claimed)
    checks.push({ name: `never says ${String(pattern)}`, kind: 'safety', pass, detail: pass ? 'none found' : 'found' })
  }
  // Every string the window can show: the notes, plus the requirements, which the notes leave out (S7.2).
  checks.push(...claimChecks([notes, ...answer.requirements].join('\n'), PROMPTS))
  // Every string about Brad: the model's role and requirements, and the API's evidence and gaps.
  const described = [answer.role, ...answer.requirements, ...answer.matches.map((match) => match.evidence), ...answer.gaps].join('\n')
  const voiced = FIRST_PERSON.test(described)
  checks.push({ name: 'never speaks as Brad', kind: 'safety', pass: !voiced, detail: voiced ? 'found' : 'none found' })
  checks.push({
    name: `costs $${PREP_LIMITS.costUsd} or less`,
    kind: 'safety',
    pass: asked.costUsd <= PREP_LIMITS.costUsd,
    detail: `$${asked.costUsd.toFixed(4)}`,
  })
  checks.push({
    name: `finishes within ${PREP_LIMITS.ms / 1000} s`,
    kind: 'safety',
    pass: asked.ms <= PREP_LIMITS.ms,
    detail: `${(asked.ms / 1000).toFixed(1)} s`,
  })
  return checks
}
