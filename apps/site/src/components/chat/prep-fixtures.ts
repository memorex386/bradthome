import type { PrepAnswer } from '../../../../chat-api/src/prep-shape.ts'
import { EXAMPLE_POSTING } from './example.ts'
import { RESETS_AT } from './fixtures.ts'
import type { ChatState, HeldProps, PrepInput, PrepMeta } from './types.ts'

// The gallery's held prep states (spec 024's mocks), one for each state in
// the spec's table. The answer is for the invented example posting, and its
// evidence paraphrases real sources from /corpus.json. The tests reuse these
// as the fake API's replies. As the API writes them (D203), each match's
// evidence is its first source's own words, and each gap a requirement with
// no match.

const SITE = 'https://bradthome.com'

export const PREP_INPUT: PrepInput = { text: EXAMPLE_POSTING, words: EXAMPLE_POSTING.match(/\S+/g)?.length ?? 0, via: 'posting' }
export const ROLE_INPUT: PrepInput = { text: 'Staff Android engineer', words: 3, via: 'role' }

export const PREP_ANSWER: PrepAnswer = {
  state: 'answered',
  kind: 'posting',
  role: 'Senior Software Engineer, AI Products',
  requirements: [
    'Ship AI features in production apps',
    'Evaluations and guardrails for model-backed features',
    'Launch partner integrations end to end',
    'Server-driven UI and web views across Android and iOS',
    'Strong Kotlin and TypeScript, React on the web',
    'Experimentation platforms and product analytics',
    'Go services and Kubernetes in production',
    'Mentoring and leading a team of 5 or more',
  ],
  matches: [
    {
      requirement: 'Ship AI features in production apps',
      evidence:
        'Shipped production AI features: grounded streaming vehicle chat, with provider-switchable models and tool-isolated vehicle data; vision-based VIN, plate and gas-receipt scanning with structured outputs.',
      sources: [{ id: 'vindecoded-5', url: `${SITE}/#side-vindecoded`, label: 'Résumé · VINDecoded' }],
    },
    {
      requirement: 'Evaluations and guardrails for model-backed features',
      evidence:
        'Shipped production AI features: grounded streaming vehicle chat, with provider-switchable models and tool-isolated vehicle data; vision-based VIN, plate and gas-receipt scanning with structured outputs.',
      sources: [
        { id: 'vindecoded-5', url: `${SITE}/#side-vindecoded`, label: 'Résumé · VINDecoded' },
        { id: 'essay-dark-launch', url: `${SITE}/vindecoded-agents#new-features-ship-dark`, label: 'Essay · New features ship dark' },
      ],
    },
    {
      requirement: 'Launch partner integrations end to end',
      evidence:
        'Launched Capital One Travel’s first post-booking Disruption Assistance purchase flow as sole engineering owner, driving substantial incremental revenue for Hopper and Capital One and creating a reusable capability…',
      sources: [
        {
          id: 'hopper-disruption-assistance-1',
          url: `${SITE}/#receipt-hopper-disruption-assistance-1`,
          label: 'Résumé · Hopper, Disruption Assistance',
        },
      ],
    },
    {
      requirement: 'Server-driven UI and web views across Android and iOS',
      evidence:
        'Co-architected and built RemoteUI, a server-driven UI framework rendered natively with Jetpack Compose and MVVM on Android and SwiftUI on iOS (components, actions, state management, API mappings), so UI changes ship to both platforms with server deploys instead of app releases.',
      sources: [
        {
          id: 'hopper-mobile-remoteui-and-webviews-1',
          url: `${SITE}/#receipt-hopper-mobile-remoteui-and-webviews-1`,
          label: 'Résumé · Hopper, Mobile: RemoteUI and WebViews',
        },
      ],
    },
    {
      requirement: 'Experimentation platforms and product analytics',
      evidence: 'Built a human-approved experimentation loop on LaunchDarkly, Amplitude and BigQuery telemetry.',
      sources: [
        {
          id: 'hopper-agent-and-experimentation-workflow-1',
          url: `${SITE}/#receipt-hopper-agent-and-experimentation-workflow-1`,
          label: 'Résumé · Hopper, Agent and experimentation workflow',
        },
      ],
    },
  ],
  gaps: [
    'The site doesn’t show a match for: Strong Kotlin and TypeScript, React on the web',
    'The site doesn’t show a match for: Go services and Kubernetes in production',
    'The site doesn’t show a match for: Mentoring and leading a team of 5 or more',
  ],
  questions: [
    'Walk me through the Capital One launch: who were the stakeholders, and what broke?',
    'How do your evals decide whether an AI feature ships?',
    'What did leading Android at RealPage involve day to day?',
  ],
}

export const PREP_META: PrepMeta = {
  state: 'answered',
  model: 'claude-haiku-5-5',
  inputTokens: 1_184,
  cacheReadTokens: 22_840,
  cacheWriteTokens: 0,
  outputTokens: 742,
  ms: 7_820,
}

export const ROLE_ANSWER: PrepAnswer = {
  ...PREP_ANSWER,
  kind: 'role',
  role: 'Staff Android engineer',
  requirements: [
    'Deep Android and Kotlin experience',
    'Mobile architecture across a large app',
    'Leading technical direction',
    'Mentoring engineers',
  ],
  matches: [
    {
      requirement: 'Deep Android and Kotlin experience',
      evidence: 'Senior Android Developer, promoted from Android Developer in Dec 2020.',
      sources: [
        { id: 'bleacher-report-1', url: `${SITE}/#receipt-bleacher-report-1`, label: 'Résumé · Bleacher Report' },
        { id: 'bleacher-report-3', url: `${SITE}/#receipt-bleacher-report-3`, label: 'Résumé · Bleacher Report' },
      ],
    },
    {
      requirement: 'Leading technical direction',
      evidence:
        'Led Android development across a suite of real-estate management apps, setting architecture and quality standards and coordinating delivery across mobile products.',
      sources: [{ id: 'realpage-2', url: `${SITE}/#experience-realpage`, label: 'Résumé · RealPage' }],
    },
  ],
  gaps: [
    'The site doesn’t show a match for: Mobile architecture across a large app',
    'The site doesn’t show a match for: Mentoring engineers',
  ],
  questions: [
    'What architecture standards did you set at RealPage, and why?',
    'How did the Bleacher Report app change while you worked on it?',
  ],
}

export const NO_FIT_ANSWER: PrepAnswer = {
  state: 'no-fit',
  kind: 'posting',
  role: 'Registered Nurse, Intensive Care',
  requirements: ['An active nursing license', 'Two years of ICU experience', 'Basic and advanced life support'],
  matches: [],
  gaps: [
    'The site doesn’t show a match for: An active nursing license',
    'The site doesn’t show a match for: Two years of ICU experience',
    'The site doesn’t show a match for: Basic and advanced life support',
  ],
  questions: [],
}

export const NOT_POSTING_ANSWER: PrepAnswer = {
  state: 'not-a-posting',
  kind: 'not-a-posting',
  role: '',
  requirements: [],
  matches: [],
  gaps: [],
  questions: [],
}

const LONG_POSTING = `${EXAMPLE_POSTING}\n\n${Array.from({ length: 420 }, () => 'Responsibilities include planning, building, testing and shipping.').join(' ')}`

export interface HeldPrep {
  id: string
  name: string
  props: HeldProps
}

const prep = (state: Omit<ChatState, 'turns' | 'mode'>): ChatState => ({ turns: [], mode: 'prep', ...state })

export const HELD_PREP: readonly HeldPrep[] = [
  {
    id: 'P1',
    name: 'Entry: paste a job description',
    props: { initial: prep({ prep: { draft: EXAMPLE_POSTING, view: { phase: 'entry' } } }) },
  },
  { id: 'P5', name: 'A posting too long', props: { initial: prep({ prep: { draft: LONG_POSTING, view: { phase: 'entry' } } }) } },
  {
    id: 'P2',
    name: 'Working through it, step by step',
    props: {
      initial: prep({
        prep: {
          draft: EXAMPLE_POSTING,
          view: { phase: 'working', input: PREP_INPUT, progress: { requirements: 8, matches: 4, gaps: 0, questions: 0 } },
        },
      }),
    },
  },
  {
    id: 'P3',
    name: 'Fit, honest gaps, questions to ask Brad',
    props: { initial: prep({ prep: { draft: '', view: { phase: 'done', input: PREP_INPUT, answer: PREP_ANSWER, meta: PREP_META } } }) },
  },
  {
    id: 'P3R',
    name: 'A named role: typical requirements, inferred',
    props: {
      initial: prep({
        prep: {
          draft: '',
          view: { phase: 'done', input: ROLE_INPUT, answer: ROLE_ANSWER, meta: { ...PREP_META, inputTokens: 212, outputTokens: 410 } },
        },
      }),
    },
  },
  {
    id: 'P6',
    name: 'No fit found',
    props: {
      initial: prep({
        prep: {
          draft: '',
          view: {
            phase: 'done',
            input: { text: 'Registered Nurse, Intensive Care…', words: 412, via: 'posting' },
            answer: NO_FIT_ANSWER,
            meta: { ...PREP_META, state: 'no-fit', outputTokens: 180 },
          },
        },
      }),
    },
  },
  {
    id: 'P4',
    name: 'Not a job description',
    props: {
      initial: prep({
        prep: {
          draft: '',
          view: {
            phase: 'done',
            input: { text: 'Brad Thome', words: 2, via: 'role' },
            answer: NOT_POSTING_ANSWER,
            meta: { ...PREP_META, state: 'not-a-posting', outputTokens: 24 },
          },
        },
      }),
    },
  },
  {
    id: 'PL',
    name: 'Prep’s limit, with questions left for Ask',
    props: { initial: prep({ prep: { draft: '', view: { phase: 'limited', left: 2, resetsAt: RESETS_AT } } }), timeZone: 'UTC' },
  },
  { id: 'A11', name: 'Paused at the daily spending cap', props: { initial: prep({ off: { kind: 'paused', scope: 'day' } }) } },
  {
    id: 'A12',
    name: 'The fit failed: try again',
    props: { initial: prep({ prep: { draft: EXAMPLE_POSTING, view: { phase: 'failed', input: PREP_INPUT } } }) },
  },
  {
    id: 'K2',
    name: 'The check didn’t pass: try again',
    props: { initial: prep({ prep: { draft: EXAMPLE_POSTING, view: { phase: 'check-failed', input: PREP_INPUT } } }) },
  },
]
