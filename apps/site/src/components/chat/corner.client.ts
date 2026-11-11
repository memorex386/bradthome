// "Ask about Brad" in a phone's corner (spec 031, D214). The corner's button
// shows whenever the hero's is off screen, so only one is ever in view, and
// hides at the end of the page, by the contact section. While the visitor
// scrolls down it shrinks to its sparkle; when they stop for 0.6 s, or scroll
// up, it opens back up. Neither button ever moves, so layout shift stays 0.
// This only sets attributes on the corner's button: the look, the motion and
// whether any of it applies (a phone, and motion allowed for the shrinking)
// are CSS. The scroll listener is passive. With no script neither is shown.

export {}

const hero = document.querySelector('.hero .chat-ask')
const corner = document.querySelector('.chat-corner')
const end = document.getElementById('contact')

if (hero && corner && end) {
  let last = scrollY
  let timer: ReturnType<typeof setTimeout> | undefined
  let off = false
  // On a page loaded at its top the corner first shows at 1.8 s, once the
  // hero has settled, as the desktop's button does (MA-20). Away from the top,
  // where the hero settles at once (D204), it doesn't wait.
  let ready = scrollY > 0 || location.hash.length > 1
  const show = (): void => {
    corner.toggleAttribute('data-float', ready && off)
  }
  // Under the 72 px sticky header, the hero's button counts as off screen.
  new IntersectionObserver(
    ([entry]) => {
      off = !entry?.isIntersecting
      show()
    },
    { rootMargin: '-72px 0px 0px' },
  ).observe(hero)
  // The end: once the contact section's top is 150 px into the screen, or above it.
  new IntersectionObserver(
    ([entry]) => corner.toggleAttribute('data-end', !!entry && (entry.isIntersecting || entry.boundingClientRect.top < 0)),
    { rootMargin: '0px 0px -150px' },
  ).observe(end)
  addEventListener(
    'scroll',
    () => {
      const y = scrollY
      if (Math.abs(y - last) > 2) {
        corner.toggleAttribute('data-small', y > last)
        last = y
      }
      clearTimeout(timer)
      timer = setTimeout(() => corner.removeAttribute('data-small'), 600)
    },
    { passive: true },
  )
  setTimeout(() => {
    ready = true
    show()
  }, 1800)
}
