import { BOUNDARY, NO_SOURCE } from '../../../../chat-api/src/prompt.ts'
import type { ChatWindowProps, Meta, Next, Source, Turn } from './types.ts'

// The gallery's held states (spec 022's mocks), one for each state the chat
// designs draw, plus the check and its failure. Their answers paraphrase real
// sources from /corpus.json, and the no-source and boundary replies end with
// the API's own sentences. The V states are spec 045's study scenarios in the
// referral voice, each with its three pills. The tests reuse them as the fake
// API's replies.

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

/** The pills under the held answer (spec 045): all three written by the model. */
export const NEXT: Next = {
  pills: ['How does Brad keep a human in the loop?', 'What did Brad build at Hopper?', 'What’s VINDecoded?'],
  written: 3,
}

const answered: Turn = { id: 'held-a4', question: QUESTION, status: 'done', text: ANSWER, sources: SOURCES, meta: META, next: NEXT }

/** A source's words, as /corpus.json holds them, for the opened source (A5). */
export const OPENED_TEXT =
  'Shipped production AI features:\n- grounded streaming vehicle chat, with provider-switchable models and tool-isolated vehicle data\n- vision-based VIN, plate and gas-receipt scanning with structured outputs\n\nQuotas, credits, kill switches, evals and PostHog/Sentry observability guard both.'

export const NO_SOURCE_QUESTION = 'Has Brad shipped anything in Rust?'
export const BOUNDARY_QUESTION = 'What salary is Brad looking for?'
export const FAILED_QUESTION = 'How does Brad test the AI features?'

/** The no-source reply (A8): one kind line, then the API's sentence (spec 045). */
export const NO_SOURCE_ANSWER = `That one’s best answered by Brad. ${NO_SOURCE}`
/** The boundary reply (A9 and V9): one friendly line, then the API's sentence (spec 045). */
export const BOUNDARY_ANSWER = `Fair question! ${BOUNDARY}`

const source = (id: string, label: string, anchor: string): Source => ({ id, url: `https://bradthome.com/${anchor}`, label })
const CAPITAL_ONE = source('hopper-disruption-assistance-1', 'Résumé · Hopper, Disruption Assistance', '#hopper-disruption-assistance')
const VINDECODED_DOWNLOADS = source('vindecoded-3', 'Résumé · VINDecoded', '#side-vindecoded')
const FINTECH_AI = source('hopper-role-and-dates-2', 'Résumé · Hopper, Role and dates', '#hopper')
const BLEACHER_REPORT = source('bleacher-report-1', 'Résumé · Bleacher Report', '#bleacher-report')
const WANT_TEAM = source('looking-for-team', 'Looking for · Team', '#looking-for-team')
const WANT_FIELDS = source('looking-for-fields', 'Looking for · Fields', '#looking-for-fields')
const PARTNER_PORTALS = source('hopper-partner-platform-1', 'Résumé · Hopper, Partner platform', '#hopper-partner-platform')

const voiced = (id: string, question: string, text: string, sources: Source[], next: Next, state: Meta['state'] = 'answered'): Turn => ({
  id: `held-${id}`,
  question,
  status: 'done',
  text,
  sources,
  meta: { ...META, state, outputTokens: 30 + Math.round(text.length / 5), ms: 1900 },
  next,
})

/**
 * Spec 045's study scenarios, in the referral voice, written by hand from real
 * claims for the mocks and the tests. The real model's own replies are shown
 * to Brad at Gate 2.
 */
export const VOICED = {
  V1: voiced(
    'v1',
    'this sucks',
    'Sorry it’s been one of those days. Here’s something better: at Hopper, Brad was the sole engineering owner of Capital One Travel’s first post-booking Disruption Assistance purchase flow, and it became a capability 5 more partners adopted.',
    [CAPITAL_ONE],
    { pills: ['How did the Capital One flow ship?', 'What AI work has Brad done?', 'Walk me through Brad’s career'], written: 2 },
  ),
  V2: voiced(
    'v2',
    'whats the best thing about his work experience',
    'Hard to pick just one, but here’s a standout: at Hopper, Brad was the sole engineering owner of Capital One Travel’s first post-booking Disruption Assistance purchase flow. It drove substantial incremental revenue and became a capability 5 more partners adopted. And on the side, Brad’s app VINDecoded has 1.4M+ downloads.',
    [CAPITAL_ONE, VINDECODED_DOWNLOADS],
    { pills: ['How did the Capital One flow ship?', 'What’s RemoteUI?', 'How does Brad ship with AI agents?'], written: 3 },
  ),
  V3: voiced(
    'v3',
    'hi',
    'Hi, glad you stopped by! Ask anything about Brad’s work, and every answer links to where it came from.',
    [],
    { pills: ['How does Brad ship with AI agents?', 'What AI features has Brad shipped?', 'What did Brad build at Hopper?'], written: 0 },
    'chat',
  ),
  V7: voiced(
    'v7',
    'Is Brad a good engineer?',
    'I’ll let the record speak: Brad was promoted to Senior Android Developer at Bleacher Report, was a founding engineer on Hopper’s Fintech AI team, and on the side, Brad’s VINDecoded has 1.4M+ downloads. You be the judge!',
    [BLEACHER_REPORT, FINTECH_AI, VINDECODED_DOWNLOADS],
    { pills: ['What did Brad do at Bleacher Report?', 'What AI work did Brad do at Hopper?', 'Walk me through Brad’s career'], written: 2 },
  ),
  V9: voiced(
    'v9',
    'What salary does Brad want?',
    BOUNDARY_ANSWER,
    [],
    { pills: ['What role is Brad looking for?', 'Where does Brad want to work?', 'How does Brad like to build?'], written: 3 },
    'boundary',
  ),
  V14: voiced(
    'v14',
    'We’re a 5,000-person bank. Would Brad be a good fit?',
    'That’s your call, but here’s what to weigh. Brad is looking for a small or medium, growth-stage company, with fintech among the first fields. And Brad has built for banks before: partner portals for RBC, Lloyds Bank, Nubank and CommBank at Hopper.',
    [WANT_TEAM, WANT_FIELDS, PARTNER_PORTALS],
    { pills: ['What role is Brad looking for?', 'What did Brad build for partners?', 'How does Brad like to build?'], written: 3 },
  ),
} as const

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
            text: NO_SOURCE_ANSWER,
            sources: [],
            meta: { ...META, state: 'no-source', outputTokens: 52, ms: 1180 },
            next: { pills: ['What did Brad build in Kotlin?', 'What’s Brad’s web stack?', 'What did Brad build at Hopper?'], written: 2 },
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
            text: BOUNDARY_ANSWER,
            sources: [],
            meta: { ...META, state: 'boundary', outputTokens: 48, ms: 1020 },
            next: {
              pills: ['What role is Brad looking for?', 'Where does Brad want to work?', 'How does Brad like to build?'],
              written: 3,
            },
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
  { id: 'V1', name: 'Venting: a kind line, then a turn to one fact', props: { initial: { turns: [VOICED.V1] } } },
  { id: 'V2', name: 'An open question: a standout, no ranking', props: { initial: { turns: [VOICED.V2] } } },
  { id: 'V3', name: 'Hello: small talk with no source, and the pills', props: { initial: { turns: [VOICED.V3] } } },
  { id: 'V7', name: 'Is Brad good? The record, and the visitor decides', props: { initial: { turns: [VOICED.V7] } } },
  { id: 'V9', name: 'Salary: a friendly line, then the hand-off', props: { initial: { turns: [VOICED.V9] } } },
  { id: 'V14', name: 'A fit question: what to weigh, no verdict', props: { initial: { turns: [VOICED.V14] } } },
  {
    id: 'K2',
    name: 'The check didn’t pass: try again',
    props: { initial: { turns: [{ id: 'held-k2', question: QUESTION, status: 'check-failed', text: '', sources: [] }] } },
  },
]
