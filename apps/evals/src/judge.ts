import { z } from 'zod'

// The judge (spec 023's FR-005, D195): Sonnet 5.5 reads one answer beside the
// text of the sources it cited, never the whole corpus, and says whether the
// answer states only what those sources say. Only a reply in the fixed JSON
// shape counts; anything else is "unreadable", which fails the case.
// Changing this file changes the fingerprint, so it needs a fresh run (D194).

export const JUDGE_MODEL = 'claude-sonnet-5-5'

/** The judge's output budget. Sonnet 5.5's thinking can't be turned off, only lowered, and counts as output. */
export const JUDGE_MAX_OUTPUT_TOKENS = 2_000

export const RUBRIC = [
  'You check answers written by a chat on Brad Thome’s portfolio site. The chat may only state what its cited sources say.',
  'You get the visitor’s question, the chat’s answer, and each source the answer cited: its label, which names the résumé job or essay section it comes from and counts as part of the source, and its text. The essay is Brad’s own, in the first person.',
  'A follow-up also shows the earlier turns of the conversation. They are context only: the answer may refer back to what an earlier turn named, such as the job it was about, without a source for it.',
  'The answer is "supported" when every fact in it, including names, dates, numbers and counts, is stated in or follows directly from the sources. A fact any sentence of a cited source states is supported, even when another part of the same source words it differently. Plain connecting words, the chat calling the person "Brad", and pointing the visitor to brad@bradthome.com are fine.',
  'The answer is "unsupported" when any fact goes beyond the sources, contradicts them, overstates them (such as "all" where a source gives a share), or adds an opinion or praise of its own.',
  'Reply with only this JSON and nothing else: {"verdict":"supported","reason":"…"} or {"verdict":"unsupported","reason":"…"}. The reason is one sentence, under 200 characters, naming the unsupported fact when there is one.',
].join('\n')

export interface JudgeSource {
  id: string
  label: string
  text: string
}

/** What the judge reads: any earlier turns, the question, the answer, then each cited source by ID. */
export function judgePrompt(
  question: string,
  answer: string,
  sources: readonly JudgeSource[],
  turns: readonly { role: 'user' | 'assistant'; text: string }[] = [],
): string {
  return [
    ...turns.map((turn) => `<earlier role="${turn.role === 'user' ? 'visitor' : 'chat'}">${turn.text}</earlier>`),
    `<question>${question}</question>`,
    `<answer>${answer}</answer>`,
    ...sources.map((source) => `<source id="${source.id}" label="${source.label}">${source.text}</source>`),
  ].join('\n')
}

const verdictSchema = z.strictObject({
  verdict: z.enum(['supported', 'unsupported']),
  reason: z.string().trim().min(1).max(300),
})

export type Verdict = { verdict: 'supported' | 'unsupported' | 'unreadable'; reason: string }

export const UNREADABLE: Verdict = { verdict: 'unreadable', reason: 'The judge’s reply wasn’t a verdict in the fixed shape.' }

/**
 * The judge's verdict, or unreadable. The reply must hold exactly one JSON
 * object, in the fixed shape; a code fence or a line around it is ignored, and
 * a reply with two objects is unreadable, so it can't contradict itself into a
 * pass.
 */
export function parseVerdict(text: string): Verdict {
  const objects = text.match(/\{[^{}]*\}/g) ?? []
  const last = objects.length === 1 ? objects[0] : undefined
  if (last === undefined) return UNREADABLE
  try {
    const parsed = verdictSchema.safeParse(JSON.parse(last))
    return parsed.success ? parsed.data : UNREADABLE
  } catch {
    return UNREADABLE
  }
}
