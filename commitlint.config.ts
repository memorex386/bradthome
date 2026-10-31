// commitlint's config for the commit-msg hook (FR-010): Conventional Commits,
// plus one rule of ours. A commit names its spec as the scope, as in
// feat(001): …, or carries a Refs: #N line for its issue.

import type { UserConfig } from '@commitlint/types'

const SPEC_SCOPE = /^\d{3}$/
const REFS_TRAILER = /^Refs: #\d+$/m

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'spec-or-issue': ({ scope, body, footer }) => {
          const namesSpec = typeof scope === 'string' && SPEC_SCOPE.test(scope)
          const refsIssue = REFS_TRAILER.test(`${body ?? ''}\n${footer ?? ''}`)
          return [namesSpec || refsIssue, 'name the spec, as in feat(001): …, or add a Refs: #N line']
        },
      },
    },
  ],
  rules: {
    'spec-or-issue': [2, 'always'],
  },
  // Merge commits that git writes are recognized by MERGE_HEAD in the hook, so
  // a message that only looks like a merge is still checked.
  defaultIgnores: false,
  helpUrl: 'docs/working-agreement.md#conventions',
}

export default config
