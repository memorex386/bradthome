# Charter: bradthome.com

Brad approved this charter on 2026-10-30 (decision [D36](decisions/0036-approve-the-charter.md)). It's built from decisions [D1](decisions/0001-bradthome-com-is-an-explorable-resume-and-a-work-sample.md)–[D35](decisions/0035-purposeful-motion.md). It's the project's constitution, and it moved into this repo in slice 1.2. It changes only through a logged decision, recorded under "Changes since approval".

## Purpose

bradthome.com is a résumé you can explore, for anyone who wants to see how Brad works, from a recruiter's first skim to an engineer reading the code. It's a work sample in its own right, with its design, its code and the process behind it all public. ([D1](decisions/0001-bradthome-com-is-an-explorable-resume-and-a-work-sample.md), [D9](decisions/0009-the-site-repo-is-the-public-portfolio.md), [D69](decisions/0069-reword-the-charters-purpose.md))

## Audience

There are three kinds of visitors:
- Recruiters and hiring managers skimming on a phone, usually after tapping a link in LinkedIn or an email.
- Interviewers preparing on a laptop before or after a call.
- Engineers who arrive from a shared essay and go on to read the code.

When their needs conflict, the first screen serves the phone skim: in under ten seconds it shows Brad's name and role, Hopper, the proof and how to get in touch. Everything below the first screen serves the interviewer. Engineers get clear paths to the essay and the repo. ([D29](decisions/0029-the-first-screen-serves-the-phone-skim.md))

## Positioning

The site leads with Brad as a senior mobile and full-stack engineer, with applied AI second and Hopper as the main story. Earlier roles get space according to how relevant they are. Side projects appear as side projects. ([D2](decisions/0002-lead-as-a-senior-mobile-and-full-stack-engineer.md))

## Success criteria

These are measured from the first slice ([D30](decisions/0030-success-criteria-for-quality-and-process.md)):
- **SC-C1:** Core Web Vitals are good on phones. At the 75th percentile: Largest Contentful Paint ≤ 2.5 s, Interaction to Next Paint ≤ 200 ms, Cumulative Layout Shift ≤ 0.1. Lab checks in CI stand in until there's field data.
- **SC-C2:** Every page meets WCAG 2.2 AA, with no automated accessibility violations.
- **SC-C3:** Nothing private is published. The secret and private-term checks pass on every change.
- **SC-C4:** Every slice goes through the working agreement's loop, and its pull request shows the evidence.

Once analytics is decided in step 0.3, visitor measures get their own targets: visits that reach the work section, PDF downloads and contact clicks.

## Scope of the relaunch

The rebuilt site, v1.0, replaces today's prototype first, with the same content on the new stack ([D58](decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)). The relaunch, v2.0, then replaces v1.0 ([D31](decisions/0031-what-the-relaunch-covers.md)). It includes:
- The redesigned home page: the full dated work history, with Hopper first, and role links (/mobile, /fullstack, /ai) that reorder the page.
- The résumé PDF, matched to each role link.
- The essay.
- Link previews for LinkedIn, GitHub and the apps.
- Contact at brad@bradthome.com.

After the relaunch:
- "Ask about Brad", the chat, in phase 4, with its own budget decision.
- More writing, as plain pages.

## Non-goals

These are out of scope ([D32](decisions/0032-non-goals.md)):
- A VINDecoded marketing site. VINDecoded appears as a side project only.
- Accounts, comments, a newsletter or a content-management system.
- Tracking that identifies visitors, or any ad or marketing scripts.
- Private facts, a phone number or confidential employer details, ever.
- A blog platform. Any posts are plain pages in the repo.

## Constraints

- **Money:** there's no fixed monthly ceiling. Paid infrastructure is fine when it buys scalability or avoids a later migration. Each paid tool or service is its own tier-1 decision. Anything that costs money gets a spending cap, monitoring and, for AI features, evals before it goes live. ([D34](decisions/0034-no-fixed-spending-ceiling.md), [D53](decisions/0053-allow-paid-infrastructure-that-buys-scale.md))
- **Time:** there's no target date. Quality comes first, and the relaunch ships when its slices are done. Today's site stays live until the cutover. ([D33](decisions/0033-no-target-date.md))
- **Privacy:** only public facts appear. The leak checks enforce this in three layers. ([D27](decisions/0027-the-conventions-batch-for-templates-ids-and-records.md))
- **Accessibility and speed:** WCAG 2.2 AA, and good Core Web Vitals on phones.
- **Openness:** the repo is public, its history is real, and its decisions are recorded. ([D9](decisions/0009-the-site-repo-is-the-public-portfolio.md)–[D11](decisions/0011-build-privately-then-go-public-after-a-leak-scan.md))
- **People and tools:** one person, Brad, works with coding agents. Brad approves specs, plans and merges. Claude Code is the builder, and any agent can follow AGENTS.md. ([D23](decisions/0023-brad-approves-the-constitution-specs-plans-and-merges.md), [D26](decisions/0026-approve-the-working-agreement.md))

## Product principles

These come from [D35](decisions/0035-purposeful-motion.md):

1. Every claim links to its evidence: a source, the code, a screenshot or a document.
2. Phone first. Everything works fully on a phone.
3. Fast and accessible by default: good Core Web Vitals, and WCAG 2.2 AA.
4. Purposeful motion. A page gets one orchestrated moment when it opens. After that, motion responds to what the visitor does, such as hovering, tapping or scrolling a section into view. Motion stays short, never loops, never hides content, and turns off when reduced motion is on.
5. Public facts only. When unsure, leave it out.
6. The site is a work sample. Its code, process and decisions are public and readable.

How the work gets done is set out in the [working agreement](working-agreement.md).

## Risks

| Risk | Mitigation |
| --- | --- |
| With no target date, the relaunch drifts | Small slices, each one shipping something, with must-haves first in the slice plan (step 0.4). Today's site stays live. |
| Private details leak into the public repo | Leak checks in three layers ([D22](decisions/0022-enforce-hard-rules-in-three-layers.md), [D45](decisions/0045-a-private-term-script-plus-a-secret-scanner.md)), plus a leak scan before the repo goes public ([D11](decisions/0011-build-privately-then-go-public-after-a-leak-scan.md)) |
| Process overhead slows shipping | Three tracks. The full track is only for features and slices ([D18](decisions/0018-three-tracks-for-three-sizes-of-change.md)). |
| Costs grow quietly once paid tools arrive | Every paid tool is a tier-1 decision, with a cap, monitoring and evals ([D34](decisions/0034-no-fixed-spending-ceiling.md)) |
| The chat says something wrong about Brad | In phase 4, the chat answers only from public content, and its evals are published ([D5](decisions/0005-ship-the-site-first-then-the-chat.md)) |

## Approval

- Approved by Brad on 2026-10-30 (decision [D36](decisions/0036-approve-the-charter.md)).

## Changes since approval

- **2026-10-30, [D53](decisions/0053-allow-paid-infrastructure-that-buys-scale.md):** the non-goal "Paid infrastructure before the chat" is removed. Paid infrastructure is now allowed when it buys scalability or avoids a later migration, and the Money constraint says so.
- **2026-10-30, [D58](decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md):** the rebuilt site, v1.0, replaces today's prototype at the end of phase 2, with the same content. The relaunch, v2.0, follows at the end of phase 3, so the Scope section now says both.
- **2026-10-30, [D69](decisions/0069-reword-the-charters-purpose.md):** the Purpose now describes the audience as anyone who wants to see how Brad works, which covers the same three kinds of visitors.
- **2026-10-30:** the charter moved into this repo in slice 1.2. Its Risks table now cites [D22](decisions/0022-enforce-hard-rules-in-three-layers.md) and [D45](decisions/0045-a-private-term-script-plus-a-secret-scanner.md) instead of rule numbers from Brad's private notes.
