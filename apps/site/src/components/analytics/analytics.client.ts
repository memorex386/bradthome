import { isMailto } from '../ds/contact.ts'
import { payloadOf, resumeRoleOf, shouldSend } from './payload.ts'
import { ENDPOINT, WORK_MARGIN, WORK_SECTION, type EventName, type Events } from './umami.ts'

// The site's analytics (spec 018, D155): a page view, and the charter's three
// moments, sent to Umami Cloud's collection API from the site's one module.
//
// - It sends only on bradthome.com, and never when the browser sets Do Not
//   Track or Global Privacy Control (D156, D157). Anywhere else, nothing is
//   wired and track() does nothing.
// - It writes no cookie and no storage. Umami's cache token stays in memory.
// - A failed request changes nothing on the page, and isn't retried.

const enabled = shouldSend({
  hostname: location.hostname,
  doNotTrack: navigator.doNotTrack,
  globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
})

let cache: string | undefined

function send(name?: string, data?: Record<string, string>): void {
  const payload = payloadOf(
    {
      href: location.href,
      referrer: document.referrer,
      title: document.title,
      language: navigator.language,
      screen: { width: screen.width, height: screen.height },
    },
    name,
    data,
  )
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cache !== undefined) headers['x-umami-cache'] = cache
  fetch(ENDPOINT, { method: 'POST', keepalive: true, credentials: 'omit', headers, body: JSON.stringify({ type: 'event', payload }) })
    .then((response) => (response.ok ? (response.json() as Promise<{ cache?: unknown }>) : undefined))
    .then((answer) => {
      if (typeof answer?.cache === 'string') cache = answer.cache
    })
    .catch(() => undefined)
}

/** Sends one of the three events, with its one property. Does nothing off production. */
export function track<Name extends EventName>(name: Name, ...data: Events[Name] extends undefined ? [] : [Events[Name]]): void {
  if (!enabled) return
  send(name, data[0])
}

function wire(): void {
  send()

  const work = document.getElementById(WORK_SECTION)
  if (work !== null && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        track('work-reached')
      },
      { rootMargin: WORK_MARGIN },
    )
    observer.observe(work)
  }

  const onLink = (event: MouseEvent): void => {
    if (event.type === 'auxclick' && event.button !== 1) return
    const link = (event.target as Element | null)?.closest?.('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    // The chat sends no analytics event (spec 022's FR-008, D175), so its own links aren't counted.
    if (link.closest('[data-chat-dialog]') !== null) return
    const href = link.getAttribute('href') ?? ''
    if (isMailto(href)) {
      track('contact-click', { method: 'mailto' })
      return
    }
    const role = resumeRoleOf(href, location.href)
    if (role !== undefined) track('resume-download', { role })
  }
  document.addEventListener('click', onLink, { capture: true })
  document.addEventListener('auxclick', onLink, { capture: true })
}

if (enabled) wire()
