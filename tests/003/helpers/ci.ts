// The checks C0 shows, in its order (S2.1). The gate expects every ci job but
// itself; locked-tests / lock and preview / deploy sit outside it.

/** Spec 003's new ci jobs. */
export const NEW_JOBS = ['lint', 'format', 'site-types', 'build', 'e2e', 'lighthouse', 'html', 'links'] as const

/** Every check the gate expects, in C0's order. */
export const GATE_JOBS = [
  ...NEW_JOBS,
  'types',
  'tests (ubuntu-24.04)',
  'tests (windows-2025)',
  'trace',
  'privacy',
  'secrets',
  'commits',
  'hygiene',
] as const

/** C0's 19 checks, as GitHub names them. */
export const C0_CHECKS = [...GATE_JOBS.map((name) => `ci / ${name}`), 'ci / gate', 'locked-tests / lock', 'preview / deploy'] as const
