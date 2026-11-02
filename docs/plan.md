# Slice plan

This is the step 0.4 plan. Phase 0 had four steps: the working agreement (0.1), the charter (0.2), the evaluation questions (0.3) and this plan (0.4). It breaks phases 1–4 into slices. Unless a row says otherwise, each slice is one pull request on the track shown. The plan was drafted on 2026-10-30 from [D1](decisions/0001-bradthome-com-is-an-explorable-resume-and-a-work-sample.md)–[D56](decisions/0056-layered-spending-caps-with-an-automatic-shutdown.md), and Brad approved it the same day ([D59](decisions/0059-approve-the-slice-plan.md)). It moved into this repo in slice 1.2.

Full acceptance criteria are written in each slice's spec, at its own Gate 1. This plan gives only a headline for each. Slices are numbered by phase, 1.1 to 4.5, because IDs like `S1.1` already name a spec's scenarios ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Releases

| Release | What it is |
| --- | --- |
| v0 | Today's one-day prototype on bradthome.com. It stays live until the phase 2 cutover. |
| v1.0 | The rebuilt site at the end of phase 2: same content, new stack, every check passing ([D58](decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)). |
| v2.0 | The relaunch, with the phase 3 redesign. Until then, phase 3 work deploys to a preview channel named `next`. |
| v2.x | The chat (phase 4). |

## Setup, and who does it

The agent does each step itself, after Brad's go-ahead where it touches billing or account settings. Brad does only what the agent's rules or Windows stop it from doing: creating accounts, typing passwords or verification codes, handling secret keys and approving Windows admin prompts.

| When | What | Who does it | Decision |
| --- | --- | --- | --- |
| Before slice 1.1 | Install Node 22.23.4 or later, then move to Node 24 before April 2027 | Claude, using nvm. No admin prompt. | [D37](decisions/0037-astro-react-and-a-separate-hono-api.md) |
| Before slice 1.1 | Create the agent's GitHub account | Brad. Claude's rules never allow creating an account. | [D43](decisions/0043-a-separate-github-account-for-the-agent.md) |
| Before slice 1.1 | Add the agent to the repo as a collaborator, then make and add its SSH signing key | Claude, after Brad's go-ahead. Brad signs the new account in once. | [D43](decisions/0043-a-separate-github-account-for-the-agent.md) |
| Before slice 1.1 | Forward brad@bradthome.com at Squarespace, then add and verify the address on GitHub | Claude, after Brad's go-ahead. Brad signs in to Squarespace. | [D4](decisions/0004-contact-through-brad-bradthome-com.md), [D16](decisions/0016-brads-own-commits-use-brad-bradthome-com.md) |
| Before slice 2.1 | Move the Firebase project to the Blaze plan, then set the budget alerts and the Cloud Run spend cap | Claude, after Brad's go-ahead, since it's billing | [D52](decisions/0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md), [D57](decisions/0057-six-layers-of-cost-stops.md) |
| Before slice 2.1 | Install WSL and Docker Desktop | Claude, using winget. Brad approves the Windows admin prompts and a restart, and Claude asks before accepting Docker's terms. | [D46](decisions/0046-visual-snapshots-in-a-pinned-linux-container.md) |
| Before slice 2.2 | Let the cost guard unlink billing | Claude, after Brad's go-ahead | [D57](decisions/0057-six-layers-of-cost-stops.md) |
| Before slice 3.10 | Create the Umami Cloud account, then add the site to it | Brad creates the account. Claude adds the site after Brad signs in. | [D40](decisions/0040-analytics-with-umami-cloud.md) |
| Phase 4 | Create the chat's Anthropic workspace and its monthly spend limit | Claude, after Brad's go-ahead | [D5](decisions/0005-ship-the-site-first-then-the-chat.md), [D57](decisions/0057-six-layers-of-cost-stops.md) |
| Phase 4 | Create the API key and store it as a secret on Google Cloud | Brad creates the key and pastes it in. Claude sets up the secret and everything that uses it, and never handles the key itself. | [D5](decisions/0005-ship-the-site-first-then-the-chat.md) |

By 2026-10-30, every step before slice 1.1 was done. The agent's account and the email come before slice 1.1. [D16](decisions/0016-brads-own-commits-use-brad-bradthome-com.md) says to verify the commit address before the first push, and [D43](decisions/0043-a-separate-github-account-for-the-agent.md) has the agent commit and open every pull request, so the public history shows the same process from the first commit.

## Phase 1: foundation

The repo stayed private until slice 1.5 ([D89](decisions/0089-switch-the-repo-to-public-after-a-clean-leak-scan.md)).

| Slice | Goal | Done when | Track | Depends on |
| --- | --- | --- | --- | --- |
| 1.1 Repo | A fresh repo with the README, both license files, the security policy, and pinned line endings and Node | GitHub shows MIT, the README calls v0 a one-day prototype, and nothing private is in any file | Light. Done 10/30 ([#2](https://github.com/memorex386/bradthome/pull/2)) | Setup: Node, agent account, email |
| 1.2 Instructions and docs | AGENTS.md, CLAUDE.md, the working agreement, the charter, decision records and templates | Every tier-1 decision has a MADR record, and AGENTS.md runs 150 lines or fewer | Light. Done 10/30 ([#4](https://github.com/memorex386/bradthome/pull/4)) | 1.1 |
| 1.3 Hooks and agent rules | husky, commitlint, gitleaks, the private-term script, Claude Code deny rules and hooks, the reviewer subagent, and skills sync | A commit to main, a bad message, a secret, a private term or a commit authored with a personal email address is blocked locally, and the agent can't merge | Full. Done 11/1 ([#5](https://github.com/memorex386/bradthome/pull/5)) | 1.2 |
| 1.4 CI and rulesets | Required checks with one gate, Dependabot, CODEOWNERS, the merge settings, and main's ruleset as a reviewed file ([D80](decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)) | Every pull request shows the gate, a planted failure of each kind fails it, and the ruleset file passes its check | Full. Done 11/2 ([#6](https://github.com/memorex386/bradthome/pull/6)) | 1.3 |
| 1.5 Go public | A full leak scan of the history, Brad's confirmation, then the switch to public, with private vulnerability reporting turned on ([D63](decisions/0063-security-reports-through-private-vulnerability-reporting.md)). Right after the switch: main's ruleset, CodeQL, and secret scanning with push protection ([D80](decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)) | No secret, private term or personal email address appears anywhere in the history or its commit metadata, Brad's go-ahead is logged, and a pull request from the agent's account can't merge without Brad's approval and passing checks | Light | 1.4 |

## Phase 2: rebuild today's site (v1.0)

Slice 2.2 builds the disaster stop that [D57](decisions/0057-six-layers-of-cost-stops.md) kept.

| Slice | Goal | Done when | Track | Depends on |
| --- | --- | --- | --- | --- |
| 2.1 Skeleton and pipeline | Astro 7, React, Tailwind 4, TypeScript, self-hosted fonts and light and dark tokens. Every quality check wired up, with a preview deploy per pull request | An empty page passes every required check and deploys a preview | Full | 1.5; setup: Blaze, Docker |
| 2.2 Cost guard | The disaster stop from [D57](decisions/0057-six-layers-of-cost-stops.md) as code: a budget alert at the project's limit starts a function that unlinks billing | Tests show an alert at the limit unlinks billing, and smaller alerts don't | Full | 2.1; setup: billing role |
| 2.3 Content model | Content collections for jobs, projects and claims with evidence links, plus the export script from the career notes | The build fails on an unknown field or a fact that isn't public | Full | 2.1 |
| 2.4 The essay | `/vindecoded-agents` ported, with its diagram | Same URL and same words, and the accessibility and Lighthouse checks pass | Full | 2.1 |
| 2.5 Home, as today | Today's home content on the new stack | It matches v0's content, and all checks pass | Full | 2.3 |
| 2.6 Cutover (v1.0) | Release the rebuilt site to production, with a rehearsed rollback | bradthome.com serves v1.0, and the rollback has been tested | Light | 2.2, 2.4, 2.5 |

## Phase 3: the redesign (v2.0, the relaunch)

Each slice starts with the interview and "Show it", so the open design decisions get made on that slice's page.

| Slice | Goal | Waits on |
| --- | --- | --- |
| 3.1 Design system | Tokens and components for the chosen look, in both themes | The look (A or C) |
| 3.2 Hero | The orchestrated sequence and the role eyebrow, with reduced motion supported and the text showing in the first frame | Hero words and pace |
| 3.3 Hopper | The main story, with evidence links | Brad's Hopper notes |
| 3.4 Experience | Bleacher Report featured, plus Bottle Rocket, BookShout, the single-line roles and the timeline | Bleacher Report highlights (optional) |
| 3.5 Side projects | VINDecoded and Sudoku World cards | — |
| 3.6 Role links | /mobile, /fullstack and /ai, each reordering the page | 3.2–3.5 |
| 3.7 Résumé PDFs | One PDF per role, printed and checked by veraPDF | PDF contact details; Hopper's end date |
| 3.8 Link previews | GitHub and App Store snapshots, hand-written LinkedIn and Play cards, and a scheduled refresh | — |
| 3.9 Contact | brad@bradthome.com, with a copy button | Setup: email forwarding |
| 3.10 Analytics | Umami with three events and a privacy note | Setup: Umami |
| 3.11 Relaunch (v2.0) | Final review and the production release | All of phase 3; the essay's title; a photo |

## Phase 4: Ask about Brad

This phase is planned in full when phase 3 ships. It starts with its own budget decision and the chat's runtime ([D41](decisions/0041-decide-where-the-chat-runs-in-phase-4.md)).

| Slice | Goal |
| --- | --- |
| 4.1 Corpus | `/corpus.json` and `llms.txt`, built from the content collections |
| 4.2 API | Hono on Cloud Run, using the AI SDK, with streaming, a bot check, rate limits, and the reactive cost layer from [D57](decisions/0057-six-layers-of-cost-stops.md): cost measured on every answer and an automatic shutoff |
| 4.3 Chat window | A React island with sources and the Inspect panel |
| 4.4 Evals | Frozen cases with scoring and a limit on cost per answer, run before every prompt or model change, plus a public /evals page |
| 4.5 Interview prep | Paste a job description and get evidence, gaps and questions |

## Where the cost layers land ([D57](decisions/0057-six-layers-of-cost-stops.md))

| Layer | Speed | Where it's built |
| --- | --- | --- |
| Evals with a cost limit per answer (proactive) | Before release | Slice 4.4 |
| Cost measured on every answer, with an automatic shutoff (reactive observability) | Seconds | Slice 4.2 |
| The Anthropic workspace's monthly spend limit | As soon as the limit is reached | Setup, phase 4 |
| Google's $5 monthly spend cap on Cloud Run | Within about a day | Setup, before slice 2.1 |
| The disaster stop: unlink billing past $25 in a month | Within about a day | Slice 2.2 |
| Budget alerts at $1, $3, $5 and $25 | Within about a day | Setup, before slice 2.1 |

## In every slice

- Every slice follows the working agreement.
- Acceptance tests are written from the spec's scenarios and locked before any code is written.
- The required checks follow [D55](decisions/0055-split-the-required-checks-by-determinism.md).
- Whenever anything visible changes, there's also a manual pass with the keyboard, a screen reader and reduced motion.

## Changes since approval

- **2026-10-30, [D63](decisions/0063-security-reports-through-private-vulnerability-reporting.md):** slice 1.5 also turns on private vulnerability reporting.
- **2026-10-30:** after the review of slice 1.1 ([#2](https://github.com/memorex386/bradthome/pull/2)), slices 1.3 and 1.5 are planned to check commit metadata for personal email addresses too. Their specs confirm it at Gate 1.
- **2026-10-30:** slice 1.1 is done ([#2](https://github.com/memorex386/bradthome/pull/2)).
- **2026-10-30:** the plan moved into this repo in slice 1.2. It leaves out the setup details of Brad's PC and how his accounts verify sign-ins.
- **2026-10-30:** slice 1.2 is done ([#4](https://github.com/memorex386/bradthome/pull/4)).
- **2026-10-31, [D72](decisions/0072-draft-the-private-term-list-from-brads-notes.md)–[D78](decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md):** slice 1.3's interview and plan widen it a little. The agent also can't act as Brad on GitHub without Brad's approval, the checks also cover commit messages, pushes, and branch and tag names, and the slice adds Spec Kit and the loop's skills. Spec Kit runs the spec, plan, tasks and build stages from slice 1.4.
- **2026-10-31:** slice 1.3 is built and in review ([#5](https://github.com/memorex386/bradthome/pull/5)).
- **2026-11-01:** slice 1.3 is done ([#5](https://github.com/memorex386/bradthome/pull/5)).
- **2026-11-01, [D80](decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md) and [D81](decisions/0081-the-conventions-batch-for-ci-and-the-ruleset.md):** GitHub serves rulesets, CodeQL and secret scanning for this repo only once it's public, so slice 1.4 lands the checks and keeps main's ruleset as a reviewed file, and slice 1.5 applies the ruleset, CodeQL and secret scanning right after the switch. Slice 1.4 also adds CODEOWNERS, so only Brad's approval counts, and runs the tests on Ubuntu and Windows.
- **2026-11-02, [D82](decisions/0082-the-conventions-batch-for-building-ci.md):** slice 1.4 is built and in review ([#6](https://github.com/memorex386/bradthome/pull/6)).
- **2026-11-02:** slice 1.4 is done ([#6](https://github.com/memorex386/bradthome/pull/6)).
- **2026-11-02, [D89](decisions/0089-switch-the-repo-to-public-after-a-clean-leak-scan.md):** after a clean leak scan and Brad's go-ahead, the repo is public, with main's ruleset, CodeQL, secret scanning with push protection, and private vulnerability reporting on ([#8](https://github.com/memorex386/bradthome/issues/8)).
