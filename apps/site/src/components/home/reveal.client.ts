// Sections reveal their evidence once (spec 028, D211). The look and motion
// are CSS, inside the no-preference query; this only says when, from one
// IntersectionObserver and no scroll handler (the brief's motion rules).
//
// - Each [data-reveal] block that's already on screen when the page loads, or
//   that never comes near, stays as it is: in its final state.
// - When a block's top edge enters, it takes data-rv="pre", a visible pose
//   (moved down a few pixels, never hidden); if it leaves again, it rests.
// - At 18% in view it takes data-rv="go" and plays once, and is forgotten,
//   so scrolling back replays nothing. Cards entering together play 90 ms
//   apart, and the script numbers a block's markers, bars and figures for
//   their own steps (MA-9–MA-11, MA-13, MA-14).
//
// On a pointer device, a soft light follows the pointer over a card (MA-19),
// from one passive pointermove listener. Under reduced motion, or with no
// script, none of this runs and every block is simply in place.

const blocks = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
// The CSS says whether motion is allowed, and whether there is a pointer that hovers.
const allowed = (name: string): boolean => getComputedStyle(document.documentElement).getPropertyValue(name).trim() === '1'

if (blocks.length > 0 && allowed('--rv-motion')) {
  const number = (block: HTMLElement, selector: string, reverse?: boolean): void => {
    const items = [...block.querySelectorAll<HTMLElement>(selector)]
    if (reverse) items.reverse()
    items.forEach((item, index) => item.style.setProperty('--rv-i', `${index}`))
  }
  let loaded = false

  const watch = new IntersectionObserver(
    (entries) => {
      let card = 0
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        const block = target as HTMLElement
        if (!loaded) {
          if (isIntersecting) watch.unobserve(block)
        } else if (intersectionRatio >= 0.18) {
          watch.unobserve(block)
          if (block.dataset.reveal === 'card') block.style.setProperty('--rv-d', `${card++ * 90}ms`)
          number(block, '.ds-claims .ds-marker')
          number(block, '.experience__span', true)
          number(block, '.ds-stat')
          block.dataset.rv = 'go'
        } else if (isIntersecting) block.dataset.rv = 'pre'
        else delete block.dataset.rv
      }
      loaded = true
    },
    // The screen reaches 20 px below its edge, more than the deepest pose (18 px), so a posed block can never push itself out and back in.
    { threshold: [0, 0.18], rootMargin: '0px 0px 20px 0px' },
  )
  for (const block of blocks) watch.observe(block)

  if (allowed('--rv-hover')) {
    addEventListener(
      'pointermove',
      (event) => {
        const card = (event.target as Element).closest?.<HTMLElement>('.ds-card[data-reveal]')
        const box = card?.getBoundingClientRect()
        if (!card || !box) return
        card.style.setProperty('--mx', `${event.clientX - box.left}px`)
        card.style.setProperty('--my', `${event.clientY - box.top}px`)
      },
      { passive: true },
    )
  }
}
