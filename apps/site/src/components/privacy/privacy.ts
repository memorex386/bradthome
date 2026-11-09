import { EMAIL, MAILTO } from '../ds/contact.ts'
import { REGION, RETENTION_MONTHS } from '../analytics/umami.ts'
import { LOG_RETENTION_DAYS, QUESTIONS_PER_DAY } from '../../../../chat-api/src/constants.ts'

// The privacy note's words (spec 018's S5.2). Each fact comes from what the
// analytics send (umami.ts) or from Umami Cloud's own pages, as the plan cites
// them, so the note can't say more than is true. No legal claims. The chat's
// section (spec 021, D175) takes its numbers from the chat API's own settings.

export const TITLE = 'Privacy'
export const DESCRIPTION = 'What bradthome.com measures, with Umami Cloud: no cookies, and nothing that identifies a visitor.'

/** The date the note last changed, shown under its heading. */
export const UPDATED = '2026-11-09'

export interface Section {
  id: string
  heading: string
  paragraphs?: readonly string[]
  items?: readonly string[]
}

export const LEDE =
  'This site counts visits with Umami Cloud, an analytics service that uses no cookies. The counts tell Brad whether visitors find the work, and nothing more.'

/** The three moments counted, each with its one detail, in the spec's order. */
export const MOMENTS: readonly string[] = [
  'A visit reaches the work section, the Hopper story. Nothing else is sent with it.',
  'A résumé PDF is opened, with which role’s résumé it was.',
  'The email link or the Copy button is used, with which of the two it was.',
]

export const SECTIONS: readonly Section[] = [
  {
    id: 'what',
    heading: 'What’s counted',
    paragraphs: [
      'Each page view, with the page’s address but nothing after a “?” or “#”, the site that linked here but not its page, the page’s title, the browser’s language and the screen’s size. Umami works out the browser, operating system, device type and country from the request.',
      'And three moments on the new pages:',
    ],
    items: MOMENTS,
  },
  {
    id: 'not',
    heading: 'What isn’t',
    items: [
      'No cookies, and nothing is stored in your browser.',
      'No visitor ID, account or fingerprint. Umami doesn’t keep your network address in its records; it tells one month’s visitors apart with a one-way code that changes every month.',
      'No ads, and no tracking across other sites.',
    ],
  },
  {
    id: 'off',
    heading: 'Turning it off',
    paragraphs: [
      'If your browser sends Do Not Track or Global Privacy Control, this site sends nothing at all, page views included. Content blockers that block Umami work too.',
    ],
  },
  {
    id: 'kept',
    heading: 'Who sees it, and for how long',
    paragraphs: [
      `Only Brad sees the counts, in Umami Cloud. Umami keeps them in its ${REGION} region for ${RETENTION_MONTHS} months, the limit on its free plan.`,
    ],
  },
  {
    id: 'chat',
    heading: 'The chat, Ask about Brad',
    paragraphs: ['When you ask the chat a question:'],
    items: [
      'It answers questions about Brad from the site’s public facts. Your question, and the conversation so far, go to Anthropic, whose Claude model writes the answer. Anthropic doesn’t train its models on them.',
      'The site doesn’t store what you type or the answers.',
      `For each answer it logs numbers only: the tokens used and their cost, the time taken, the model, the sources cited, and whether it declined and why. Google Cloud keeps those lines for ${LOG_RETENTION_DAYS} days.`,
      `Each visitor can ask ${QUESTIONS_PER_DAY} questions a day. To count them, the chat turns your network address into a one-way code that changes every day, and keeps it in memory only. Your address isn’t stored.`,
      'Before a question is sent, your browser solves a small puzzle, ALTCHA, that slows bots down. It runs on this site and sets no cookies.',
    ],
  },
]

export const QUESTIONS = { lead: 'Questions? Email Brad at', email: EMAIL, href: MAILTO } as const
