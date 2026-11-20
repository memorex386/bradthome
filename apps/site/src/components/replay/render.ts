import { KINDS, OFFERS, PHONE, SUMMARY, TRACE, totalOf, type Kind, type Offer, type Path, type Step, stepsOf } from './replay.ts'

// The replay's markup (spec 047), as strings, so the home's player and the
// page's finished frames draw the same thing from the same words. Every word
// is escaped as text; the only markup is what these functions write. Icons
// are drawn here, never Hopper's, with no logo or wordmark.

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** An offer's text, with `**bold**` and `[[money]]`. */
export function rich(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[(.+?)\]\]/g, '<span class="r-money">$1</span>')
}

const SPARK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z"/></svg>'

const ICON: Readonly<Record<Offer, string>> = {
  a: '<svg class="r-offer__icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="22" cy="26" r="20" class="r-i-disc"/><path d="M9 27h22l4-3-4-3H9zM17 21l3-7h3l-1 7zM17 27l3 7h3l-1-7zM12 24l-3-5h2l4 5z" fill="#fff"/><circle cx="37" cy="11" r="9" class="r-i-badge"/><path d="M37 6v5l3 2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  b: '<svg class="r-offer__icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="22" cy="26" r="20" class="r-i-disc"/><rect x="11" y="16" width="22" height="20" rx="3" fill="#fff"/><path d="M17 26l10 6M27 26l-10 6" class="r-i-x"/><circle cx="37" cy="11" r="9" class="r-i-badge"/><path d="M33 11l3 3 5-6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

const GLYPH: Readonly<Record<string, string>> = {
  plane: '<path d="M1 9h9l3-1-3-1H1zM6 7l2-5h1.5L9 7zM6 9l2 5h1.5L9 9z"/>',
  coin: '<circle cx="8" cy="8" r="7"/><path d="M8 4v8M10.5 5.5H7a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H5.5" stroke="#fff" stroke-width="1.4" fill="none"/>',
  phone: '<path d="M4 1l3 3-2 2c1 2 3 4 5 5l2-2 3 3-2 2C7 14 2 9 2 3z"/>',
  calendar: '<rect x="1" y="3" width="14" height="12" rx="2"/><path d="M5 1v4M11 1v4" stroke="currentColor" stroke-width="2"/>',
}

export function offerOf(offer: Offer, picked?: boolean): string {
  const card = OFFERS[offer]
  const bullets = card.bullets
    .map(
      (bullet) => `<li><svg viewBox="0 0 16 16" aria-hidden="true">${GLYPH[bullet.icon] ?? ''}</svg><span>${rich(bullet.text)}</span></li>`,
    )
    .join('')
  const chosen = (yes: boolean) => (picked === yes ? ` r-pick"><span class="r-sr">${PHONE.chosen}: </span>` : '">')
  return (
    `<div class="r-msg r-offer r-offer--${offer}${picked === undefined ? '' : ' r-offer--decided'}" data-r-offer="${offer}">` +
    `${ICON[offer]}<p class="r-offer__title">${esc(card.title)}</p><p>${rich(card.lead)}</p><ul>${bullets}</ul>` +
    `<p class="r-links">${card.links.map((link) => `<span>${esc(link)}</span>`).join('')}</p>` +
    `<p class="r-btn${chosen(true)}${esc(card.yes)}</p><p class="r-no${chosen(false)}${esc(card.no)}</p></div>`
  )
}

export function pillsOf(pills: readonly string[]): string {
  return `<ul class="r-pills" aria-label="${esc(PHONE.pills)}">${pills.map((pill) => `<li>${esc(pill)}</li>`).join('')}</ul>`
}

export function aiOf(text: string): string {
  return `<p class="r-who">${SPARK}${esc(PHONE.who)}</p><p class="r-msg r-ai">${esc(text)}</p>`
}

export function meOf(text: string): string {
  return `<p class="r-msg r-me"><span class="r-sr">${esc(PHONE.traveler)}: </span>${esc(text)}</p>`
}

export function summaryOf(a: boolean, b: boolean): string {
  const line = (offer: Offer, on: boolean) =>
    `<p class="r-line"><span>${esc(OFFERS[offer].title)}</span><em class="${on ? 'r-add' : 'r-off'}">${
      on ? `${SUMMARY.added} · ${OFFERS[offer].price}` : SUMMARY.declined
    }</em></p>`
  return (
    `<div class="r-msg r-done"><p class="r-done__title">${esc(SUMMARY.title)}</p>${line('a', a)}${line('b', b)}` +
    `<p class="r-line"><span>${esc(SUMMARY.total)}</span><em>${totalOf(a, b)}</em></p>` +
    `<p class="r-row"><span>${esc(SUMMARY.change)}</span><span class="r-go">${esc(SUMMARY.go)}</span></p></div>`
  )
}

export function secOf(text: string): string {
  return `<li class="r-sec">${esc(text)}</li>`
}

export function entryOf(kind: Kind, title: string, detail?: string, now = false): string {
  return (
    `<li class="r-ent${now ? ' r-now' : ''}"><span class="r-k r-k--${kind}">${esc(KINDS[kind].badge)}</span>` +
    `<div><p class="r-t">${esc(title)}</p>${detail === undefined ? '' : `<code>${esc(detail)}</code>`}</div></li>`
  )
}

/** Inside the phone: the trip's bar, the conversation so far, and the box to type in. */
export function phoneOf(chat = ''): string {
  return (
    `<div class="r-screen"><p class="r-bar"><strong>${esc(PHONE.route)}</strong>${esc(PHONE.departs)}</p>` +
    `<div class="r-chat" data-r-chat>${chat}</div><p class="r-compose"><span class="r-box" data-r-box>${esc(PHONE.placeholder)}</span>` +
    `<span class="r-send" data-r-send><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg></span></p></div>`
  )
}

/** Inside the trace: its head, its lines so far, and the legend of their kinds. */
export function traceOf(log = ''): string {
  const legend = Object.entries(KINDS)
    .map(([kind, look]) => `<li class="r-l r-l--${kind}">${esc(look.legend)}</li>`)
    .join('')
  return (
    `<p class="r-trace__head"><b>${esc(TRACE.title)}</b><span>${esc(TRACE.note)}</span></p>` +
    `<ol class="r-log" data-r-log>${log}</ol><ul class="r-legend">${legend}</ul>`
  )
}

/** The finished frame of one path: the whole conversation and the whole trace. */
export function finishedOf(path: Path): { chat: string; log: string } {
  const steps: Step[] = stepsOf(path)
  const picks = new Map<Offer, boolean>()
  for (const step of steps) if ('pick' in step) picks.set(step.pick[0], step.pick[1])
  let chat = ''
  let log = ''
  for (const step of steps) {
    if ('sec' in step) log += secOf(step.sec)
    else if ('tr' in step) log += entryOf(step.tr[0], step.tr[1], step.tr[2])
    else if ('ai' in step) chat += aiOf(step.ai)
    else if ('offer' in step) chat += offerOf(step.offer, picks.get(step.offer))
    else if ('pills' in step) chat += pillsOf(step.pills)
    else if ('type' in step) chat += meOf(step.type)
    else if ('summary' in step) chat += summaryOf(step.summary[0], step.summary[1])
  }
  return { chat, log }
}
