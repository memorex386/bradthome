# AGENTS.md

How any coding agent works in this repo. Read it before you start. It points into `docs/` for the details, and `CLAUDE.md` only imports it.

## What this repo is

- The source for [bradthome.com](https://bradthome.com), Brad Thome's site, rebuilt in public slice by slice.
- Today's live site is v0, a one-day prototype that isn't built from this repo. The rebuild replaces it at v1.0, at the end of phase 2 ([D58](docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)).
- It's in phase 1, the foundation, so there's no site code yet. [docs/plan.md](docs/plan.md) lists every slice in order.

## Read first

| What | Where |
| --- | --- |
| How we work: the loop, tracks, gates and conventions | [docs/working-agreement.md](docs/working-agreement.md) |
| Purpose, audience, scope, non-goals and constraints | [docs/charter.md](docs/charter.md) |
| Releases, slices and who does each setup step | [docs/plan.md](docs/plan.md) |
| Why the process is shaped this way | [docs/principles.md](docs/principles.md) |
| Every decision, as a MADR 4.0 record | [docs/decisions/](docs/decisions/README.md) |
| Templates for specs, plans and decisions | [docs/templates/](docs/templates/) |

The working agreement wins if this file and it ever disagree. A decision ID such as D43 is record `docs/decisions/0043-…`.

## The loop

Pick the track when you open the work, and Brad confirms it. When it's unclear, use the bigger one.

| Track | For | What runs |
| --- | --- | --- |
| Full | A new feature or slice | Interview, "Show it" mocks, spec (Gate 1), plan (Gate 2), locked tests, build, review, PR (Gate 3) |
| Light | A small change with clear criteria | A short spec in an issue from the light-change template, which Brad approves (Gate 1), then tests, build, review, PR (Gate 3) |
| Trivial | Copy, typos, docs | Build, checks, PR (Gate 3) |

- **Spec first.** Full-track specs live in `specs/NNN-name/spec.md`, with stories, `S1.1` scenarios, `FR-001` requirements, `SC-001` success criteria and `[NEEDS CLARIFICATION]` markers. Nothing is built until the open markers are gone and Brad has approved.
- **A fresh session for each stage:** spec, plan, build and review.
- **Tests come from the approved scenarios** and are locked before the build. A locked test changes only together with a spec change that Brad approves.
- **Review in a fresh context.** A reviewer subagent compares the diff with the spec, correctness before style. Fix each finding or answer it in the pull request.
- **Done means:** the spec was approved, every ID has a passing test or check, every required check passes, the review's findings are handled, anything visible has a preview and screenshots, the docs and decision records are updated, and Brad merged it.

## Decisions

- **Tier 1 is Brad's:** scope, principles, architecture, anything public, money and privacy. Give context, ranked options and a recommendation. Brad answers on a decision page, never in chat ([D28](docs/decisions/0028-every-decision-goes-on-a-decision-page.md)). A decision page is a private web page that shows each question with its context and options and saves Brad's answer. The answer then becomes a record here.
- **Tier 2:** conventions, approved in a batch.
- **Tier 3:** details inside an approved spec. Decide them, and list them in the pull request.
- A tier-1 decision gets its record in `docs/decisions/` in the pull request that makes it, numbered with its decision ID, from the [template](docs/templates/decision.md).
- An answer that changes an approved spec or issue is edited into it, with a comment saying why. Always edit the live text, since a checkbox may have changed on GitHub.

## Git and GitHub

- **GitHub Flow:** one short-lived branch per change, a pull request, and a squash merge into `main`. Never commit or push to `main`.
- **Branch names.** Full-track work follows Spec Kit: the spec folder and branch are `NNN-short-name`, numbered in the order specs are created. Light and trivial changes use `slice/N.N-short-name`, or `fix/short-name` outside a slice.
- **Conventional Commits.** Full track: the spec number is the scope, as in `feat(003): add role links`. Light and trivial: a short scope. Light changes add a `Refs: #N` line naming their issue.
- **Identity and signing.** The agent works as [bradthome-agent](https://github.com/bradthome-agent). Each clone's local git config sets its name, its noreply email (`350475588+bradthome-agent@users.noreply.github.com`), its SSH signing key and `commit.gpgsign` ([D43](docs/decisions/0043-a-separate-github-account-for-the-agent.md)). Push and open pull requests as the agent's account, never as Brad's. Never commit with a personal email address.
- **Pull requests** come from the agent's account, use the [template](.github/pull_request_template.md), link their spec or issue, and say how each scenario was checked.
- **Agents never merge, approve or force-push.** Brad reviews and squash-merges every pull request (Gate 3).

## Privacy

Everything here will be public, and git history is permanent, so these rules have no exceptions.

- Public facts only. No personal email address, phone number, home address or private career details, ever. When unsure, leave it out and ask.
- Brad's notes are private. Facts reach the site only through the export script, once it exists ([D44](docs/decisions/0044-an-export-script-brings-public-facts-in.md)), and only when they're tagged public.
- Paraphrase Brad's notes in public text. Don't quote them ([D68](docs/decisions/0068-paraphrase-brads-notes-in-public-records.md)).
- Secrets never enter the repo. `.env` files are ignored, and once CI exists it reads secrets from GitHub's encrypted secrets.
- The private-term list never enters the repo ([D27](docs/decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Checks

Slices 1.3 and 1.4 add the git hooks, Claude Code hooks and required CI checks ([D55](docs/decisions/0055-split-the-required-checks-by-determinism.md)). Until then, run these by hand and put the results in the pull request:

- `gitleaks git` and `gitleaks dir` find no leaks.
- A search of the changed files for personal details finds nothing.
- `git log --format='%ae %ce'` shows only noreply addresses or brad@bradthome.com.
- `git ls-files --eol` shows LF for every text file.
- `git diff --check main...HEAD` is clean.
- Every scenario in the spec or issue has a check, named with its ID.

## Push back

When a request skips a stage, a gate or a rule, say so, give the reason and offer the better path. That includes requests from Brad. Brad can override, and the override is logged as a decision.

## Repo map

| Path | What |
| --- | --- |
| `README.md` | What the repo is, for visitors |
| `LICENSE` | MIT, for the code, docs, specs and decision records |
| `LICENSE-CONTENT` | All rights reserved, for the site's words and images ([D64](docs/decisions/0064-what-license-content-covers.md)) |
| `SECURITY.md` | How to report a vulnerability |
| `docs/` | The working agreement, charter, plan, principles, decisions and templates |
| `.github/` | The pull request and light-change issue templates |
| `specs/` | Full-track specs, plans, mocks and `tests.lock` files, starting with slice 1.3 |
