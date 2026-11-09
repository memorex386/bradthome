import { BOUNDARY, NO_SOURCE } from '../../../../chat-api/src/prompt.ts'
import type { ChatWindowProps } from './ChatWindow.tsx'
import type { Meta, Source, Turn } from './types.ts'

// The gallery's held states (spec 022's mocks), one for each state the chat
// designs draw, plus the check and its failure. Their answers paraphrase real
// sources from /corpus.json, and the no-source and boundary replies are the
// API's own words. The tests reuse them as the fake API's replies.

export const SOURCES: Source[] = [
  { id: 'vindecoded-5', url: 'https://bradthome.com/#side-vindecoded', label: 'Résumé · VINDecoded' },
  {
    id: 'essay-dark-launch',
    url: 'https://bradthome.com/vindecoded-agents#new-features-ship-dark',
    label: 'Essay · New features ship dark',
  },
  { id: 'hopper-fintech-ai-1', url: 'https://bradthome.com/#receipt-hopper-fintech-ai-1', label: 'Résumé · Hopper, Fintech AI' },
]

export const QUESTION = 'What AI features has Brad shipped?'

export const ANSWER =
  'At VINDecoded, Brad shipped a grounded vehicle chat that streams answers about one car from its own data, and camera scans that read a VIN, a plate or a gas receipt into structured fields. Quotas, kill switches and evals guard both. New features reach production turned off and are switched on as a separate step. At Hopper, Brad helped launch a flight-shopping assistant and generative offers.'

export const META: Meta = {
  state: 'answered',
  model: 'claude-haiku-5-5',
  inputTokens: 412,
  cacheReadTokens: 20_725,
  cacheWriteTokens: 0,
  outputTokens: 96,
  ms: 2340,
}

const answered: Turn = { id: 'held-a4', question: QUESTION, status: 'done', text: ANSWER, sources: SOURCES, meta: META }

/** A source's words, as /corpus.json holds them, for the opened source (A5). */
export const OPENED_TEXT =
  'Shipped production AI features:\n- grounded streaming vehicle chat, with provider-switchable models and tool-isolated vehicle data\n- vision-based VIN, plate and gas-receipt scanning with structured outputs\n\nQuotas, credits, kill switches, evals and PostHog/Sentry observability guard both.'

export const NO_SOURCE_QUESTION = 'Has Brad shipped anything in Rust?'
export const BOUNDARY_QUESTION = 'What salary is Brad looking for?'
export const FAILED_QUESTION = 'How does Brad test the AI features?'

/** The limit's reset in the gallery, at the next UTC midnight of a fixed day, so its snapshot is stable. */
export const RESETS_AT = '2026-11-09T00:00:00.000Z'

export interface HeldState {
  id: string
  name: string
  props: Omit<ChatWindowProps, 'resumeHref' | 'transport' | 'onClose'>
}

export const HELD: readonly HeldState[] = [
  { id: 'A2', name: 'Open, nothing asked yet', props: {} },
  {
    id: 'K1',
    name: 'Checking this browser, before the question goes',
    props: { initial: { turns: [{ id: 'held-k1', question: QUESTION, status: 'checking', text: '', sources: [] }] } },
  },
  {
    id: 'A3',
    name: 'Answering',
    props: { initial: { turns: [{ id: 'held-a3', question: QUESTION, status: 'writing', text: ANSWER.slice(0, 132), sources: [] }] } },
  },
  { id: 'A4', name: 'An answer with sources', props: { initial: { turns: [answered] } } },
  {
    id: 'A5',
    name: 'A source opened in place',
    props: { initial: { turns: [answered] }, held: { opened: { turn: answered.id, source: 'vindecoded-5', text: OPENED_TEXT } } },
  },
  { id: 'A6', name: 'Inspect: how the answer was made', props: { initial: { turns: [answered] }, held: { inspect: answered.id } } },
  {
    id: 'A8',
    name: 'No source: it says so and hands off',
    props: {
      initial: {
        turns: [
          {
            id: 'held-a8',
            question: NO_SOURCE_QUESTION,
            status: 'done',
            text: NO_SOURCE,
            sources: [],
            meta: { ...META, state: 'no-source', outputTokens: 19, ms: 1180 },
          },
        ],
      },
    },
  },
  {
    id: 'A9',
    name: 'A boundary: pay, dates and promises',
    props: {
      initial: {
        turns: [
          {
            id: 'held-a9',
            question: BOUNDARY_QUESTION,
            status: 'done',
            text: BOUNDARY,
            sources: [],
            meta: { ...META, state: 'boundary', outputTokens: 14, ms: 1020 },
          },
        ],
      },
    },
  },
  {
    id: 'A10',
    name: 'This visitor’s daily limit',
    props: { initial: { turns: [], off: { kind: 'limit', resetsAt: RESETS_AT } }, timeZone: 'UTC' },
  },
  { id: 'A11', name: 'Paused at the daily spending cap', props: { initial: { turns: [], off: { kind: 'paused', scope: 'day' } } } },
  {
    id: 'A12',
    name: 'The answer failed: try again',
    props: { initial: { turns: [{ id: 'held-a12', question: FAILED_QUESTION, status: 'failed', text: '', sources: [] }] } },
  },
  {
    id: 'K2',
    name: 'The check didn’t pass: try again',
    props: { initial: { turns: [{ id: 'held-k2', question: QUESTION, status: 'check-failed', text: '', sources: [] }] } },
  },
]
