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
  'You get the visitor’s question, the chat’s answer, and the text of each source the answer cited.',
  'The answer is "supported" when every fact in it, including names, dates, numbers and counts, is stated in or follows directly from the sources. Plain connecting words, the chat calling the person "Brad", and pointing the visitor to brad@bradthome.com are fine.',
  'The answer is "unsupported" when any fact goes beyond the sources, contradicts them, overstates them (such as "all" where a source gives a share), or adds an opinion or praise of its own.',
  'Reply with only this JSON and nothing else: {"verdict":"supported","reason":"…"} or {"verdict":"unsupported","reason":"…"}. The reason is one sentence, under 200 characters, naming the unsupported fact when there is one.',
].join('\n')

export interface JudgeSource {
  id: string
  text: string
}

/** What the judge reads: the question, the answer, then each cited source by ID. */
export function judgePrompt(question: string, answer: string, sources: readonly JudgeSource[]): string {
  return [
    `<question>${question}</question>`,
    `<answer>${answer}</answer>`,
    ...sources.map((source) => `<source id="${source.id}">${source.text}</source>`),
  ].join('\n')
}

const verdictSchema = z.strictObject({
  verdict: z.enum(['supported', 'unsupported']),
  reason: z.string().trim().min(1).max(300),
})

export type Verdict = { verdict: 'supported' | 'unsupported' | 'unreadable'; reason: string }

export const UNREADABLE: Verdict = { verdict: 'unreadable', reason: 'The judge’s reply wasn’t a verdict in the fixed shape.' }

/**
 * The judge's verdict, or unreadable. The reply's last JSON object is read, so
 * a code fence or a line before it is allowed, but the object itself must be
 * in the fixed shape.
 */
export function parseVerdict(text: string): Verdict {
  const last = (text.match(/\{[^{}]*\}/g) ?? []).at(-1)
  if (last === undefined) return UNREADABLE
  try {
    const parsed = verdictSchema.safeParse(JSON.parse(last))
    return parsed.success ? parsed.data : UNREADABLE
  } catch {
    return UNREADABLE
  }
}
