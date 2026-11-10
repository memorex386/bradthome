// A page that loads away from the top, at /#hopper or scrolled down after a
// reload, finishes the hero's sequence at once, so it never plays out of
// sight or replays on the way back (spec 025's T8, D204). It looks twice, now
// and at load, when a restored scroll has landed; it adds no scroll handler.
const settle = (): void => {
  if (location.hash.length < 2 && scrollY === 0) return
  for (const animation of document.querySelector('.hero')?.getAnimations({ subtree: true }) ?? []) animation.finish()
}

settle()
addEventListener('load', settle, { once: true })
