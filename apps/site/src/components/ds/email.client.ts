import { COPIED_FOR, COPY, EMAIL } from './contact.ts'

// The copy button beside Brad's address (spec 017). It only adds to a plain
// mail link: with no script the button is hidden and the link still works.
//
// - A click copies the address with the Clipboard API, the label says
//   "Copied" for two seconds, and the polite live region says what was copied.
// - Where the clipboard is missing or refused, it selects the address on the
//   page instead, so the visitor's own copy works, and says so.
//
// The three labels share one grid cell, so no change moves the layout. Nothing
// is fetched, and nothing about the visitor is sent anywhere.

type State = 'rest' | 'copied' | 'selected'

function wire(block: HTMLElement): void {
  const button = block.querySelector<HTMLButtonElement>('[data-email-copy]')
  const address = block.querySelector<HTMLElement>('[data-email-address]')
  const status = block.querySelector<HTMLElement>('[data-email-status]')
  if (button === null || address === null || status === null) return
  let timer: number | undefined

  const set = (state: State): void => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
    block.dataset.state = state
    if (state === 'copied') timer = window.setTimeout(() => set('rest'), COPIED_FOR)
  }

  // A live region speaks when its text changes, so it's cleared first: a second copy is announced again.
  const say = (note: string): void => {
    status.textContent = ''
    window.requestAnimationFrame(() => {
      status.textContent = note
    })
  }

  const select = (): void => {
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.selectAllChildren(address)
    set('selected')
    say(COPY.selectedNote)
  }

  button.addEventListener('click', () => {
    const clipboard = typeof navigator.clipboard?.writeText === 'function' ? navigator.clipboard : undefined
    if (clipboard === undefined) {
      select()
      return
    }
    clipboard.writeText(EMAIL).then(
      () => {
        set('copied')
        say(COPY.copiedNote)
      },
      () => {
        select()
      },
    )
  })
}

for (const block of document.querySelectorAll<HTMLElement>('[data-email]:not([data-demo])')) wire(block)
