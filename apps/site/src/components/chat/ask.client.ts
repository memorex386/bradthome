// Opens "Ask about Brad" (spec 022). It's part of the site's one module, and
// does nothing until a visitor presses the button: then it loads the window's
// code, which holds React, mounts it in the dialog once, and opens the dialog.
// The conversation stays while the page is open, and closing the dialog
// returns focus to what opened it. An "Ask me" receipt, or a drawer's ask
// link, opens it the same way with the claim's question in the box (spec
// 030, D213); with no script they stay links to the contact section.

// A module, so its names don't clash with the one module's other files.
export {}

type Mount = (root: HTMLElement, props: { resumeHref: string; onClose: () => void }) => (question: string) => void

function wire(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-chat-open]')
  const dialog = document.querySelector<HTMLDialogElement>('[data-chat-dialog]')
  const root = dialog?.querySelector<HTMLElement>('[data-chat-root]')
  if (button === null || dialog === null || root === null || root === undefined) return
  let mounted: Promise<(question: string) => void> | undefined
  let opener: HTMLElement = button

  const open = async (question?: string): Promise<void> => {
    button.setAttribute('aria-busy', 'true')
    try {
      mounted ??= import('./mount.tsx').then(({ mount }: { mount: Mount }) =>
        mount(root, { resumeHref: dialog.dataset.resume ?? '/', onClose: () => dialog.close() }),
      )
      const ask = await mounted
      if (question !== undefined) ask(question)
    } catch {
      mounted = undefined
      button.removeAttribute('aria-busy')
      // The window couldn't load: a receipt's link goes where it would with no script.
      if (opener instanceof HTMLAnchorElement) location.assign(opener.href)
      return
    }
    button.removeAttribute('aria-busy')
    if (!dialog.open) dialog.showModal()
    // React has drawn the window by now; the question box takes focus.
    window.requestAnimationFrame(() => dialog.querySelector<HTMLTextAreaElement>('textarea:not([disabled])')?.focus())
  }

  button.addEventListener('click', () => {
    opener = button
    void open()
  })
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.<HTMLElement>('[data-chat-ask]')
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    opener = link
    void open(link.dataset.chatAsk)
  })
  // A click on the backdrop, outside the panel, closes it as Escape does.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => opener.focus())
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true })
else wire()
