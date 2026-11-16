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

/**
 * Brad's photo beside the heading (spec 039, D237): round, 76 px on a desktop
 * and 64 px on a phone, each at 1x and 2x, from public/photo/, which
 * `pnpm photo` writes with no metadata. Its alt text names Brad.
 */
export const PHOTO_SIZES = [64, 76, 128, 152] as const
export const PHOTO = {
  alt: 'Brad Thome',
  src: '/photo/brad-76.webp',
  srcset: PHOTO_SIZES.map((size) => `/photo/brad-${size}.webp ${size}w`).join(', '),
  sizes: '(max-width: 40rem) 64px, 76px',
  size: 76,
} as const
