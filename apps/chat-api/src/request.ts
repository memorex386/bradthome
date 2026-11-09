import { z } from 'zod'
import { MAX_ANSWER_CHARS, MAX_MESSAGES, MAX_QUESTION_CHARS } from './constants.ts'
import { postingFits } from './prep-shape.ts'

// The question's body (FR-003): the AI SDK's UI messages, text parts only, the
// last one the visitor's, with ALTCHA's payload beside them.

const textPart = z.object({ type: z.literal('text'), text: z.string() })
const message = z.object({
  id: z.string().max(100).optional(),
  role: z.enum(['user', 'assistant']),
  parts: z.array(z.unknown()).min(1).max(20),
})
const body = z.object({
  // A missing solution parses, so the ALTCHA check refuses it as altcha (S3.2).
  altcha: z.string().max(10_000).default(''),
  messages: z.array(message).min(1).max(MAX_MESSAGES),
})

/**
 * The parts the API's own answers add, which useChat keeps in an earlier
 * answer and sends back: its sources, its numbers and the step marker. They
 * carry no words, so they're left out of the prompt. A visitor's message is
 * text only.
 */
const OWN_PARTS = new Set(['source-url', 'data-meta', 'step-start'])
function ownPart(part: unknown): boolean {
  const type = (part as { type?: unknown } | null)?.type
  return typeof type === 'string' && OWN_PARTS.has(type)
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export type ChatRequest = { ok: true; altcha: string; messages: ChatMessage[] } | { ok: false }

export function parseChatRequest(input: unknown): ChatRequest {
  const parsed = body.safeParse(input)
  if (!parsed.success) return { ok: false }
  const messages: ChatMessage[] = []
  for (const item of parsed.data.messages) {
    let words = ''
    for (const part of item.parts) {
      const text = textPart.safeParse(part)
      if (text.success) words += text.data.text
      else if (item.role === 'user' || !ownPart(part)) return { ok: false }
    }
    const limit = item.role === 'user' ? MAX_QUESTION_CHARS : MAX_ANSWER_CHARS
    if (words.trim() === '' || words.length > limit) return { ok: false }
    messages.push({ role: item.role, text: words })
  }
  if (messages.at(-1)?.role !== 'user') return { ok: false }
  return { ok: true, altcha: parsed.data.altcha, messages }
}

/** Prep's body (spec 024's S5.2): ALTCHA's payload and one posting or role's name, within the caps. */
const prepBody = z.strictObject({ altcha: z.string().max(10_000).default(''), posting: z.string() })

export type PrepRequest = { ok: true; altcha: string; posting: string } | { ok: false }

export function parsePrepRequest(input: unknown): PrepRequest {
  const parsed = prepBody.safeParse(input)
  if (!parsed.success || !postingFits(parsed.data.posting)) return { ok: false }
  return { ok: true, altcha: parsed.data.altcha, posting: parsed.data.posting.trim() }
}
