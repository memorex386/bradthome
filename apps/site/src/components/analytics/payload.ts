import { HOST, RESUME_ROLES, WEBSITE_ID, type ResumeRole } from './umami.ts'

// The sender's pure parts (spec 018): whether to send at all, and exactly what
// each request's body holds. analytics.client.ts wires them to the page.

/** What the gate reads from the browser. */
export interface Signals {
  hostname: string
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}

/** Send only on bradthome.com (D156), and never under Do Not Track or Global Privacy Control (D157). */
export function shouldSend({ hostname, doNotTrack, globalPrivacyControl }: Signals): boolean {
  if (hostname !== HOST) return false
  if (doNotTrack === '1' || doNotTrack === 'yes') return false
  return globalPrivacyControl !== true
}

/** What the payload reads from the page. */
export interface Page {
  href: string
  referrer: string
  title: string
  language: string
  screen: { width: number; height: number }
}

/** Umami's default fields, less the query string, the hash and the referrer's path. */
export interface Payload {
  website: string
  hostname: string
  url: string
  referrer: string
  title: string
  language: string
  screen: string
  name?: string
  data?: Record<string, string>
}

/** Another site's origin, or empty for none, this site, or anything unreadable. */
export function referrerOf(referrer: string, href: string): string {
  try {
    const from = new URL(referrer)
    if (from.protocol !== 'https:' && from.protocol !== 'http:') return ''
    return from.origin === new URL(href).origin ? '' : from.origin
  } catch {
    return ''
  }
}

/** The body's payload for a page view, or for an event with its one property. */
export function payloadOf(page: Page, name?: string, data?: Record<string, string>): Payload {
  const url = new URL(page.href)
  return {
    website: WEBSITE_ID,
    hostname: url.hostname,
    url: url.pathname,
    referrer: referrerOf(page.referrer, page.href),
    title: page.title,
    language: page.language,
    screen: `${page.screen.width}x${page.screen.height}`,
    ...(name === undefined ? {} : { name }),
    ...(data === undefined ? {} : { data }),
  }
}

/** The role of a link to a résumé PDF on this site, or undefined for any other link. */
export function resumeRoleOf(href: string, base: string): ResumeRole | undefined {
  try {
    const url = new URL(href, base)
    if (url.origin !== new URL(base).origin) return undefined
    const match = /^\/resume\/([^/]+\.pdf)$/.exec(url.pathname)
    return match === null ? undefined : (RESUME_ROLES as Record<string, ResumeRole>)[match[1] ?? '']
  } catch {
    return undefined
  }
}
