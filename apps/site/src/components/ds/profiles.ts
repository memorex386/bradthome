// Brad's two profiles, as the header's icons and the hero's chips link them
// (spec 009's FR-003, spec 036). Both read them from here, so each address is
// written once. Each link's preview card comes from spec 016's snapshot or
// hand-written card for its address.

export interface Profile {
  key: 'github' | 'linkedin'
  label: string
  /** The handle the hero's chip shows under the name. */
  handle: string
  href: string
}

export const GITHUB: Profile = { key: 'github', label: 'GitHub', handle: '@memorex386', href: 'https://github.com/memorex386' }

export const LINKEDIN: Profile = {
  key: 'linkedin',
  label: 'LinkedIn',
  handle: 'in/brad-thome',
  href: 'https://www.linkedin.com/in/brad-thome/',
}

export const PROFILES: readonly Profile[] = [GITHUB, LINKEDIN]
