import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { decide } from '../../../.claude/hooks/guard.ts'
import {
  bash,
  type HookInput,
  powershell,
  preToolUseDecision,
  processDecision,
  runHook,
  toolCall,
} from '../helpers/hook-input.ts'
import { C } from '../helpers/messages.ts'
import { SCRIPTS } from '../helpers/paths.ts'
import { createSandbox, type Sandbox } from '../helpers/sandbox.ts'

// The PreToolUse guard in .claude/hooks/guard.ts, through the decision logic
// it exports and, for the protocol, as the process Claude Code runs.

let cwd: string
let sandbox: Sandbox

beforeAll(() => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'bradthome-001-guard-'))
  writeFileSync(
    path.join(cwd, 'merge.graphql'),
    'mutation {\n  mergePullRequest(input: {pullRequestId: "PR_kwDOdemo"}) {\n    clientMutationId\n  }\n}\n',
  )
  writeFileSync(
    path.join(cwd, 'automerge.graphql'),
    'mutation {\n  enablePullRequestAutoMerge(input: {pullRequestId: "PR_kwDOdemo", mergeMethod: SQUASH}) {\n    clientMutationId\n  }\n}\n',
  )
  sandbox = createSandbox()
})

afterAll(() => {
  rmSync(cwd, { recursive: true, force: true })
  sandbox.cleanup()
})

async function answer(input: HookInput): Promise<{ decision: string; reason: string | undefined }> {
  const output: unknown = await decide(input)
  const read = preToolUseDecision(output)
  if (read.decision !== 'allow') {
    const specific = (output as { hookSpecificOutput?: { hookEventName?: unknown } }).hookSpecificOutput
    expect(specific?.hookEventName).toBe('PreToolUse')
  }
  return read
}

async function expectDenied(input: HookInput, message: string): Promise<void> {
  expect(await answer(input)).toEqual({ decision: 'deny', reason: message })
}

async function expectAllowed(input: HookInput): Promise<void> {
  expect(await answer(input)).toEqual({ decision: 'allow', reason: undefined })
}

const GRAPHQL_MERGE = `gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: "PR_kwDOdemo"}) { clientMutationId } }'`
const GRAPHQL_AUTO_MERGE = `gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {pullRequestId: "PR_kwDOdemo", mergeMethod: SQUASH}) { clientMutationId } }'`

const C0_BASH = [
  'gh pr view 12 --json author,state',
  'gh pr create --draft --title "feat(001): add the hooks" --body "Adds the hooks."',
  'gh pr comment 12 --body "Waiting for Brad to approve and merge."',
  'gh pr checks 12',
  'gh pr edit 12 --body-file body.md',
  'gh api repos/memorex386/bradthome/pulls/12',
  'gh api repos/memorex386/bradthome/pulls/12/reviews',
  'gh pr review 12 --comment --body "One question on line 40."',
  'git push -u origin 001-hooks-and-agent-rules',
  'git merge main',
  'git commit -m "feat(001): add the guard"',
]

const C0_POWERSHELL = ['gh pr view 12 --json author,state', 'gh pr list --author "@me"', 'git merge main']

const C1_BASH = [
  'gh pr merge 12 --squash',
  'gh pr merge --auto 12',
  'gh pr merge 12 --merge --delete-branch',
  'GH_REPO=memorex386/bradthome gh pr merge 12',
  'gh pr merge https://github.com/memorex386/bradthome/pull/12 --squash',
  'git status && gh pr merge 12 --squash',
  'gh api -X PUT repos/memorex386/bradthome/pulls/12/merge',
  'gh api --method PUT /repos/memorex386/bradthome/pulls/12/merge -f merge_method=squash',
  GRAPHQL_MERGE,
  GRAPHQL_AUTO_MERGE,
  'gh api graphql -F query=@merge.graphql',
  'gh api graphql --field query=@automerge.graphql',
  'curl -X PUT -H "Accept: application/vnd.github+json" https://api.github.com/repos/memorex386/bradthome/pulls/12/merge',
]

const C1_POWERSHELL = [
  'gh pr merge 12 --squash',
  "$env:GH_REPO = 'memorex386/bradthome'; gh pr merge 12",
  'gh api -X PUT repos/memorex386/bradthome/pulls/12/merge',
  GRAPHQL_MERGE,
  'Invoke-RestMethod -Method Put -Uri https://api.github.com/repos/memorex386/bradthome/pulls/12/merge',
]

const C2_BASH = [
  'gh pr review 12 --approve',
  'gh pr review 12 -a',
  'gh pr review --approve 12 --body "Looks right."',
  'gh pr review 12 -a -b "Looks right."',
  'gh api repos/memorex386/bradthome/pulls/12/reviews -f event=APPROVE',
  'gh api -X POST /repos/memorex386/bradthome/pulls/12/reviews -f body=ok -f event=APPROVE',
  `gh api graphql -f query='mutation { addPullRequestReview(input: {pullRequestId: "PR_kwDOdemo", event: APPROVE}) { clientMutationId } }'`,
  `gh api graphql -f query='mutation { submitPullRequestReview(input: {pullRequestReviewId: "PRR_kwDOdemo", event: APPROVE}) { clientMutationId } }'`,
]

const C2_POWERSHELL = ['gh pr review 12 --approve', 'gh pr review 12 -a']

const C3_BASH = [
  'git commit --no-verify -m "feat(001): wip"',
  'git commit -n -m "feat(001): wip"',
  'git commit -nm "feat(001): wip"',
  'git commit -anm "feat(001): wip"',
  'git commit --amend --no-edit --no-verify',
  'HUSKY=0 git commit -m "feat(001): wip"',
  'git -c core.hooksPath=/dev/null commit -m "feat(001): wip"',
  'git config core.hooksPath .git/hooks',
  'git config --unset core.hooksPath',
  'git push --no-verify',
  'git push --no-verify origin 001-hooks-and-agent-rules',
  'rm -rf .husky/_',
  'rm -rf .husky',
  'mv .husky/_ .husky/off',
  'PRIVATE_TERMS= git commit -m "feat(001): wip"',
  'export PRIVATE_TERMS=nothing',
]

const C3_POWERSHELL = [
  'git commit --no-verify -m "feat(001): wip"',
  "$env:HUSKY = '0'; git commit -m 'feat(001): wip'",
  'Remove-Item -Recurse -Force .husky/_',
  "$env:PRIVATE_TERMS = ''",
]

const C3_LOOK_ALIKES = ['git log -n 5', 'git push -n', 'git log --oneline -n 10 main', 'git push --dry-run']

const C5_DENIED_URLS = [
  'https://github.com/memorex386/bradthome/pull/12',
  'https://github.com/memorex386/bradthome/pull/12/files',
  'https://github.com/memorex386/bradthome/pull/12#issuecomment-1',
  'https://github.com/memorex386/bradthome/pulls',
  'https://github.com/memorex386/bradthome/pulls?q=is%3Aopen',
  'https://github.com/memorex386/bradthome/compare/main...001-hooks-and-agent-rules',
  'https://github.com/memorex386/bradthome/settings',
  'https://github.com/memorex386/bradthome/settings/rules',
  'HTTPS://GITHUB.COM/MEMOREX386/BRADTHOME/PULL/12',
  'https://GitHub.com/Memorex386/BradThome/Settings',
  'github.com/memorex386/bradthome/pull/12',
  'https://www.github.com/memorex386/bradthome/pulls',
]

const C5_ALLOWED_URLS = [
  'https://github.com/memorex386/bradthome',
  'https://github.com/memorex386/bradthome/blob/main/README.md',
  'https://github.com/memorex386/bradthome/blob/main/docs/pull-requests.md',
  'https://github.com/memorex386/bradthome/blob/main/docs/settings.md',
  'https://github.com/memorex386/bradthome/tree/001-hooks-and-agent-rules/specs',
  'https://github.com/memorex386/bradthome2/pull/1',
  'https://github.com/github/spec-kit/pulls',
  'https://bradthome.com/',
]

function navigate(url: string): HookInput {
  return toolCall('mcp__Claude_Browser__navigate', { url }, cwd)
}

describe('C0: normal gh and git use', () => {
  for (const command of C0_BASH) {
    test(`C0 S2.8 FR-017 allows ${command}`, async () => {
      await expectAllowed(bash(command, cwd))
    })
  }

  for (const command of C0_POWERSHELL) {
    test(`C0 S2.8 FR-017 allows, in PowerShell, ${command}`, async () => {
      await expectAllowed(powershell(command, cwd))
    })
  }

  test('C0 S2.8 leaves tools that change nothing alone', async () => {
    await expectAllowed(toolCall('Read', { file_path: path.join(cwd, 'merge.graphql') }, cwd))
    await expectAllowed(toolCall('Grep', { pattern: 'merge', path: cwd }, cwd))
  })
})

describe('C1: merging is denied', () => {
  for (const command of C1_BASH) {
    test(`C1 S2.4 FR-017 denies ${command}`, async () => {
      await expectDenied(bash(command, cwd), C.merge)
    })
  }

  for (const command of C1_POWERSHELL) {
    test(`C1 S2.4 FR-017 denies, in PowerShell, ${command}`, async () => {
      await expectDenied(powershell(command, cwd), C.merge)
    })
  }

  test("C1 S2.4 FR-017 denies the desktop app's auto-merge tool", async () => {
    await expectDenied(toolCall('mcp__ccd_pr__set_auto_merge', { enabled: true }, cwd), C.merge)
  })
})

describe('C2: approving is denied', () => {
  for (const command of C2_BASH) {
    test(`C2 S2.5 FR-017 denies ${command}`, async () => {
      await expectDenied(bash(command, cwd), C.approve)
    })
  }

  for (const command of C2_POWERSHELL) {
    test(`C2 S2.5 FR-017 denies, in PowerShell, ${command}`, async () => {
      await expectDenied(powershell(command, cwd), C.approve)
    })
  }
})

describe('C3: skipping the hooks is denied', () => {
  for (const command of C3_BASH) {
    test(`C3 S2.6 FR-017 denies ${command}`, async () => {
      await expectDenied(bash(command, cwd), C.skipHooks)
    })
  }

  for (const command of C3_POWERSHELL) {
    test(`C3 S2.6 FR-017 denies, in PowerShell, ${command}`, async () => {
      await expectDenied(powershell(command, cwd), C.skipHooks)
    })
  }

  for (const command of C3_LOOK_ALIKES) {
    test(`C3 S2.6 FR-017 allows the look-alike ${command}`, async () => {
      await expectAllowed(bash(command, cwd))
    })
  }
})

describe("C5: the browser stays off the repo's pull request and settings pages", () => {
  for (const url of C5_DENIED_URLS) {
    test(`C5 S2.9 FR-019 denies navigating to ${url}`, async () => {
      await expectDenied(navigate(url), C.browser)
    })
  }

  for (const url of C5_ALLOWED_URLS) {
    test(`C5 S2.9 FR-019 allows navigating to ${url}`, async () => {
      await expectAllowed(navigate(url))
    })
  }

  test('C5 S2.9 FR-019 denies the pages inside a browser batch', async () => {
    const batch = toolCall(
      'mcp__Claude_Browser__browser_batch',
      {
        actions: [
          { name: 'computer', input: { action: 'screenshot' } },
          { name: 'navigate', input: { url: 'https://github.com/memorex386/bradthome/pulls' } },
        ],
      },
      cwd,
    )
    await expectDenied(batch, C.browser)
  })

  test('C5 S2.9 FR-019 denies the pages through preview_start', async () => {
    await expectDenied(
      toolCall('mcp__Claude_Browser__preview_start', { url: 'https://github.com/memorex386/bradthome/settings' }, cwd),
      C.browser,
    )
  })

  test('C5 S2.9 FR-019 denies the pages in Claude in Chrome', async () => {
    await expectDenied(
      toolCall('mcp__claude-in-chrome__navigate', { url: 'https://github.com/memorex386/bradthome/pull/12', tabId: 1 }, cwd),
      C.browser,
    )
    await expectDenied(
      toolCall(
        'mcp__claude-in-chrome__browser_batch',
        { actions: [{ name: 'navigate', input: { url: 'https://github.com/memorex386/bradthome/compare/main...x' } }] },
        cwd,
      ),
      C.browser,
    )
  })

  test('C5 S2.9 FR-019 allows a browser batch that stays on allowed pages', async () => {
    await expectAllowed(
      toolCall(
        'mcp__Claude_Browser__browser_batch',
        { actions: [{ name: 'navigate', input: { url: 'https://github.com/memorex386/bradthome/blob/main/README.md' } }] },
        cwd,
      ),
    )
  })
})

describe('the hook protocol', () => {
  test('C1 S2.4 FR-017 answers Claude Code with a deny on stdout, as a process', () => {
    const result = runHook(SCRIPTS.guard, bash('gh pr merge 12 --squash', cwd), sandbox.env)
    expect(processDecision(result)).toEqual({ decision: 'deny', reason: C.merge })
  })

  test('C0 S2.8 FR-017 prints nothing and exits 0 for a call it allows', () => {
    const result = runHook(SCRIPTS.guard, bash('gh pr view 12 --json author,state', cwd), sandbox.env)
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('')
  })

  test("S2.4 S2.5 S2.6 S2.9 FR-017 FR-019 fails closed for a shell, PowerShell or browser call it can't read", () => {
    for (const input of [
      toolCall('Bash', {}, cwd),
      toolCall('PowerShell', { command: 42 }, cwd),
      '{"tool_name": "Bash", "tool_input": {"command": "gh pr merge 12"',
      '{"tool_name": "mcp__Claude_Browser__navigate", "tool_input": {"url": "https://github.com/memorex386/',
    ]) {
      expect(processDecision(runHook(SCRIPTS.guard, input, sandbox.env)).decision).toBe('deny')
    }
  })
})
