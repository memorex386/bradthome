// Loads the offer agent's replay (spec 047), in the site's one module. Until
// the replay nears the screen, the page has only its reserved box; then this
// loads the player's own chunk, with its styles, once. If it can't load, the
// box stays as drawn, with the label and the link to the whole conversation.

export {}

const replay = document.querySelector<HTMLElement>('[data-replay]')
if (replay && 'IntersectionObserver' in window) {
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      near.disconnect()
      import('./player.ts').then(({ start }) => start(replay)).catch(() => undefined)
    },
    { rootMargin: '600px 0px' },
  )
  near.observe(replay)
}
