---
name: open-pr
description: Open or update a pull request from the agent's GitHub account, using the repo's template, with the checks and evidence Gate 3 needs. Use when a slice or a light or trivial change is ready to push, and to keep its description current.
---

# Open the pull request

Every change reaches main through a pull request that Brad squash-merges (Gate 3). See [AGENTS.md](../../../AGENTS.md) for the Git and GitHub rules.

## Before you push

1. **Check the branch.** Full track: `NNN-short-name`. Light and trivial: `slice/N.N-short-name`, or `fix/short-name` outside a slice. Never main.
2. **Run the checks.** `pnpm typecheck`, `pnpm test`, `pnpm trace specs/NNN-name` and `pnpm lock specs/NNN-name --check` for each spec with locked tests, and `pnpm setup:check`.
3. **Run the hand-run checks** that AGENTS.md lists, until slice 1.4's CI runs them. Scan the changed files with `pnpm terms --files …`, which prints only files and lines.
4. **Let the hooks run.** Never skip them. pre-push checks every commit again before it leaves.

## Open it

1. Push the branch as the agent, then open the pull request from the agent's account with gh, as a draft until the review is handled. gh in Claude Code here acts as the agent by default. Never switch to Brad's login.
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
