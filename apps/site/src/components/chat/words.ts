import { MAX_POSTING_CHARS, MAX_POSTING_WORDS, PREP_QUESTIONS, QUESTIONS_PER_DAY } from '../../../../chat-api/src/constants.ts'
import { EMAIL, MAILTO } from '../ds/contact.ts'

// The chat window's words (spec 022). They're the chat designs' words,
// rewritten so they call Brad "Brad" (docs/plan.md, phase 4). The answers
// themselves come from the API, which writes the no-source and boundary
// replies (spec 021).

export const TITLE = 'Ask about Brad'
export const SUBTITLE = 'Answers about Brad, never as Brad'

export const WELCOME = {
  heading: 'Ask anything about Brad’s work.',
  lede: 'Every answer links to where it came from, and Inspect shows how it was made.',
} as const

/** The starters on the empty chat (A2). Each sends itself as the question. */
export const STARTERS = [
  'How does Brad ship with AI agents?',
  'What AI features has Brad shipped?',
  'What did Brad build at Hopper?',
  'Walk me through Brad’s career',
] as const

export const COMPOSER = {
  label: 'Your question',
  hint: 'Ask about Brad’s work…',
  send: 'Send',
  note: 'Answers can be wrong. Every claim links to its source.',
  /** The hint while the chat is off, by why it's off. */
  off: { limit: 'Back after the reset', paused: 'Resting for now' },
} as const

export const CLOSE = 'Close the chat'

export const PROGRESS = {
  asked: 'You asked: ',
  ready: (sources: number) => `The answer is ready, with ${sources} ${sources === 1 ? 'source' : 'sources'}.`,
  checking: 'Checking this browser',
  writing: 'Writing the answer',
  stop: 'Stop',
  stopped: 'You stopped this answer.',
} as const

export const ACTIONS = {
  copy: 'Copy',
  copied: 'Copied',
  copiedNote: 'Copied the answer and its sources.',
  copyRefused: 'Couldn’t copy here. Select the answer to copy it.',
  inspect: 'Inspect',
  hideInspect: 'Hide Inspect',
} as const

export const SOURCES = {
  label: 'Sources',
  open: 'Open it on the site',
  close: 'Close the source',
  loading: 'Loading the source…',
  missing: 'This source couldn’t be loaded. Open it on the site instead.',
} as const

export const INSPECT = {
  heading: 'How this answer was made',
  model: 'Model',
  sources: (n: number) => `${n} ${n === 1 ? 'source' : 'sources'}`,
  tools: '0 tools',
  read: 'Read the corpus',
  readDetail: (cached: number, written: number) =>
    written > 0 ? `${count(written)} tokens written to the cache` : `${count(cached)} tokens from the cache`,
  question: 'Read the question',
  questionDetail: (n: number) => `${count(n)} new tokens`,
  wrote: 'Wrote the answer',
  wroteDetail: (n: number) => `${count(n)} tokens`,
  checked: 'Checked the sources',
  checkedDetail: (n: number) => `${n} cited, each one in the corpus`,
  code: 'The code',
  codeHref: 'https://github.com/memorex386/bradthome/tree/main/apps/chat-api',
  /** The latest eval run (spec 023, D196). */
  evals: 'How the chat is tested',
  evalsHref: '/evals',
  note: 'Built in this browser from the reply. Nothing about it is stored.',
} as const

/** The hand-offs to Brad, for a question with no source (A8) or a boundary (A9). */
export const HANDOFF = {
  noSource: 'Email Brad the question',
  boundary: 'Email Brad',
  subject: 'A question from bradthome.com',
} as const

/** A mail link to Brad with the visitor's question in it, which only the visitor's own mail app sees. */
export const mailtoOf = (question?: string): string => {
  const params = new URLSearchParams({ subject: HANDOFF.subject })
  if (question !== undefined) params.set('body', question)
  return `${MAILTO}?${params.toString().replaceAll('+', '%20')}`
}

export const LIMIT = {
  heading: 'That’s today’s limit for one visitor',
  body: (resets: string) =>
    `Each visitor can ask ${QUESTIONS_PER_DAY} questions a day, which keeps the chat free for everyone. It resets ${resets}. Everything else on the site still works.`,
  earlier: `Earlier today · ${QUESTIONS_PER_DAY} questions`,
} as const

export const PAUSED = {
  heading: { day: 'The chat is resting today', month: 'The chat is resting this month', unknown: 'The chat is resting for now' },
  body: {
    day: 'It reached its daily spending cap, so it’s off until tomorrow. The rest of the site still works.',
    month: 'It reached its monthly spending cap, so it’s off until next month. The rest of the site still works.',
    unknown: 'It can’t check its spending right now, so it’s off for a while. The rest of the site still works.',
  },
} as const

export const FAILED = {
  heading: 'The answer didn’t finish',
  body: 'Something went wrong before the answer was done. Your question is kept, so you can try again.',
  retry: 'Try again',
} as const

export const CHECK_FAILED = {
  heading: 'The check didn’t pass',
  body: 'Before each question, this browser solves a small puzzle that slows bots down, and this one didn’t go through. Your question is kept, so you can try again.',
} as const

export const UNAVAILABLE = {
  origin: 'This chat isn’t available here yet.',
  invalid: 'That question couldn’t be read. Try a shorter one.',
} as const

export const LINKS = { resume: 'Download the résumé PDF', email: 'Email Brad', emailAddress: EMAIL } as const

/** A whole number with thousands separators, the same on every machine. */
export function count(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** When the visitor's limit resets, in their own time. */
export function resetOf(resetsAt: string | undefined, timeZone?: string): string {
  const date = resetsAt === undefined ? undefined : new Date(resetsAt)
  if (date === undefined || Number.isNaN(date.getTime())) return 'at midnight UTC'
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(timeZone && { timeZone }) })
  return timeZone === 'UTC' ? `at ${time} UTC` : `at ${time} your time`
}

/** The two modes (spec 024's S1.1). */
export const MODES = { label: 'Mode', ask: 'Ask', prep: 'Interview prep' } as const

/** Interview prep's words (spec 024), from the prep designs, rewritten so they call Brad "Brad". */
export const PREP = {
  /** The chat welcome's invitation to prep (S1.2), split around its button. */
  welcomeBefore: 'Interviewing Brad? Switch to',
  welcomeAfter: 'and paste the job description.',
  intro:
    'Paste the job description, or name the role. You’ll get how Brad fits it with evidence, the honest gaps, and questions to ask Brad.',
  label: 'Job description',
  count: (words: number) => `${count(words)} of ${count(MAX_POSTING_WORDS)} words`,
  tooLong: (words: number) =>
    `That’s ${count(words)} words. Prep reads up to ${count(MAX_POSTING_WORDS)}, so trim it to the role and its requirements.`,
  tooManyCharacters: `That’s too long for prep, which reads up to ${count(MAX_POSTING_CHARS)} characters. Trim it to the role and its requirements.`,
  map: 'Map Brad to this role',
  note: 'The posting is used for this answer only, and never stored.',
  hint: 'Or name a role, like “staff mobile engineer”',
  roleLabel: 'A role’s name',
  posting: (words: number) => `Job description · ${count(words)} ${words === 1 ? 'word' : 'words'}`,
  named: (role: string) => `Role · ${role}`,
  steps: {
    requirements: (n: number) => (n === 0 ? 'Pulling out the requirements' : `Pulled out ${n} ${n === 1 ? 'requirement' : 'requirements'}`),
    matches: (k: number, n: number) => (n === 0 ? 'Matching evidence' : `Matching evidence, ${k} of ${n}`),
    gaps: 'Naming the gaps',
    questions: 'Writing questions to ask Brad',
  },
  progressLabel: 'Progress',
  working: 'Working through the posting',
  inferred: 'Typical requirements for this role, inferred from its name',
  matches: (k: number, n: number) => `Strong matches · ${k} of ${n}`,
  matchesPlain: 'Strong matches',
  gaps: 'Gaps, honestly',
  questions: 'Questions to ask Brad',
  noGaps: 'The site shows something for every requirement.',
  noFit: 'The site’s facts don’t show the experience this role asks for. Brad can say more about it directly.',
  notPosting: 'That doesn’t look like a job description. Paste the posting, or name the role and level, like “senior applied AI engineer”.',
  example: 'Use an example posting',
  copy: 'Copy as notes',
  copied: 'Copied',
  copiedNote: 'Copied the notes.',
  email: 'Email Brad',
  another: 'Map another role',
  edit: 'Change the posting',
  ready: (k: number) => `The fit is ready, with ${k} ${k === 1 ? 'match' : 'matches'}.`,
  readyNoFit: 'The fit is ready, with no match.',
  readyNotPosting: 'That didn’t look like a job description.',
  stopped: 'You stopped it. The posting is kept.',
  limit: {
    heading: 'Prep needs 3 of today’s questions',
    body: (left: number, resets: string) =>
      `Interview prep counts as ${PREP_QUESTIONS} of a visitor’s ${QUESTIONS_PER_DAY} daily questions, and ${left} ${left === 1 ? 'is' : 'are'} left today. ${left === 1 ? 'It still works' : 'They still work'} in Ask. Prep resets ${resets}.`,
  },
  failedBody: 'Something went wrong before the fit was done. Your posting is kept, so you can try again.',
  checkFailedBody:
    'Before each request, this browser solves a small puzzle that slows bots down, and this one didn’t go through. Your posting is kept, so you can try again.',
} as const
