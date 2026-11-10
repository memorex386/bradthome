// The role switch's morph (spec 029's MA-15, D212). The morph itself is CSS,
// a cross-document View Transition (styles/home/morph.css). A role page opens
// at its top, and a browser holds every scroll back while a transition runs,
// so the old page goes to its top just before the browser captures it, and
// the morph plays where both pages begin. The role page's hero is then at
// rest, so only the morph moves. Any other navigation skips the morph.
type Swap = Event & {
  viewTransition: { skipTransition(): void } | null
  activation: { entry: { url: string | null }; navigationType: string } | null
}

addEventListener('pageswap', (event) => {
  const { viewTransition, activation } = event as Swap
  if (!viewTransition) return
  const to = activation?.entry.url
  if (activation?.navigationType !== 'push' || !to || !/^\/(mobile|fullstack|ai)$/.test(new URL(to).pathname))
    viewTransition.skipTransition()
  else scrollTo({ top: 0, behavior: 'instant' })
})

const land = (): void => {
  for (const animation of document.querySelector('.hero')?.getAnimations({ subtree: true }) ?? []) animation.finish()
}
// The module may run before the role page is revealed, or after, while the
// morph is already running; one of these two catches it.
addEventListener('pagereveal', (event) => {
  if ((event as Event & { viewTransition?: unknown }).viewTransition) land()
})
try {
  if (document.documentElement.matches(':active-view-transition')) land()
} catch {}
