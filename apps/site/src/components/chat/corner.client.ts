// "Ask about Brad" in a phone's corner (specs 031 and 032, D214 and D215).
// The corner's button shows whenever the hero's slot isn't fully on screen,
// and hides at the end of the page, by the contact section. When the slot
// comes fully into view, the corner's button flies into it and hands over to
// the hero's button there; as the slot starts to leave, it flies back out. So
// to a visitor it's one button. The flight is a transform, aimed each frame at
// where the slot is, so scrolling during it can't make it miss, and nothing in
// the layout moves. While the visitor scrolls down it shrinks to its sparkle;
// when they stop for 0.6 s, or scroll up, it opens back up. With reduced
// motion it swaps at once. The look is CSS. With no script neither is shown.

export {}

const hero = document.querySelector('.hero .chat-ask')
const corner = document.querySelector<HTMLElement>('.chat-corner')
const end = document.getElementById('contact')

if (hero && corner && end) {
  let last = scrollY
  let timer: ReturnType<typeof setTimeout> | undefined
  // Out of the slot, or not yet: the corner's position along its path, 0 in the corner and 1 in the slot.
  let off = false
  let p = 0
  let goal = 0
  let then = 0
  let base = corner.getBoundingClientRect()
  // On a page loaded at its top the corner first shows at 1.8 s, once the hero has settled,
  // as the desktop's button does (MA-20). Away from the top, where the hero settles at once (D204), it doesn't wait.
  let ready = scrollY > 0 || location.hash.length > 1

  const tick = (now: number): void => {
    p += Math.sign(goal - p) * Math.min(Math.abs(goal - p), (now - (then || now)) / 320)
    then = now
    const h = hero.getBoundingClientRect()
    const e = p * p * (3 - 2 * p)
    // The two buttons are the same pill, so the flight is a move alone.
    corner.style.transform = `translate(${(h.left - base.left) * e}px,${(h.top - base.top) * e}px)`
    if (p !== goal) {
      requestAnimationFrame(tick)
      return
    }
    then = 0
    corner.style.transform = ''
    corner.removeAttribute('data-fly')
    corner.toggleAttribute('data-float', !goal)
  }

  // Into the slot, or out of it: the corner shows for the flight, and the hero's button only once it lands.
  const fly = (into: boolean): void => {
    goal = into ? 1 : 0
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      p = goal
      corner.toggleAttribute('data-float', !into)
      return
    }
    corner.setAttribute('data-flown', '')
    if (!then) {
      corner.setAttribute('data-fly', '')
      corner.setAttribute('data-float', '')
      base = corner.getBoundingClientRect()
      // Drawn now, so no frame shows the corner before it leaves the slot.
      then = performance.now()
      tick(then)
    }
  }

  // The slot counts as in view once all of it is 100 px in: below the 72 px sticky header, and above the bottom.
  new IntersectionObserver(
    ([entry]) => {
      off = (entry?.intersectionRatio ?? 0) < 1
      if (ready) fly(!off)
    },
    { rootMargin: '-172px 0px -100px', threshold: 1 },
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
    p = off ? 0 : 1
    corner.toggleAttribute('data-float', off)
  }, 1800)
}
