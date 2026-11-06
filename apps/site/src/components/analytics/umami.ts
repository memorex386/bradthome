// Analytics with Umami Cloud (spec 018, D40, D155). Everything the sender
// needs to know about Umami lives here, once.
//
// The website ID isn't a secret: Umami's own snippet prints it in every page.
// It's here because the sender is built into the site's one module, and it
// must match the one website in Brad's Umami account. A new account means a
// new ID on this line.

/** Umami Cloud's collection endpoint, the only outside host the site talks to (D159). */
export const ORIGIN = 'https://gateway.umami.is'
export const ENDPOINT = `${ORIGIN}/api/send`

/** The website's ID in Umami. The all-zero placeholder sends nothing. */
export const WEBSITE_ID = '00000000-0000-0000-0000-000000000000'
export const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000'

/** The one host that sends: production, once v2.0 is live (D156). */
export const HOST = 'bradthome.com'

/** Where Umami keeps the data, and for how long on the free plan (D158). */
export const REGION = 'US'
export const RETENTION_MONTHS = 6

/** The section a visit must reach, and how much of it must show. */
export const WORK_SECTION = 'hopper'
export const WORK_THRESHOLD = 0.25

/** The résumé PDFs' file names and their roles, as spec 015 serves them. */
export const RESUME_ROLES = {
  'brad-thome-mobile.pdf': 'mobile',
  'brad-thome-full-stack.pdf': 'fullstack',
  'brad-thome-applied-ai.pdf': 'ai',
} as const

export type ResumeRole = (typeof RESUME_ROLES)[keyof typeof RESUME_ROLES]

/** The three events, and the one property each may carry (spec 018's table). */
export interface Events {
  'work-reached': undefined
  'resume-download': { role: ResumeRole }
  'contact-click': { method: 'mailto' | 'copy' }
}

export type EventName = keyof Events

export const EVENTS: readonly EventName[] = ['work-reached', 'resume-download', 'contact-click']
