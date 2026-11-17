import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import ChatWindow from './ChatWindow.tsx'
import { wantsFrom } from './wants.ts'

// The window's code, its own chunk, which ask.client.ts loads on the first
// open (D188). It draws the window into the dialog once, and returns how to
// put a claim's question in its box (spec 030, spec 038).

export function mount(root: HTMLElement, props: { resumeHref: string; onClose: () => void }): (question: string) => void {
  // Drawn at once, so the question box is there to focus when the dialog opens.
  const app = createRoot(root)
  // Prep's card's lines, which the page hands over in the dialog's data-wants (spec 042).
  const wants = wantsFrom(root.closest<HTMLElement>('[data-chat-dialog]')?.dataset.wants)
  let n = 0
  const draw = (prompt?: { text: string; n: number }): void =>
    flushSync(() => app.render(<ChatWindow resumeHref={props.resumeHref} onClose={props.onClose} prompt={prompt} wants={wants} />))
  draw()
  return (text) => draw({ text, n: ++n })
}
