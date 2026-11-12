// Brad's one public contact (D4): the address, its mail link and the copy
// button's words (spec 017). Every page that offers contact takes them from
// here, so the address can only be spelled one way.

export const EMAIL = 'brad@bradthome.com'
export const MAILTO = `mailto:${EMAIL}`

/** Whether a link's href is a mail link, for the analytics' contact click (spec 018). */
export const isMailto = (href: string): boolean => /^mailto:/i.test(href)

/** The copy button's visible label in each state, and what the live region says. */
export const COPY = {
  rest: 'Copy address',
  copied: 'Copied',
  selected: 'Address selected',
  copiedNote: `Copied ${EMAIL} to the clipboard.`,
  selectedNote: `Couldn't copy here, so the address is selected. Copy it with your keyboard or the menu.`,
} as const

/** How long the visible label says "Copied" before it rests again, in milliseconds. */
export const COPIED_FOR = 2600

/** The word the split look's button shows on a phone in place of the address, which stays in its name (spec 036). */
export const EMAIL_WORD = 'Email'
