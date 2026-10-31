// commitlint's config. Messages follow Conventional Commits, and each one
// names its spec in the scope, as in feat(001): …, or its issue in a Refs: #N
// trailer (FR-010). Merge commits that git writes are let through by the hook,
// so commitlint's own ignores are off.

import type { UserConfig } from '@commitlint/types'

// Light and trivial changes use a short word as the scope, such as repo or
// docs, so accept those as well as a spec number.
const SCOPE = /^[a-z0-9-]+$/
const REFS_TRAILER = /^Refs: #\d+$/m

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: false,
  helpUrl: 'docs/working-agreement.md#conventions',
  plugins: [
    {
      rules: {
        'spec-or-issue': ({ scope, body, footer }) => {
          const namesSpec = typeof scope === 'string' && SCOPE.test(scope)
          const refsIssue = REFS_TRAILER.test(`${body ?? ''}\n${footer ?? ''}`)
          return [namesSpec || refsIssue, 'name the spec, as in feat(001): …, or add a Refs: #N line']
        },
      },
    },
  ],
  rules: {
    'spec-or-issue': [2, 'always'],
  },
}

export default config
