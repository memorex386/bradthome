# Working agreement

This is how Brad and the coding agents take each piece of work on bradthome.com from idea to merged code. Brad approved it on 2026-10-30 (decision [D26](decisions/0026-approve-the-working-agreement.md)). It's built from decisions [D17](decisions/0017-use-anthropics-claude-code-loop-as-the-backbone.md)–[D25](decisions/0025-the-working-agreements-conventions-batch.md), and it changes only through a logged decision. It moved into this repo in slice 1.2, and AGENTS.md summarizes it.

**In one line:** Anthropic's recommended Claude Code loop, with GitHub Spec Kit's acceptance-criteria format and GitHub Flow, and every hard rule enforced by a machine.

## Why it's shaped this way

- **One loop.** Every major vendor describes the same loop:
  1. Plan or specify first, and get a person's approval.
  2. Build in small pieces.
  3. Prove the work with checks that pass or fail.
  4. Review it in a fresh context.
  5. Have a person approve anything that can't be undone.

  Anthropic's version is the backbone. OpenAI's Codex guidance and GitHub's describe the same steps, so any agent can follow this file.
- **A defined spec format.** Anthropic's loop leaves the spec's format open, so specs use Spec Kit's format and every requirement is traced to a test.
- **Machines enforce the hard rules.** Instructions only advise, so the rules that can't have exceptions live in hooks and CI.

## Roles

- **Brad** sets direction, answers tier-1 questions, and approves specs, plans and merges.
- **The builder agent** (Claude Code):
  - interviews Brad
  - drafts mocks, specs, plans and tests, and writes the code
  - recommends and ranks every option
  - says so when a step is about to be skipped
- **The reviewer agent** is a subagent that starts with fresh context. It checks the work against the spec and advises. It never approves.
- **Hooks and CI** enforce the hard rules for everyone, agents and Brad alike.

## Tracks

| Track | For | What runs |
| --- | --- | --- |
| Full | A new feature or slice | Every stage and all three gates, plus mocks and flows for anything visible |
| Light | A small change with clear criteria | A short spec in the issue (Brad approves it), then tests, build, review, pull request and merge |
| Trivial | Copy, typos, docs | Build, checks, pull request and merge |

The builder proposes a track when it opens the work, and Brad confirms it. When it's unclear, use the bigger track.

## The full-track loop

Before the first slice, the constitution is written once: the project's purpose, scope, non-goals and principles. Brad approves it.

1. **Interview.** The builder asks questions until it could write the spec. Each question comes with context, ranked options and a recommendation. Questions go on a decision page, and Brad answers them there ([D28](decisions/0028-every-decision-goes-on-a-decision-page.md)).
   - Tier-1 questions go to Brad one at a time.
   - Tier-2 questions come in a batch.
   - Tier-3 choices are made and noted.
2. **Show it.** For anything a person sees, and for any flow with more than one step, the builder makes navigable mocks, flows, graphs and visuals in a canvas or artifact. They cover every meaningful state.
3. **Specify.** Write `specs/NNN-name/spec.md` in the acceptance-criteria format below. Open questions stay marked `[NEEDS CLARIFICATION]` until they're answered.
   - **Gate 1:** Brad approves the spec, with its scenarios and mocks.
4. **Plan.** In a fresh session, in plan mode, write `specs/NNN-name/plan.md`: the approach, the alternatives considered, the risks and the task list. Significant choices become decision records.
   - **Gate 2:** Brad approves the plan.
5. **Tests, then lock.** Write the acceptance tests from the scenarios before any code, each named with its ID. The traceability check and the reviewer confirm every ID is covered. Then the tests are locked.
6. **Build.** In a fresh session, on the slice's branch, build until every check passes.
7. **Review.** A reviewer subagent with fresh context compares the diff with the spec:
   - Every requirement is implemented.
   - Every edge case is tested.
   - Correctness counts more than style.

   Each finding is either fixed or answered in the pull request.
8. **Pull request.** It links the spec, the plan, the test results, the review notes and a preview deploy, with screenshots of anything visible.
   - **Gate 3:** Brad merges with a squash merge. Agents never merge. A deny rule stops agents from merging, and the required checks apply to admins too ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
9. **Learn.** When the same mistake happens twice, update AGENTS.md or a skill.

## Acceptance criteria

Every spec has:

- **User stories**, each with a priority (P1, P2, P3) and a way to test it on its own.
- **Acceptance scenarios** written as Given/When/Then and numbered under their story: `S1.1`, `S1.2`.
- **Functional requirements** `FR-001` onward, each a MUST statement.
- **Success criteria** `SC-001` onward, each measurable.
- **Edge cases**, plus a `[NEEDS CLARIFICATION: …]` marker for anything still open.

Every scenario, FR and SC ID appears in at least one test's name, and a CI check fails when one doesn't.

## Tests and determinism

- **What's controlled:** the constitution, specs, scenarios, mocks, plans, locked tests and decisions. Each one changes only through an explicit edit Brad approves, never silently during a build.
- **Locked tests:** once a test is locked, it can change only alongside a spec change in the same pull request. A hook and a CI check enforce this. Brad's approval of that pull request covers the change.
- **Deterministic checks** give the same code the same verdict every time:
  - type checks and lint
  - unit and end-to-end tests
  - accessibility checks
  - visual snapshots, with a fixed clock, animations off, and a pinned browser and fonts
  - performance budgets
  - the secret scan
  - the traceability check
- **Checks that can't be deterministic,** like the reviewer agent and, later, the chat's evals, use frozen cases, a pinned model and pass rates over several runs. They're never the only gate.
- **Mutation testing** is measured and reported in pull requests. It becomes a gate only once there's a baseline.
- There's no strict test-first rule for every function.

## Hard rules and where they're enforced

| Rule | Git hook | Claude Code hook | CI and branch protection |
| --- | --- | --- | --- |
| No commits to main | Yes | Yes | Yes |
| A spec or issue number on every commit | Yes | — | Yes |
| Locked tests stay locked | Yes | Yes | Yes |
| No secrets or private terms | Yes | — | Yes |
| Every requirement ID has a test | — | — | Yes |
| Fast checks pass before an agent reports done | — | Yes | — |

The tools are husky with commitlint for the git hooks, gitleaks and a private-term script for secrets and private terms, Claude Code hooks and deny rules for the agent, and required CI checks with a ruleset on main ([D45](decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D47](decisions/0047-the-repo-and-tooling-batch.md), [D54](decisions/0054-husky-gitleaks-and-two-license-files.md), [D55](decisions/0055-split-the-required-checks-by-determinism.md)). Slices 1.3 and 1.4 build them.

The list of private terms never enters the public repo. The check reads it from Brad's private notes on his PC and from a CI secret ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Decisions

- **Tier 1, Brad's:** scope, principles, architecture, anything public, money and privacy. Each is asked one at a time with context, ranked options and a recommendation. Every decision, big or small, goes on a decision page. Brad answers it there, and the answer is saved ([D28](decisions/0028-every-decision-goes-on-a-decision-page.md)).
- **Tier 2, conventions:** approved in a batch. Any of them can be pulled up to tier 1.
- **Tier 3, details inside an approved spec:** the builder decides, and the pull request notes them.
- **Records:** each tier-1 decision becomes a MADR 4.0 record in `docs/decisions/`. `docs/decisions/README.md` indexes them.

## Conventions

- **GitHub Flow:** one short-lived branch per slice, a pull request, and a squash merge into a protected main branch.
- **Conventional Commits**, with the spec number as the scope, for example `feat(003): add role links`.
- **Signed commits,** so GitHub marks them Verified. The agent signs with its own account's key, and Brad's own commits use brad@bradthome.com ([D16](decisions/0016-brads-own-commits-use-brad-bradthome-com.md), [D43](decisions/0043-a-separate-github-account-for-the-agent.md)).
- **A fresh agent session for each stage:** spec, plan, build and review.
- **Short instruction files:** AGENTS.md stays at about 100 to 150 lines that point into `docs/`. CLAUDE.md only imports it.
- **Specs beside the code**, in Spec Kit's `specs/NNN-name/` layout. Each spec's locked tests are listed with their hashes in `tests.lock` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **IDs:** scenarios `S1.1`, requirements `FR-001`, success criteria `SC-001`, tasks `T001` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Templates** live in `docs/templates/`. The pull request and light-change issue templates live in `.github/` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Decision records** are named `docs/decisions/NNNN-short-title.md`. The decision log is that folder's README ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Issue references:** light and trivial changes add a `Refs: #N` line naming their issue ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Correctness reviews:** the reviewer checks correctness against the spec and skips style.

## Done means

- The spec was approved, with its scenarios and mocks.
- Every scenario, FR and SC has a passing test.
- Every required check passes.
- The reviewer's findings are fixed or answered.
- The pull request has a preview, and screenshots of anything visible.
- Brad merged it.
- The decision log and docs are up to date.

## Pushback

When a request skips a stage, a gate or a rule, the builder says so, gives the reason and offers the better path. That includes requests from Brad. Brad can override, and the override is logged as a decision.

## Not covered here

The architecture, hosting, quality tooling, content pipeline and chat have their own decision records ([D37](decisions/0037-astro-react-and-a-separate-hono-api.md)–[D57](decisions/0057-six-layers-of-cost-stops.md)).

## Changes since approval

- **2026-10-30, [D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md):**
  - The private-term list never enters the public repo.
  - New conventions for templates, IDs, decision records, issue references and locked tests.
  - How Gate 3 is enforced is now spelled out.
- **2026-10-30, [D28](decisions/0028-every-decision-goes-on-a-decision-page.md):** every decision goes on a decision page. Chat question cards are no longer used for decisions.
- **2026-10-30, [D43](decisions/0043-a-separate-github-account-for-the-agent.md):** the agent commits from its own GitHub account and signs with its own key. Brad's own commits use brad@bradthome.com ([D16](decisions/0016-brads-own-commits-use-brad-bradthome-com.md)).
- **2026-10-30, [D45](decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D47](decisions/0047-the-repo-and-tooling-batch.md), [D54](decisions/0054-husky-gitleaks-and-two-license-files.md) and [D55](decisions/0055-split-the-required-checks-by-determinism.md):** the hard rules' tools are named.
- **2026-10-30:** the agreement moved into this repo in slice 1.2. Decision numbers now link to their records, and the Records line points to the index in `docs/decisions/README.md`.
- **2026-10-30, [D71](decisions/0071-the-conventions-batch-for-mocks-spec-numbers-and-templates.md):** a spec commits its mocks' screenshots and links Brad's approval on GitHub. Full-track specs and their branches use Spec Kit's `NNN-short-name` numbering.

## Sources

- Anthropic, Claude Code best practices: https://code.claude.com/docs/en/best-practices
- GitHub Spec Kit, spec template: https://raw.githubusercontent.com/github/spec-kit/main/templates/spec-template.md
- OpenAI, Codex best practices: https://learn.chatgpt.com/guides/best-practices
- GitHub Flow: https://docs.github.com/en/get-started/using-github/github-flow
- MADR 4.0: https://adr.github.io/madr/
- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- Birgitta Böckeler, TDD in the agent loop: https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html
- Thoughtworks Technology Radar, feedback sensors for coding agents: https://www.thoughtworks.com/radar/techniques/feedback-sensors-for-coding-agents
