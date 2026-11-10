// The sticky header's few attributes (spec 027, D209). Its look and motion
// are CSS; this only tells the CSS where the reader is, from three
// IntersectionObservers and no scroll handler (the brief's motion rules):
//
// - data-stuck, once the page has scrolled past an 8 px mark at its top (MA-6).
// - data-band, while the Hopper band is under the header (MA-7).
// - aria-current="location" on the section being read, the last one whose top
//   has passed 40% of the screen, and the rule's place under its link (MA-8).
//   An observer on the screen's top 40% fires as sections enter or leave it.
//
// With no script none of this runs: the header still stays at the top, on a
// solid background, and no link is marked.

const header = document.querySelector<HTMLElement>('[data-sticky]')
const mark = document.querySelector('.ds-header-mark')

if (header && mark) {
  const rule = header.querySelector<HTMLElement>('.ds-header__rule')
  const links = [...header.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
  const ids = [...new Set(links.map((link) => link.hash.slice(1)))]
  const sections = ids.map((id) => document.getElementById(id))
  let current = -1

  const show = (): void => {
    const id = ids[current]
    for (const link of links) {
      if (link.hash.slice(1) === id) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    }
    const shown = rule?.parentElement?.querySelector<HTMLElement>('[aria-current]')
    rule?.style.setProperty('--x', `${shown?.offsetLeft ?? 0}px`)
    rule?.style.setProperty('--w', `${shown?.offsetWidth ?? 0}`)
  }

  new IntersectionObserver(([entry]) => header.toggleAttribute('data-stuck', !entry?.isIntersecting)).observe(mark)

  const band = document.querySelector('.ds-band')
  if (band) {
    new IntersectionObserver(([entry]) => header.toggleAttribute('data-band', !!entry?.isIntersecting), {
      rootMargin: '-3% 0px -96% 0px',
    }).observe(band)
  }

  // Any section entering or leaving the screen's top 40% means the answer may
  // have changed, even after a long jump, so each change reads every section.
  const reading = new IntersectionObserver(
    () => {
      current = -1
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= innerHeight * 0.4) current = index
      })
      show()
    },
    { rootMargin: '0px 0px -60% 0px' },
  )
  for (const section of sections) if (section) reading.observe(section)

  addEventListener('resize', show)
  void document.fonts.ready.then(show)
}
