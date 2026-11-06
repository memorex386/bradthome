import type { Role } from './hero.ts'
import { resumeHrefOf } from '../resume/resume.ts'

// The words of the contact section that closes the new home page (spec 017).
// They're labels, not facts about Brad, so no claim backs them; the board's
// availability and reply-time lines are left out, since no public fact says
// either (D152).

export const HEADING = 'Get in touch'

/** The links under the address: Brad's profiles and the page's résumé PDF. */
export const linksOf = (role: Role): readonly { label: string; href: string; pdf?: boolean }[] => [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/brad-thome/' },
  { label: 'GitHub', href: 'https://github.com/memorex386' },
  { label: 'Résumé PDF', href: resumeHrefOf(role), pdf: true },
]
