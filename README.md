# bradthome.com

The source for [bradthome.com](https://bradthome.com), the site of Brad Thome, a senior mobile and full-stack engineer. The site is a résumé you can explore, and it's built in the open: each change starts as a spec in this repository, and its tests, review, decisions and release records are here too.

## What's live

bradthome.com serves v2.7, released on 2026-11-12.

- **The home page** leads with Brad's work at Hopper, then the earlier roles and what Brad builds on the side. Each claim has a numbered receipt that links its proof, or says to ask Brad.
- **Role pages:** [/mobile](https://bradthome.com/mobile), [/fullstack](https://bradthome.com/fullstack) and [/ai](https://bradthome.com/ai) show the same facts in an order for one kind of role, each with its résumé as a PDF.
- **[The essay](https://bradthome.com/vindecoded-agents)** on running VINDecoded, Brad's side project, with AI agents.
- **Ask about Brad,** a chat that answers only from Brad's public facts and cites a source for each answer. [/evals](https://bradthome.com/evals) shows its latest eval run, case by case.

## What it's built with

- **The site:** [Astro](https://astro.build) with React, Tailwind CSS and Motion, in TypeScript. Every page is built ahead of time and served by Firebase Hosting. The same build prints the résumé PDFs with WeasyPrint, and veraPDF checks them.
- **The chat:** a [Hono](https://hono.dev) API on Cloud Run. Claude Haiku 5.5 answers from the public facts at [/corpus.json](https://bradthome.com/corpus.json), behind a proof-of-work bot check, a daily question limit and spending shutoffs. Its evals use Claude Sonnet 5.5 as the judge.
- **Analytics:** Umami Cloud, with no cookies, and nothing sent under Do Not Track or Global Privacy Control ([privacy note](https://bradthome.com/privacy)).

The site is in `apps/site`, the chat's API in `apps/chat-api`, its evals in `apps/evals`, and the checks and release scripts in `scripts/`.

## How a change is made

Brad builds the site with Claude Code as the coding agent, and approves each step that matters. A new feature goes through one loop, written down in the [working agreement](docs/working-agreement.md):

1. **Spec.** The feature is written up as a spec, with user stories, numbered acceptance scenarios and requirements, and mocks of what a visitor sees. Brad approves the spec and its plan before any code is written.
2. **Tests.** Tests are written from the approved scenarios first, each named for the IDs it covers. CI fails when an ID has no test.
3. **Build,** until every check passes: types, lint, unit and end-to-end tests, accessibility at WCAG 2.2 AA, visual snapshots in a pinned container, Lighthouse budgets, and scans for secrets and private details.
4. **Review.** A second reviewer, an agent starting from a fresh context, checks the change against its spec. Each finding is fixed or answered.
5. **Brad's go-ahead.** Nothing reaches `main` until Brad says push. CI runs again on every push to `main`, which also deploys to a preview channel.
6. **Release.** A release goes out from a version tag only after Brad approves it in GitHub's `production` environment, with a rollback one command away. The [release records](docs/releases/) show each release and the rollback rehearsals before them.

Small changes take a lighter path: a short spec in an issue, or for copy and docs, just the checks.

## Where to look

- [Decisions](docs/decisions/README.md): every decision Brad has made about the site, each a record with the options considered and why one was chosen.
- [Specs](specs/): a folder per feature, with its spec, plan and mocks.
- [Release records](docs/releases/): what each release changed, how it was checked on production, and its rollback rehearsal.
- [/evals](https://bradthome.com/evals): the chat's latest eval run, with every case and every miss.
- The [charter](docs/charter.md) for the site's purpose and audience, the [plan](docs/plan.md) for the slices in order, and the [principles](docs/principles.md) behind the process.

Coding agents start with [AGENTS.md](AGENTS.md).

## License

Everything in this repository is under the [MIT License](LICENSE), including the code, docs, specs and decision records. The exception is the site's words and images, meaning what becomes a page, image or PDF on bradthome.com. Those are © Brad Thome, all rights reserved, and [LICENSE-CONTENT](LICENSE-CONTENT) says what that covers.

## Security

Report vulnerabilities privately through GitHub's private vulnerability reporting, not in a public issue. [SECURITY.md](SECURITY.md) has the details.
