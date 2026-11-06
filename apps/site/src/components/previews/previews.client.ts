// The link previews' one script (spec 016, D147). It only adds to plain links:
// with no script, or no popover support, each link just goes where it says.
//
// - Hover, with a mouse: the card opens after a short pause and stays while
//   the pointer is on the link or the card, so the pointer can move onto it.
// - Keyboard focus: the card opens at once and closes when focus moves on.
// - Escape closes it, and focus stays on the link (the browser's popover).
// - A tap: the first tap opens the card as a sheet and doesn't follow the
//   link; the sheet's Open button follows it, and Close or a tap outside
//   closes it and puts focus back on the link. Focus is never trapped.
//
// The card is placed beside the link, never over it, and a sheet scrolls the
// page so the link stays in view above it. Nothing here moves the page's
// layout, and nothing is fetched.

const OPEN_DELAY = 300
const CLOSE_DELAY = 200
const GAP = 8

type Mode = 'hover' | 'focus' | 'sheet'

let lastPointer = 'mouse'
document.addEventListener(
  'pointerdown',
  (event) => {
    lastPointer = event.pointerType
  },
  { capture: true, passive: true },
)

const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function'

function place(link: HTMLElement, card: HTMLElement): void {
  const box = link.getBoundingClientRect()
  const width = card.offsetWidth
  const height = card.offsetHeight
  let top = box.bottom + GAP
  if (top + height > window.innerHeight - GAP && box.top - GAP - height >= GAP) top = box.top - GAP - height
  const left = Math.min(Math.max(box.left, GAP), Math.max(GAP, window.innerWidth - width - GAP))
  card.style.setProperty('top', `${Math.round(top)}px`)
  card.style.setProperty('left', `${Math.round(left)}px`)
}

function keepInView(link: HTMLElement, card: HTMLElement): void {
  const box = link.getBoundingClientRect()
  const sheet = card.getBoundingClientRect()
  const overlap = box.bottom + GAP - sheet.top
  if (overlap > 0) window.scrollBy({ top: overlap, behavior: 'instant' })
  else if (box.top < 0) window.scrollBy({ top: box.top - GAP, behavior: 'instant' })
}

function wire(link: HTMLAnchorElement, card: HTMLElement): void {
  let mode: Mode | undefined
  let timer: number | undefined

  const clear = (): void => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
  }

  const show = (next: Mode): void => {
    clear()
    card.classList.toggle('lp-card--sheet', next === 'sheet')
    // A sheet sits along the bottom, so it drops any place an earlier hover or focus card left.
    card.style.removeProperty('top')
    card.style.removeProperty('left')
    mode = next
    if (!card.matches(':popover-open')) card.showPopover()
    if (next === 'sheet') {
      keepInView(link, card)
      card.querySelector<HTMLElement>('.lp-card__open')?.focus({ preventScroll: true })
    } else {
      place(link, card)
    }
  }

  const hide = (): void => {
    clear()
    if (card.matches(':popover-open')) card.hidePopover()
  }

  const later = (action: () => void, delay: number): void => {
    clear()
    timer = window.setTimeout(action, delay)
  }

  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || mode === 'sheet' || mode === 'focus') return
    if (mode === 'hover') clear()
    else later(() => show('hover'), OPEN_DELAY)
  })
  link.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return
    if (mode === 'hover') later(hide, CLOSE_DELAY)
    else if (mode === undefined) clear()
  })
  card.addEventListener('pointerenter', () => {
    if (mode === 'hover') clear()
  })
  card.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && mode === 'hover') later(hide, CLOSE_DELAY)
  })

  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) show('focus')
  })
  link.addEventListener('blur', (event) => {
    if (mode !== 'focus') return
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return
    hide()
  })

  link.addEventListener('click', (event) => {
    if (lastPointer !== 'touch' && lastPointer !== 'pen') return
    if (mode === 'sheet' && card.matches(':popover-open')) return
    event.preventDefault()
    show('sheet')
  })

  card.querySelector('[data-preview-close]')?.addEventListener('click', hide)

  card.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState !== 'closed') return
    const wasSheet = mode === 'sheet'
    mode = undefined
    clear()
    if (wasSheet) {
      card.classList.remove('lp-card--sheet')
      const active = document.activeElement
      if (active === null || active === document.body || card.contains(active)) link.focus({ preventScroll: true })
    }
  })

  window.addEventListener(
    'scroll',
    () => {
      if (mode === 'hover') hide()
      else if (mode === 'focus' && card.matches(':popover-open')) place(link, card)
    },
    { passive: true },
  )
}

if (supportsPopover) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-preview]')) {
    const card = document.getElementById(link.dataset.preview ?? '')
    if (card !== null) wire(link, card)
  }
}
