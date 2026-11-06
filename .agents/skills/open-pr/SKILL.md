---
name: open-pr
description: Open or update a pull request from the agent's GitHub account, using the repo's template, with the checks and evidence Gate 3 needs, or, while the agent's account is suspended, push the change straight to main after Brad says push. Use when a slice or a light or trivial change is ready to push, and to keep a pull request's description current.
---

# Open the pull request

Every change reaches main through a pull request that Brad squash-merges (Gate 3). See [AGENTS.md](../../../AGENTS.md) for the Git and GitHub rules.

**For now, no pull request.** While the agent's account is suspended, work runs as Brad's account and changes go straight to main ([D160](../../../docs/decisions/0160-work-runs-under-brads-account-while-the-agents-is-suspended.md), [D161](../../../docs/decisions/0161-changes-go-straight-to-main.md)). Do "Before you push" below, with the full suite and the e2e suite in the pinned container. Then show Brad what changed, how each scenario was checked, the hand-run checks, the review's findings and the decisions, as a pull request would, and wait. When Brad says push, run `git push origin HEAD:main`, watch main's CI run to the end, and fix a red main forward at once. Skip "Open it" and "After it's open" unless a pull request is still opened.

## Before you push

1. **Check the branch.** Full track: `NNN-short-name`. Light and trivial: `slice/N.N-short-name`, or `fix/short-name` outside a slice. Never commit on main.
2. **Run the checks.** `pnpm typecheck`, `pnpm test`, `pnpm trace specs/NNN-name` and `pnpm lock specs/NNN-name --check` for each spec with locked tests, and `pnpm setup:check`.
3. **Run the hand-run checks** that AGENTS.md lists, until slice 1.4's CI runs them. Scan the changed files with `pnpm terms --files …`, which prints only files and lines.
4. **Let the hooks run.** Never skip them. pre-push checks every commit again before it leaves.

## Open it

1. Push the branch as the agent, then open the pull request from the agent's account with gh, as a draft until the review is handled. gh in Claude Code here acts as the working login by default: the agent's, or Brad's while the agent's is suspended. Never switch logins.
2. Fill [.github/pull_request_template.md](../../../.github/pull_request_template.md):
   - what changed and why, and the track
   - the spec or issue it implements, linked
   - how each scenario was checked, by its ID
   - the hand-run checks and their results
   - the review's findings, each fixed or answered
   - the decisions it makes: new records, and tier-3 details
   - a preview and screenshots for anything visible
3. Edit the live description, never a stale copy, since a checkbox may have changed on GitHub.

## After it's open

- Answer each comment in the pull request.
- Mark it ready for Gate 3 only when everything in "Done means" in AGENTS.md holds.
- Agents never merge, approve or force-push. Brad merges.

## Privacy

The description is public once the repo is: no private term, personal detail or machine path. Paraphrase Brad, and call Brad "Brad".
