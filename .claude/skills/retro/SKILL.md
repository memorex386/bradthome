---
name: retro
description: Run a retrospective on a session or a slice, and propose changes to the agents' environment so a mistake doesn't happen twice, the loop's last stage. Use when Brad asks for a retro, or when the same mistake has happened twice.
---

# Retro

Stage 9 of the full track in [docs/working-agreement.md](../../../docs/working-agreement.md): when the same mistake happens twice, change AGENTS.md or a skill. Adapted from Matt Pocock's retro skill; see [LICENSE](LICENSE).

## Read what happened

Read the primary sources: the session, the pull request with its comments and review, the commits, and the hooks' and checks' output. If Brad names no session, use the current one. Don't work from memory.

## Look for changes in these areas

- **Checks.** Could a deterministic check have caught the mistake: a test, a git hook, a guard rule or, from slice 1.4, a CI job? Read the existing checks first, since one that exists but isn't wired up is the finding. A fixed pattern always gets a check, never a written rule.
- **The reviewer.** Did the reviewer miss something it should catch? A mechanical rule becomes a check. A judgement call becomes a line in the reviewer's definition, and then a new frozen case and `pnpm review:eval`.
- **Finding things.** Did the agent take long to find a file or a fact? A one-line pointer in AGENTS.md, or in the doc that should have held it, helps.
- **Instructions that do nothing.** Lines in AGENTS.md or a skill that didn't change what an agent did. Remove them, since AGENTS.md stays short.
- **Expensive steps.** Tool calls or runs that cost far more than they needed to.
- **Missing information.** Something the agent couldn't see that would have changed what it did.

## Report

List the candidates, worst first. For each, say what happened, what to change, and which track the change takes. A change to a rule, a check or a skill goes through the loop like any other change, and a change to the working agreement is a tier-1 decision for Brad.

Never put a private term, personal detail or machine path in the report.
