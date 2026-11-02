---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the reviewer agent
informed: []
tier: 1
log-id: D87
---

# CI jobs that print pull request text hide private terms

## Context and problem statement

Slice 1.4's review found that four CI jobs print text that comes from the pull request: the commits job prints a failing commit's subject or the title, and the secrets, hygiene and lock jobs print file paths. Only the privacy job had the private-term list, as a locked test required ([FR-008](../../specs/002-ci-and-rulesets/spec.md)), so a term in a failing subject or in a path would show in that job's log. Those logs go public with the repo in slice 1.5. The hooks on Brad's PC already hide these places. How should CI keep a term out of these four logs?

## Decision drivers

- No CI log may hold a private term (SC-003), and the logs will be public.
- The messages should still say where to fix, as the mocks show.
- The list stays a repo secret that no step prints, writes or uploads (FR-008).

## Considered options

The options are listed in the reviewer's session's ranked order.

1. Give those four steps the list, and hide places that hold a term (recommended)
2. Keep it as is, and clean up the logs when it happens
3. Print places without their text

## Decision outcome

Chosen option: "Give those four steps the list, and hide places that hold a term", the recommended option. Brad added no note.

- The commits, secrets and hygiene steps in `ci.yml`, and the lock step in `locked-tests.yml`, get `PRIVATE_TERMS` as an environment variable, as the privacy step does.
- Each prints through the output gate the hooks use, so a line that holds a term reads as hidden.
- Only the privacy job fails without the list (K6). Without it, the other four have nothing to hide by, and the privacy job fails the run.

### Consequences

- Good, because CI hides the same places the hooks hide, before the logs go public.
- Good, because the messages keep their shape, and still name every place that holds no term.
- Bad, because five steps hold the secret instead of one. Each runs only code from main or the pull request's own checks, as the privacy step does, and none prints it.

### Confirmation

- `tests/002/static/workflows.test.ts` checks that the privacy, commits, secrets and hygiene steps, and the lock step, get the list as an environment variable, and that no step prints, writes or uploads it.
- `tests/002/integration/hidden-places.test.ts` runs each of the four jobs on a pull request with a made-up term in a subject, the title or a path, and checks the line is hidden and no term shows.

## More information

- Decided by: Brad Thome, on slice 1.4's review decision page, question Q7, on 2026-11-02.
- Changes spec 002's FR-008, which named the privacy step as the list's only holder.
