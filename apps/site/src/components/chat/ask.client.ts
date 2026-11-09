// Opens "Ask about Brad" (spec 022). It's part of the site's one module, and
// does nothing until a visitor presses the button: then it loads the window's
// code, which holds React, mounts it in the dialog once, and opens the dialog.
// The conversation stays while the page is open, and closing the dialog
// returns focus to the button. A release build sets __BRADTHOME_CHAT__ false,
// so the bundler drops this and the window's code (D190).

declare const __BRADTHOME_CHAT__: boolean

// A module, so its names don't clash with the one module's other files.
export {}

type Mount = (root: HTMLElement, props: { resumeHref: string; onClose: () => void }) => void

function wire(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-chat-open]')
  const dialog = document.querySelector<HTMLDialogElement>('[data-chat-dialog]')
  const root = dialog?.querySelector<HTMLElement>('[data-chat-root]')
  if (button === null || dialog === null || root === null || root === undefined) return
  let mounted: Promise<void> | undefined

  const open = async (): Promise<void> => {
    button.setAttribute('aria-busy', 'true')
    try {
      mounted ??= import('./mount.tsx').then(({ mount }: { mount: Mount }) =>
        mount(root, { resumeHref: dialog.dataset.resume ?? '/', onClose: () => dialog.close() }),
      )
      await mounted
    } catch {
      mounted = undefined
      button.removeAttribute('aria-busy')
      return
    }
    button.removeAttribute('aria-busy')
    if (!dialog.open) dialog.showModal()
    // React has drawn the window by now; the question box takes focus.
    window.requestAnimationFrame(() => dialog.querySelector<HTMLTextAreaElement>('textarea:not([disabled])')?.focus())
  }

  button.addEventListener('click', () => void open())
  // A click on the backdrop, outside the panel, closes it as Escape does.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => button.focus())
}

if (__BRADTHOME_CHAT__) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true })
  else wire()
}
