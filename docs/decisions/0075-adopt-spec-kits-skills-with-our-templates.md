---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D75
---

# Adopt Spec Kit's skills, with our templates

## Context and problem statement

Specs follow Spec Kit's format ([D20](0020-acceptance-criteria-in-spec-kits-format.md)), but they've been written by hand. Spec Kit 1.2.5 now ships its commands as Agent Skills for Claude Code and Codex, including specify, clarify, plan, tasks, analyze, implement, and converge, which checks the code against the spec until nothing is missing. A project's own templates take priority over Spec Kit's. The plan was to compare the loop's skills with public libraries before writing any, and this decision came out of that comparison. Do we adopt Spec Kit's skills?

## Decision drivers

- Use the industry standard by default ([D50](0050-industry-standard-by-default.md)).
- Keep this repo's scenario IDs, such as S1.1, and the plan's alternatives and risks.
- Keep `docs/templates` as the one source for templates ([D27](0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Adopt them, with our templates as overrides (recommended)
2. Write our own spec, plan and build skills
3. Decide after slice 1.4

## Decision outcome

Chosen option: "Adopt them, with our templates as overrides", because Spec Kit is the standard tool for the format the repo already uses, and its overrides keep our templates.

- Spec Kit's skills run the spec, plan, tasks and build stages, for Claude Code and Codex.
- `docs/templates/spec.md` and `plan.md` stay the source. A sync copies them into Spec Kit's override folder, with the same drift check as the skills.
- Spec 001 is written by hand, and Spec Kit takes over from slice 1.4.

### Consequences

- Good, because the commands are standard, and contributors may already know them.
- Good, because Codex gets the same stages as Claude Code.
- Bad, because its installer brings a Python tool into a Node repo, and each Spec Kit update has to be checked against the overrides.
- Neutral, because Spec Kit's clarify asks its questions in chat, so the repo's interview skill sends tier-1 questions to decision pages instead ([D28](0028-every-decision-goes-on-a-decision-page.md)).

### Confirmation

Spec 001's scenarios S7.3 and S7.4.

## Pros and cons of the options

### Adopt them, with our templates as overrides

- Good, because it follows the industry standard.
- Bad, because it adds a tool and a folder, `.specify/`.

### Write our own spec, plan and build skills

- Good, because there's no extra tool.
- Bad, because it duplicates what Spec Kit already does, which [D50](0050-industry-standard-by-default.md) asks a strong reason for.

### Decide after slice 1.4

- Good, because it keeps slice 1.3 smaller.
- Bad, because slice 1.4 is written by hand, and the skills built in slice 1.3 might have to change.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q4).
- Evidence: [GitHub Spec Kit](https://github.com/github/spec-kit), MIT, version 1.2.5 released 2026-10-28, and its customization guide on project overrides, read 2026-10-30.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), Story 7.
