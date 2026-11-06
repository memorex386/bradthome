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
| Before slice 3.10 | Create the Umami Cloud account, then add the site to it | Done 2026-11-05: Brad created the account, in the US region ([D158](decisions/0158-umami-cloud-keeps-data-in-the-us.md)). Claude added the website after Brad signed in. | [D40](decisions/0040-analytics-with-umami-cloud.md) |
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
| 2.3 Content model | Content collections for jobs, projects and claims with evidence links, plus the export script from the career notes | The build fails on an unknown field or a fact that isn't public | Full. In review ([#26](https://github.com/memorex386/bradthome/pull/26)) | 2.1 |
| 2.4 The essay | `/vindecoded-agents` ported, with its diagram | Same URL and same words, and the accessibility and Lighthouse checks pass | Full | 2.1 |
| 2.5 Home, as today | Today's home content on the new stack | It matches v0's content, and all checks pass | Full | 2.3 |
| 2.6 Cutover (v1.0) | Release the rebuilt site to production, with a rehearsed rollback | bradthome.com serves v1.0, and the rollback has been tested | Light | 2.2, 2.4, 2.5 |

## Phase 3: the redesign (v2.0, the relaunch)

Each slice starts with the interview and "Show it", so the open design decisions get made on that slice's page.

| Slice | Goal | Waits on |
| --- | --- | --- |
| 3.1 Design system | Tokens and components for the chosen look, in both themes, shown on the unlinked gallery at `/design-system`, and main deployed to `next` | Done: direction A with C's receipts ([D118](decisions/0118-direction-a-with-cs-numbered-evidence-receipts.md)) |
| 3.2 Hero | The orchestrated sequence and the role eyebrow, with reduced motion supported and the text showing in the first frame, on the new home at `/v2`, which stays off live until v2.0 | Done ([#39](https://github.com/memorex386/bradthome/pull/39)): take 3's words at the Story pace ([D124](decisions/0124-the-heros-words-are-take-3-from-the-hero-study.md)–[D128](decisions/0128-the-heros-buttons-link-a-stub-and-linkedin-until-their-slices.md)) |
| 3.3 Hopper | The main story, with evidence links | Done ([#40](https://github.com/memorex386/bradthome/pull/40), spec 011): built from the public résumé claims, with Brad's notes to come as a content change ([D129](decisions/0129-the-hopper-story-ships-from-the-public-resume-claims.md)) |
| 3.4 Experience | Bleacher Report featured, plus Bottle Rocket, BookShout, the single-line roles and the timeline | Done ([#41](https://github.com/memorex386/bradthome/pull/41), spec 012): weighted by the job files ([D130](decisions/0130-experience-weights-each-job-by-its-display.md)), with the degree in the content model ([D131](decisions/0131-education-joins-the-content-model.md)) |
| 3.5 Side projects | VINDecoded and Sudoku World cards | Done ([#42](https://github.com/memorex386/bradthome/pull/42), spec 013): VINDecoded on a lean card, on the side ([D132](decisions/0132-vindecoded-is-a-side-project-on-a-lean-card.md)), with the projects' public pages as evidence ([D133](decisions/0133-the-side-projects-public-pages-are-their-evidence.md)) |
| 3.6 Role links | /mobile, /fullstack and /ai, each reordering the page | Done ([#43](https://github.com/memorex386/bradthome/pull/43), spec 014): each page lights its role in the hero and puts its Hopper topics first ([D134](decisions/0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md)), only the home is indexable ([D135](decisions/0135-only-the-home-page-is-indexable.md)), and the résumé link stays LinkedIn until 3.7 ([D136](decisions/0136-role-pages-keep-the-linkedin-resume-link-until-slice-3-7.md)) |
| 3.7 Résumé PDFs | One PDF per role, printed and checked by veraPDF | In progress (spec 015): each PDF prints its role page's claims with Brad's contact line ([D137](decisions/0137-the-resume-pdfs-contact-line.md)) and Hopper's site dates ([D138](decisions/0138-hoppers-dates-on-the-resume-pdfs.md)), printed by WeasyPrint as PDF/A-2a and PDF/UA-1 and checked by veraPDF ([D139](decisions/0139-weasyprint-prints-the-resume-pdfs-as-pdf-a-2a-and-pdf-ua-1.md)), named for Brad and the role ([D140](decisions/0140-the-resume-pdfs-file-names.md)), with the home opening the full-stack PDF ([D141](decisions/0141-the-home-opens-the-full-stack-resume-pdf.md)) |
| 3.8 Link previews | GitHub and App Store snapshots, hand-written LinkedIn and Play cards, and a scheduled refresh | In progress (spec 016): App Store ratings only from 100 ratings ([D143](decisions/0143-app-store-cards-show-a-rating-only-from-100-ratings.md)), GitHub's profile with Brad's avatar ([D145](decisions/0145-the-github-card-shows-brads-avatar.md), [D150](decisions/0150-the-github-card-shows-the-profile-only.md)), a GitHub App opening the weekly refresh's pull request ([D146](decisions/0146-a-github-app-opens-the-previews-refresh-pull-request.md)), and one small script ([D147](decisions/0147-link-previews-ship-one-small-script.md)) |
| 3.9 Contact | brad@bradthome.com, with a copy button | In progress (spec 017): the address beside the hero's résumé link and in a "Get in touch" section that closes each page ([D152](decisions/0152-contact-shows-in-the-hero-and-closes-each-page.md)), with every ask-me link pointing there ([D153](decisions/0153-ask-me-links-go-to-the-contact-section.md)), and a Copy button in the site's one module ([D154](decisions/0154-the-copy-button-runs-in-the-sites-one-module.md)) |
| 3.10 Analytics | Umami with three events and a privacy note | In progress (spec 018): page views and the charter's three measures, sent from the site's one module to Umami Cloud's API ([D155](decisions/0155-analytics-send-from-the-sites-one-module.md)), only on bradthome.com ([D156](decisions/0156-analytics-send-only-on-bradthome-com.md)), never under Do Not Track or Global Privacy Control ([D157](decisions/0157-do-not-track-and-gpc-turn-analytics-off.md)), kept in Umami's US region ([D158](decisions/0158-umami-cloud-keeps-data-in-the-us.md)), with a privacy note at `/privacy`. Setup: Umami |
| 3.11 Relaunch (v2.0) | Final review and the production release | In progress (spec 019): the new home at `/`, with `/v2` redirecting there ([D162](decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)), the essay renamed ([D163](decisions/0163-the-essays-title-drops-one-person.md)), no photo ([D164](decisions/0164-no-photo-at-v2-0.md)), the gallery live and unlinked ([D165](decisions/0165-the-design-system-gallery-goes-live-unlinked.md)), Hopper's end date public ([D166](decisions/0166-hoppers-end-date-goes-public-at-v2-0.md)), spec 003's page checks on the essay ([D167](decisions/0167-spec-003s-page-checks-move-to-the-essay.md)), and the home and the essay indexable ([D168](decisions/0168-the-home-and-the-essay-are-indexable.md)) |

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
- **2026-11-02, [D91](decisions/0091-preview-channels-on-the-live-firebase-project.md)–[D94](decisions/0094-the-conventions-batch-for-the-skeleton-and-its-checks.md):** slice 2.1's interview. Previews deploy as channels on the live Firebase project, signed in without a stored key. The skeleton takes v0's colors with self-hosted Charis SIL and Inter, and its empty page says the site is being rebuilt in public. A conventions batch sets the layout, the new required checks, the budgets and how previews behave.
- **2026-11-03, [D104](decisions/0104-the-cost-guard-is-a-capped-firebase-function.md)–[D107](decisions/0107-raise-the-budget-to-get-billing-back.md):** slice 2.2's interview. The cost guard is a capped Firebase function in TypeScript, deployed by hand from a repo script, never from CI. A Monitoring alert emails Brad when it fires, and Brad gets billing back by raising the budget, then relinking. D57's $5 Cloud Run cap waits for the API in phase 4.
- **2026-11-03, [D108](decisions/0108-the-content-export-script-lives-in-the-site-repo.md) and [D109](decisions/0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md):** slice 2.3's interview. The export script lives in this repo and is run by hand with the notes folder, amending where D44 put it. Jobs and projects are written by hand with the positioning in them, and the export writes only claims, from the bullets tagged public.
- **2026-11-04, [D124](decisions/0124-the-heros-words-are-take-3-from-the-hero-study.md)–[D128](decisions/0128-the-heros-buttons-link-a-stub-and-linkedin-until-their-slices.md):** slice 3.2's interview. The hero uses take 3's words at the Story pace, readable from the first frame. The new home is built at `/v2` on previews and `next`, and a release build, with `BRADTHOME_RELEASE=1`, leaves phase 3's pages out. The buttons link a Hopper stub and LinkedIn until slices 3.3 and 3.7.
- **2026-11-04, [D129](decisions/0129-the-hopper-story-ships-from-the-public-resume-claims.md):** slice 3.3 builds the Hopper story at `/v2` from the public résumé claims. Brad's notes on the team, numbers, the agent workflow and a colleague's quote come later as a content change, not a slice.
- **2026-11-05, [D134](decisions/0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md)–[D136](decisions/0136-role-pages-keep-the-linkedin-resume-link-until-slice-3-7.md):** slice 3.6's interview. Each role page shows the same words and facts as `/v2`, lights its role in the hero and puts its Hopper topics first. Only the home page is indexable, and the résumé link stays LinkedIn until slice 3.7.
- **2026-11-05, [D137](decisions/0137-the-resume-pdfs-contact-line.md)–[D141](decisions/0141-the-home-opens-the-full-stack-resume-pdf.md):** slice 3.7. Each role gets a résumé PDF built from its page's claims, with Brad's contact line and no phone number, and Hopper dated as on the site. WeasyPrint prints them in the build as PDF/A-2a and PDF/UA-1, and veraPDF checks them in CI. The hero's résumé link opens the page's PDF, and the home's opens the full-stack one.
- **2026-11-05, [D143](decisions/0143-app-store-cards-show-a-rating-only-from-100-ratings.md)–[D151](decisions/0151-spec-003s-script-check-searches-without-a-tag-regex.md):** slice 3.8's interview. Link previews show GitHub's and the App Store's snapshots, committed and refreshed weekly by a pull request a GitHub App opens, and hand-written LinkedIn, Google Play and site cards. An App Store card shows a rating only from 100 ratings, and the GitHub card shows Brad's profile and avatar, with no repos (D150). Phase 3's pages ship one small script for them, so specs 002 and 003 were amended and relocked, and spec 003's script check searches without a tag regex (D151).
- **2026-11-05, [D152](decisions/0152-contact-shows-in-the-hero-and-closes-each-page.md)–[D154](decisions/0154-the-copy-button-runs-in-the-sites-one-module.md):** slice 3.9. Brad's address shows beside the hero's résumé link, in a phone's first screen, and a "Get in touch" section closes each new page, with a Copy button that runs in the site's one module. Every ask-me link goes there until the chat.
- **2026-11-06, [D162](decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)–[D168](decisions/0168-the-home-and-the-essay-are-indexable.md):** slice 3.11's interview and Gate 1. v2.0 moves the new home to `/` and redirects `/v2` there, renames the essay to "Running a 1.4M-download product with AI agents" with its words unchanged, ships no photo, puts the gallery live unlinked and noindex, and makes Hopper's Oct 2026 end date public. Spec 003's page checks move to the essay, which keeps v1's layout, and the home and the essay are the indexable pages. The release flag retires, and the release builds in the pinned container, so it prints the résumé PDFs.
