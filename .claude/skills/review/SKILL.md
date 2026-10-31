---
name: review
description: Review a slice's change against its spec with the pinned reviewer subagent, in a fresh context, the loop's stage 7. Use after the build and before the pull request goes to Gate 3. The reviewer advises and never approves.
---

# Review

Stage 7 of the full track in [docs/working-agreement.md](../../../docs/working-agreement.md): a reviewer with fresh context compares the change with the spec, correctness before style. Adapted from Matt Pocock's code-review skill and Superpowers' code reviewer; see [LICENSE](LICENSE).

## Start the reviewer

1. **Pin the range.** The change is `git diff main...HEAD`, three dots so it's compared with where the branch left main. Check that it isn't empty.
2. **Find the spec.** It's the branch's `specs/NNN-name/spec.md`, with its mocks and plan beside it. For a light change, it's the issue.
3. **Start the `reviewer` subagent by name**, with no context from your session. Never choose a model for it: its definition in `.claude/agents/reviewer.md` pins one, and a model passed when it starts would override the pin ([D74](../../../docs/decisions/0074-pin-the-reviewer-and-measure-it-on-frozen-cases.md)).
4. **Send it the message below**, with `{spec}` set to the spec's path and `{change}` to how it can read the change.

## The message

```text
Review {change} against the spec in {spec}, with the mocks in the mocks/ folder beside it and the plan beside it if there is one. Read the spec, the mocks, the change and each changed file in full before you report.

Report correctness, not style: a requirement that isn't met, a scenario that would fail, a check that fails open, a private detail that could be printed or committed, or an edge case the spec covers that the change gets wrong.

Under a "## Findings" heading, give one top-level list item per finding, in this form:

- path/to/file.ts:LINE S1.2 What is wrong, and what the scenario requires instead.

Each finding names one file as the change writes its path, one line in it, and the scenario it breaks first, then any FR or SC IDs it also breaks. Use no other top-level list items. If there are no findings, write "No findings." under the heading.

End with this line, exactly: This review is advisory.
```

When a person asks for the review, `{change}` is "the diff from git diff main...HEAD", and the reviewer reads the changed files in the checkout.

## Act on the findings

- Fix each finding, or answer it in the pull request's Review section with the reason.
- The reviewer advises. Only Brad approves and merges (Gate 3).
- List every change to a spec's locked tests or `tests.lock` since the lock commit, and Brad's approval for each.

## When the reviewer changes

When `.claude/agents/reviewer.md` or its model changes, measure it again before it reviews anything:

1. Run `pnpm review:eval`. It runs each of the five frozen cases in `tests/001/frozen-cases/` three times, on Brad's Claude plan, one run at a time. It takes about 15 to 45 minutes.
2. The target is the planted bug found in at least 12 of 15 runs, and in at least 2 of 3 for every case (SC-004). A run found it when a finding names the case's file and its scenario.
3. It writes `specs/001-hooks-and-agent-rules/evidence/review-eval.json`. Commit it with the change, and put the report in the pull request.

`pnpm review:eval --case F1 --runs 1` tries one case, for tuning. It doesn't write the evidence.
