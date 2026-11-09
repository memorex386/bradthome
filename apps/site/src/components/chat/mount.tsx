import { createRoot } from 'react-dom/client'
import ChatWindow from './ChatWindow.tsx'

// The window's code, its own chunk, which ask.client.ts loads on the first
// open (D188). It draws the window into the dialog once.

export function mount(root: HTMLElement, props: { resumeHref: string; onClose: () => void }): void {
  createRoot(root).render(<ChatWindow resumeHref={props.resumeHref} onClose={props.onClose} />)
}
