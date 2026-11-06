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
| Full | A new feature or slice | Every stage and both gates, in one session, plus mocks for anything visible |
| Light | A small change with clear criteria | A short spec in the issue (Brad approves it), then tests, build, review, pull request and merge |
| Trivial | Copy, typos, docs | Build, checks, pull request and merge |

The builder proposes a track when it opens the work, and Brad confirms it. When it's unclear, use the bigger track.

## The full-track loop

Before the first slice, the constitution is written once: the project's purpose, scope, non-goals and principles. Brad approves it.

A slice runs in one session, from interview to pull request, with two gates ([D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). The reviewer is still a subagent with fresh context.

**While the agent's account is suspended,** work runs under Brad's account, memorex386 ([D160](decisions/0160-work-runs-under-brads-account-while-the-agents-is-suspended.md)), and changes go straight to main with no pull request ([D161](decisions/0161-changes-go-straight-to-main.md)). Step 7 becomes: when every check passes locally, the full suite included, the session shows Brad the change and waits. Brad's "push" in the session is Gate 2, and the session then pushes its branch to main with `git push origin HEAD:main`. Main's CI runs on each push, and a red main is fixed forward at once. This reverses when the agent's account is restored.

1. **Interview.** The builder asks only what it can't settle itself, each question with context, ranked options and a recommendation, as a choice card in the session. Tier-3 choices are made and noted.
2. **Show it.** For anything a person sees, and for any flow with more than one step, the builder makes mocks of every meaningful state. A slice with nothing visible skips this.
3. **Spec and plan.** Write `specs/NNN-name/spec.md` in the acceptance-criteria format below, and `plan.md` beside it: the approach, the alternatives, the risks and the tasks.
   - **Gate 1:** Brad approves the spec and plan together, with the mocks.
4. **Tests.** Write the acceptance tests from the scenarios before the code, each named with its ID. The traceability check confirms every ID is covered. New specs aren't locked.
5. **Build** until every check passes.
6. **Review.** A reviewer subagent with fresh context compares the diff with the spec, correctness before style, and flags any test the build weakened. Each finding is fixed or answered in the pull request.
7. **Pull request.** Opened as a draft, so CI runs the quick jobs, and marked ready when the work is done, which runs the full suite (D100). It links the spec, the review notes and a preview deploy, with screenshots of anything visible.
   - **Gate 2:** Brad merges with a squash merge, or, while the agent's account is suspended, says push (D161). Agents never merge. A deny rule stops agents from merging, and the required checks apply to admins too ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
8. **Learn.** When the same mistake happens twice, update AGENTS.md or a skill.

A slice that adds or changes a CI check also proves it with planted failures in the sandbox, which is public and holds made-up terms only ([D117](decisions/0117-the-ci-sandbox-is-public.md)), and records the runs. Other slices rely on their tests and the pull request's own CI and preview ([D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Acceptance criteria

Every spec has:

- **User stories**, each with a priority (P1, P2, P3) and a way to test it on its own.
- **Acceptance scenarios** written as Given/When/Then and numbered under their story: `S1.1`, `S1.2`.
- **Functional requirements** `FR-001` onward, each a MUST statement.
- **Success criteria** `SC-001` onward, each measurable.
- **Edge cases**, plus a `[NEEDS CLARIFICATION: …]` marker for anything still open.

Every scenario, FR and SC ID appears in at least one test's name, and a CI check fails when one doesn't.

## Tests and determinism

- **What's controlled:** the constitution, specs, scenarios, mocks, plans, tests and decisions. Each one changes only through an explicit edit Brad approves, never silently during a build.
- **Locked tests:** specs 001 to 003 keep their `tests.lock`, and a locked test there changes only alongside a spec change in the same pull request. A hook and a CI check enforce this. Later specs aren't locked: the reviewer flags any test the build weakened ([D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).
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
| Locked tests stay locked, for specs 001 to 003 | Yes | Yes | Yes |
| No secrets or private terms | Yes | — | Yes |
| Every requirement ID has a test | — | — | Yes |
| Fast checks pass before an agent reports done | — | Yes | — |

The tools are husky with commitlint for the git hooks, gitleaks and a private-term script for secrets and private terms, Claude Code hooks and deny rules for the agent, and required CI checks with a ruleset on main ([D45](decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D47](decisions/0047-the-repo-and-tooling-batch.md), [D54](decisions/0054-husky-gitleaks-and-two-license-files.md), [D55](decisions/0055-split-the-required-checks-by-determinism.md)). Slices 1.3 and 1.4 build them.

The list of private terms never enters the public repo. The check reads it from Brad's private notes on his PC and from a CI secret ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Decisions

- **Tier 1, Brad's:** scope, principles, architecture, anything public, money and privacy. Each is asked with context, ranked options and a recommendation, as a choice card in the session, and Brad answers there ([D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md), replacing [D28](decisions/0028-every-decision-goes-on-a-decision-page.md)'s decision pages).
- **Tier 2, conventions:** approved in a batch. Any of them can be pulled up to tier 1.
- **Tier 3, details inside an approved spec:** the builder decides, and the pull request notes them.
- **Records:** each tier-1 decision becomes a MADR 4.0 record in `docs/decisions/`. `docs/decisions/README.md` indexes them.

## Conventions

- **GitHub Flow:** one short-lived branch per slice, a pull request, and a squash merge into a protected main branch. While the agent's account is suspended, the branch is pushed straight to main after Brad says push, and the ruleset lets the admin role bypass (D161).
- **Conventional Commits**, with the spec number as the scope, for example `feat(003): add role links`.
- **Signed commits,** so GitHub marks them Verified. The agent signs with its own account's key, or Brad's key while its account is suspended (D160), and Brad's own commits use brad@bradthome.com ([D16](decisions/0016-brads-own-commits-use-brad-bradthome-com.md), [D43](decisions/0043-a-separate-github-account-for-the-agent.md)).
- **One session per slice,** with a fresh-context reviewer subagent ([D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).
- **Short instruction files:** AGENTS.md stays at about 100 to 150 lines that point into `docs/`. CLAUDE.md only imports it.
- **Specs beside the code**, in Spec Kit's `specs/NNN-name/` layout. Specs 001 to 003 list their locked tests with their hashes in `tests.lock` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md), [D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).
- **IDs:** scenarios `S1.1`, requirements `FR-001`, success criteria `SC-001`, tasks `T001` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Templates** live in `docs/templates/`. The pull request and light-change issue templates live in `.github/` ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Decision records** are named `docs/decisions/NNNN-short-title.md`. The decision log is that folder's README ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Issue references:** light and trivial changes add a `Refs: #N` line naming their issue ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).
- **Correctness reviews:** the reviewer checks correctness against the spec and skips style.

## Done means

- The spec and plan were approved, with their scenarios and mocks.
- Every scenario, FR and SC has a passing test.
- Every required check passes.
- The reviewer's findings are fixed or answered.
- The pull request has a preview, and screenshots of anything visible.
- Brad merged it, or, while the agent's account is suspended, said push and main's CI passed.
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
- **2026-10-31, [D72](decisions/0072-draft-the-private-term-list-from-brads-notes.md)–[D78](decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md):** slice 1.3 builds the first two layers of the hard rules, the git hooks and Claude Code's rules.
  - The private-term list is drafted from Brad's notes, and Brad reviews it (D72).
  - The agent works only as its own GitHub account. Using Brad's login asks Brad first, the browser stays off the repo's pull request and settings pages, and a guard in Brad's user settings covers sessions started elsewhere (D73).
  - The reviewer is pinned to one model and measured on five frozen cases (D74).
  - Spec Kit's skills run the spec, plan, tasks and build stages from slice 1.4, with this repo's templates as their overrides (D75). The loop's own skills cover the other stages (D76).
  - The tools are pnpm 12, TypeScript with no build step, Vitest, husky and commitlint. The checks also cover commit messages, pushes, and branch and tag names (D77).
  - Each spec's tests live in `tests/NNN/` with their IDs leading each name, `tests.lock` uses `sha256sum`'s format, evidence from real runs is committed, and machine-specific values stay in the machine's git config (D78).
- **2026-11-01, [D80](decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md) and [D81](decisions/0081-the-conventions-batch-for-ci-and-the-ruleset.md):** slice 1.4 builds the third layer's required checks, and slice 1.5 applies the ruleset on main once the repo is public, since GitHub serves rulesets for a private repo only on a paid plan. Only a code owner's approval satisfies the ruleset, and CODEOWNERS names Brad.
- **2026-11-02, [D82](decisions/0082-the-conventions-batch-for-building-ci.md):** slice 1.4 builds CI. Workflows use only GitHub's own actions, pinned by commit hash, and each job runs a script in `scripts/ci/` that shares the hooks' code. The locked-tests check runs main's copy and reads a pull request as data. Planted failures run in a private sandbox repo with made-up terms, and evidence from real CI runs is committed.

## Sources

- Anthropic, Claude Code best practices: https://code.claude.com/docs/en/best-practices
- GitHub Spec Kit, spec template: https://raw.githubusercontent.com/github/spec-kit/main/templates/spec-template.md
- OpenAI, Codex best practices: https://learn.chatgpt.com/guides/best-practices
- GitHub Flow: https://docs.github.com/en/get-started/using-github/github-flow
- MADR 4.0: https://adr.github.io/madr/
- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- Birgitta Böckeler, TDD in the agent loop: https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html
- Thoughtworks Technology Radar, feedback sensors for coding agents: https://www.thoughtworks.com/radar/techniques/feedback-sensors-for-coding-agents
- **2026-11-03, [D100](decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md):** a draft pull request runs the quick CI jobs, and the full suite runs once it's ready for review.
- **2026-11-03, [D101](decisions/0101-a-lighter-loop-one-session-and-two-gates.md):** a lighter loop, from Brad's answers after slice 2.1. A slice runs in one session with two gates, spec and plan together, then the merge. New specs' tests come first but aren't locked. Decisions are choice cards in the session, not decision pages. Real-run evidence is needed only when a slice changes CI.
- **2026-11-04, [D117](decisions/0117-the-ci-sandbox-is-public.md):** the CI sandbox is public, so its runs cost no Actions minutes. It holds made-up terms only.
- **2026-11-06, [D160](decisions/0160-work-runs-under-brads-account-while-the-agents-is-suspended.md) and [D161](decisions/0161-changes-go-straight-to-main.md):** while the agent's account is suspended, work runs under Brad's account, and changes go straight to main after Brad says push, with no pull requests. pre-push no longer blocks a push to main, only a deletion of it, and the ruleset lets the admin role bypass. Main's CI runs on each push.
