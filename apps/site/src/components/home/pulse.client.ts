import { CHAT_API_ORIGIN } from '../../../../chat-api/src/constants.ts'

// VINDecoded's live pulse (spec 041, D240), in the site's one module. The
// card shows the numbers it was built with. As it nears the viewport, this
// asks the site's own API once, never Apple, and swaps in the App Store's
// fresher numbers, with no motion, then says how old they are. The
// merged-PR count is built only, counted on Brad's PC (spec 044, D247), so
// nothing here touches it. The line is plain text, read where it stands,
// never a live region. "How this works" shows only with script, since it's
// script that opens it.

interface Answer {
  appStore?: { version?: unknown; released?: unknown; rating?: unknown; fetched?: unknown }
}

const card = document.querySelector<HTMLElement>('[data-pulse-card]')
if (card) {
  const one = (name: string) => card.querySelector<HTMLElement>(`[data-pulse="${name}"]`)
  const set = (name: string, text: string) => {
    const el = one(name)
    if (el) el.textContent = text
  }
  const short = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const shipped = (day: string) => {
    const days = Math.floor((Date.now() - Date.parse(`${day}T00:00:00Z`)) / 864e5)
    const ago = days < 0 ? '' : days === 0 ? ', today' : days === 1 ? ', yesterday' : `, ${days} days ago`
    set('shipped', `Shipped ${short(day)}${ago}`)
  }
  const age = (at: number) => {
    // Read as the answer arrives, which may be long after the page loaded.
    const minutes = Math.round((Date.now() - at) / 6e4)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 48) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    return `${Math.round(hours / 24)} days ago`
  }
  const day = /^\d{4}-\d\d-\d\d$/

  const button = card.querySelector<HTMLButtonElement>('[data-pulse-how]')
  const panel = document.getElementById(button?.getAttribute('aria-controls') ?? '')
  if (button && panel) {
    button.hidden = false
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true'
      button.setAttribute('aria-expanded', String(open))
      panel.hidden = !open
    })
  }

  const apply = (answer: Answer) => {
    const app = answer.appStore
    const appAt = typeof app?.fetched === 'string' ? Date.parse(app.fetched) : Number.NaN
    // The text goes in as text, never markup; the API checked each value's shape.
    if (typeof app?.version !== 'string' || typeof app.released !== 'string' || !day.test(app.released) || !(appAt > 0)) return
    set('version', `v${app.version}`)
    shipped(app.released)
    if (typeof app.rating === 'number') set('stars', app.rating.toFixed(1))
    one('dot')?.removeAttribute('hidden')
    card.dataset.pulseLive = ''
    set('line', `Live from the App Store · updated ${age(appAt)}`)
  }

  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      fetch(`${CHAT_API_ORIGIN}/pulse`)
        .then((response) => (response.ok ? (response.json() as Promise<Answer>) : {}))
        .then(apply)
        .catch(() => {})
    },
    { rootMargin: '600px 0px' },
  ).observe(card)
}
