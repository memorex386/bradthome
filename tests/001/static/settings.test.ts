import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { repoPath, slash } from '../helpers/paths.ts'
import { type Call, hookMatcherCovers, matchingRules } from '../helpers/rules.ts'

// .claude/settings.json, read as Claude Code reads its permission rules. Deny
// and ask rules hold in every permission mode, bypass included, and whether or
// not a hook runs.

interface Handler {
  type?: string
  command?: string
  args?: string[]
  async?: boolean
}

interface Settings {
  permissions?: { allow?: string[]; deny?: string[]; ask?: string[] }
  hooks?: Record<string, { matcher?: string; hooks?: Handler[] }[]>
  disableAllHooks?: boolean
  env?: Record<string, string>
}

const SETTINGS_TEXT = readFileSync(repoPath('.claude', 'settings.json'), 'utf8')
const SETTINGS = JSON.parse(SETTINGS_TEXT) as Settings
const DENY = SETTINGS.permissions?.deny ?? []
const ASK = SETTINGS.permissions?.ask ?? []

const GRAPHQL_MERGE = `gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: "PR_kwDOdemo"}) { clientMutationId } }'`
const GRAPHQL_AUTO_MERGE = `gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {pullRequestId: "PR_kwDOdemo", mergeMethod: SQUASH}) { clientMutationId } }'`

const bash = (command: string): Call => ({ tool: 'Bash', command })
const powershell = (command: string): Call => ({ tool: 'PowerShell', command })
const editing = (path: string): Call[] => [
  { tool: 'Edit', path },
  { tool: 'Write', path },
]

function label(call: Call): string {
  if ('command' in call) return `${call.tool}(${call.command})`
  if ('path' in call) return `${call.tool}(${call.path})`
  return call.tool
}

const MERGE_AND_APPROVE: Call[] = [
  ...[
    'gh pr merge 12 --squash',
    'gh pr merge --auto 12',
    'GH_REPO=memorex386/bradthome gh pr merge 12',
    'git status && gh pr merge 12 --squash',
    'gh api -X PUT repos/memorex386/bradthome/pulls/12/merge',
    GRAPHQL_MERGE,
    GRAPHQL_AUTO_MERGE,
    'gh pr review 12 --approve',
    'gh api repos/memorex386/bradthome/pulls/12/reviews -f event=APPROVE',
  ].map(bash),
  ...['gh pr merge 12 --squash', 'gh pr review 12 --approve'].map(powershell),
  { tool: 'mcp__ccd_pr__set_auto_merge' },
]

const SKIPPING_HOOKS: Call[] = [
  ...[
    'git commit --no-verify -m "feat(001): wip"',
    'git push --no-verify',
    'HUSKY=0 git commit -m "feat(001): wip"',
    'git -c core.hooksPath=/dev/null commit -m "feat(001): wip"',
    'git config core.hooksPath .git/hooks',
  ].map(bash),
  ...['git commit --no-verify -m "feat(001): wip"', 'git push --no-verify'].map(powershell),
]

const C4_CALLS: Call[] = [
  ...[
    'GH_CONFIG_DIR="$APPDATA/GitHub CLI" gh api -X POST repos/memorex386/bradthome/rulesets --input ruleset.json',
    'GH_CONFIG_DIR=/tmp/other-login gh api user',
    'GH_TOKEN=x gh pr list',
    'GITHUB_TOKEN=x gh api user',
    'export GH_CONFIG_DIR=/tmp/other-login',
    'gh auth switch',
    'gh auth switch --user memorex386',
    'gh auth login --web',
    'gh auth logout',
    'gh auth token',
    'gh auth refresh -s admin:org',
    'gh auth setup-git',
    'git config --global bradthome.agentGhConfigDir /tmp/other-login',
    'git config --global --unset bradthome.privateTerms',
    'git config bradthome.privateTerms /tmp/empty-list.txt',
  ].map(bash),
  ...[
    '$env:GH_CONFIG_DIR = "$env:APPDATA\\GitHub CLI"; gh api user',
    "$env:GH_TOKEN = 'x'; gh pr list",
    'gh auth switch',
    'git config --global bradthome.privateTerms C:\\temp\\empty-list.txt',
  ].map(powershell),
]

const C9_PATHS = [
  '.claude/settings.json',
  '.claude/hooks/guard.ts',
  '.claude/hooks/lib/shell.ts',
  '.husky/pre-commit',
  '.husky/_/h',
  '.claude/worktrees/feature-x/.claude/settings.json',
  '.claude/worktrees/feature-x/.claude/hooks/stop.ts',
  '.claude/worktrees/feature-x/.husky/pre-push',
]

const C0_CALLS: Call[] = [
  ...[
    'gh pr view 12 --json author,state',
    'gh pr create --draft --title "feat(001): add the hooks" --body "Adds the hooks."',
    'gh pr comment 12 --body "Waiting for Brad to approve and merge."',
    'gh pr checks 12',
    'gh api repos/memorex386/bradthome/pulls/12',
    'git push -u origin 001-hooks-and-agent-rules',
    'git merge main',
    'git commit -m "feat(001): add the guard"',
    'git log -n 5',
    'git push -n',
    'pnpm sync',
    'pnpm lock specs/001-hooks-and-agent-rules --check',
  ].map(bash),
  ...['gh pr view 12 --json author,state', 'git merge main'].map(powershell),
]

const ORDINARY_EDITS = [
  'scripts/lib/terms.ts',
  'docs/plan.md',
  'README.md',
  '.agents/skills/review/SKILL.md',
  'tests/001/unit/guard.test.ts',
  'specs/001-hooks-and-agent-rules/spec.md',
]

describe('deny rules', () => {
  test("FR-017 S2.4 S2.5 deny merging and approving through gh, the REST and GraphQL APIs and the desktop app's auto-merge tool", () => {
    for (const call of MERGE_AND_APPROVE) {
      expect(matchingRules(DENY, call, 'deny').length, label(call)).toBeGreaterThan(0)
    }
  })

  test('FR-017 S2.6 deny git commands that skip the hooks', () => {
    for (const call of SKIPPING_HOOKS) {
      expect(matchingRules(DENY, call, 'deny').length, label(call)).toBeGreaterThan(0)
    }
  })
})

describe('ask rules', () => {
  test("C4 S2.7 FR-018 a command that switches gh's login, config folder or token asks Brad first", () => {
    for (const call of C4_CALLS) {
      expect(matchingRules(ASK, call, 'ask').length, label(call)).toBeGreaterThan(0)
      expect(matchingRules(DENY, call, 'deny'), label(call)).toEqual([])
    }
  })

  test("C4 S2.7 FR-018 an edit to the checkout's local settings, which hold gh's login, asks Brad first", () => {
    for (const call of editing('.claude/settings.local.json')) {
      expect(matchingRules(ASK, call, 'ask').length, label(call)).toBeGreaterThan(0)
    }
  })

  test("C9 S2.11 FR-021 an edit to the guard's own files asks Brad first, at any depth, worktrees included", () => {
    for (const call of C9_PATHS.flatMap(editing)) {
      expect(matchingRules(ASK, call, 'ask').length, label(call)).toBeGreaterThan(0)
      expect(matchingRules(DENY, call, 'deny'), label(call)).toEqual([])
    }
  })
})

describe('normal work goes through', () => {
  test('C0 S2.8 FR-017 FR-018 normal gh, git and pnpm use matches no deny or ask rule', () => {
    for (const call of C0_CALLS) {
      expect(matchingRules(DENY, call, 'deny'), label(call)).toEqual([])
      expect(matchingRules(ASK, call, 'ask'), label(call)).toEqual([])
    }
  })

  test('C9 S2.11 FR-021 an ordinary edit matches no deny or ask rule', () => {
    for (const call of ORDINARY_EDITS.flatMap(editing)) {
      expect(matchingRules(DENY, call, 'deny'), label(call)).toEqual([])
      expect(matchingRules(ASK, call, 'ask'), label(call)).toEqual([])
    }
  })
})

function handlers(event: string): { matcher: string | undefined; handler: Handler }[] {
  return (SETTINGS.hooks?.[event] ?? []).flatMap((group) =>
    (group.hooks ?? []).map((handler) => ({ matcher: group.matcher, handler })),
  )
}

function runs(handler: Handler, file: string): boolean {
  return slash([handler.command ?? '', ...(handler.args ?? [])].join(' ')).includes(file)
}

describe('hooks', () => {
  test('FR-017 FR-022 the settings hold the guard, the turn-start hook and the Stop hook, and no other hook', () => {
    expect(Object.keys(SETTINGS.hooks ?? {}).sort()).toEqual(['PreToolUse', 'Stop', 'UserPromptSubmit'])
    const expected: Record<string, string> = {
      PreToolUse: '.claude/hooks/guard.ts',
      UserPromptSubmit: '.claude/hooks/turn-start.ts',
      Stop: '.claude/hooks/stop.ts',
    }
    for (const [event, file] of Object.entries(expected)) {
      const found = handlers(event)
      expect(found.length, event).toBeGreaterThan(0)
      for (const { handler } of found) {
        expect(handler.type, event).toBe('command')
        expect(handler.async, event).not.toBe(true)
        expect(runs(handler, file), `${event} runs only ${file}`).toBe(true)
      }
    }
  })

  test('FR-017 FR-019 FR-020 the guard runs before every shell, file and browser call, and the auto-merge tool', () => {
    const matchers = handlers('PreToolUse').map((found) => found.matcher)
    for (const tool of [
      'Bash',
      'PowerShell',
      'Edit',
      'Write',
      'mcp__Claude_Browser__navigate',
      'mcp__Claude_Browser__browser_batch',
      'mcp__Claude_Browser__preview_start',
      'mcp__claude-in-chrome__navigate',
      'mcp__ccd_pr__set_auto_merge',
    ]) {
      expect(matchers.some((matcher) => hookMatcherCovers(matcher, tool)), tool).toBe(true)
    }
  })

  test('FR-017 FR-021 a user-level switch cannot turn the hooks off', () => {
    expect(SETTINGS.disableAllHooks).toBe(false)
  })
})

describe("gh's login stays on the machine", () => {
  test("S2.8 FR-018 the committed settings name no machine path and don't set gh's config folder", () => {
    // A drive letter that starts a path, such as C:\ or C:/, but not the s:/ in https://.
    expect(SETTINGS_TEXT).not.toMatch(/(?<![A-Za-z])[A-Za-z]:[\\/]|\/Users\/|\/home\//)
    expect(Object.keys(SETTINGS.env ?? {})).not.toContain('GH_CONFIG_DIR')
  })

  test('S2.8 FR-018 the local settings are ignored, and worktrees that Claude Code makes get a copy', () => {
    const ignored = readFileSync(repoPath('.gitignore'), 'utf8').split(/\r?\n/).map((line) => line.trim())
    expect(ignored).toContain('.claude/settings.local.json')
    const included = readFileSync(repoPath('.worktreeinclude'), 'utf8').split(/\r?\n/).map((line) => line.trim())
    expect(included).toContain('.claude/settings.local.json')
  })
})
