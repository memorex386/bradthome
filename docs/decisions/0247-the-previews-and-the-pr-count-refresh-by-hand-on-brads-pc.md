---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D247
---

# The link previews and VINDecoded's PR count refresh by hand on Brad's PC

## Context and problem statement

Spec 041 made VINDecoded's card a live pulse (D240): the chat API's `/pulse` read Apple's public listing, and was to count the PRs merged in VINDecoded's private repo with a read-only token in Secret Manager. A weekly GitHub workflow refreshed the numbers the card is built with and the link previews, and opened a pull request through a GitHub App (D146). The token and the App were Brad's to make, and neither was. So live `/pulse` answered the App Store alone, the card said "GitHub as of Nov 17", and the Monday workflow failed whenever a preview changed. On 2026-11-18 Brad chose not to keep a live token or an App for now, and to refresh the count by hand on Brad's own PC, leaving a live source for later if Brad wants one.

## Decision drivers

- No stored token, and no App or secret to make, renew or revoke.
- The App Store numbers stay live, since Apple's lookup needs no key.
- Every word on the card stays true: what's live and what's dated.
- The repo's name never enters the public repo, its logs or the API's answer.

## Considered options

The options are listed in the builder's ranked order, for each part Brad chose in the career session's cards of 2026-11-18.

- **The PR count:** counted by hand on Brad's PC through Brad's own signed-in `gh`, with no stored token (recommended); a live token in Secret Manager, as D240 set it; left off the card.
- **The App Store:** live through `/pulse` as now (recommended); counted by hand with the PRs.
- **The weekly workflow:** retired, with the same PC job refreshing every link preview (recommended); kept for the previews alone, waiting on the App.
- **The two empty secrets:** deleted by the career session once no deployed code reads them (recommended); kept.

## Decision outcome

Chosen, each as recommended:

- **The job.** `pnpm previews:refresh`, run on Brad's PC, refreshes the GitHub and App Store link previews, VINDecoded's latest iOS release, and the PRs merged in the 30 days before now. The count is one read-only search through Brad's own signed-in `gh`, whose `--jq` trims GitHub's answer to the count before it reaches the script. No token is read, asked for or stored. The repo's `owner/name` sits only in the git setting `bradthome.pulseRepo` on the PC, and the job prints counts, versions and days only, never `gh`'s own messages. A part that's checked takes today's day; one that fails keeps its last numbers and day, and the job exits 1. The files wait for a push, and a release builds them into the site.
- **The API.** `/pulse` answers the App Store's numbers alone. The GitHub fetch, the pulse's two secrets and the deploy's checks and mounts for them are removed, not switched off; git history keeps spec 041's code. The deploy fails if the service still holds either old variable, and its next run drops them. The Cloud Run service changes only with `pnpm chat-api:deploy` on Brad's yes.
- **The card.** The "Merged PRs" tile shows the built count, "In the 30 days to" its day, with no live dot. The line says only the App Store is live. "How this works" and `/privacy` say the count is counted on Brad's computer and built in, in Brad's approved words (spec 044).
- **The workflow.** `.github/workflows/previews.yml` and the pull-request scripts only it used are deleted. No App is needed, and no workflow refreshes anything on a schedule.
- **The secrets.** `pulse-github-token` and `pulse-github-repo`, which never held a value, are deleted by the career session once the deployed API no longer reads them.

### Consequences

- Good, because nothing secret is kept anywhere for the card, and nothing expires.
- Good, because the card says exactly what's live and what's dated.
- Good, because the repo's name stays on one PC, in one setting.
- Bad, because the count is only as fresh as Brad's last run and release; the tile's day says how old it is.
- Bad, because a refresh needs a push and a release to reach the site (D248 shortens that path).
- Bad, because the link previews no longer refresh on their own; their days say how old they are.

### Confirmation

Spec 044's tests run the job's library with a fake command runner and recorded answers, check that no error or output holds the setting's value, check `/pulse` answers the App Store alone, check the deploy mounts no pulse secret, and check the card's and `/privacy`'s words and that the workflow is gone.

## More information

- Decided by: Brad Thome, in the career session's cards of 2026-11-18, and on spec 044's Gate 1 cards the same day.
- Spec: [spec 044](../../specs/044-pulse-manual/spec.md).
- Amends [D48](0048-the-test-and-quality-batch.md) (the previews' scheduled refresh), [D146](0146-a-github-app-opens-the-previews-refresh-pull-request.md) (the App, no longer needed) and [D240](0240-live-numbers-from-the-sites-own-api.md) (the count's token and the weekly refresh). Builds on [D143](0143-app-store-cards-show-a-rating-only-from-100-ratings.md), [D150](0150-the-github-card-shows-the-profile-only.md), [D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md), [D185](0185-the-chat-api-deploys-by-hand-from-a-repo-script.md) and [D239](0239-vindecodeds-card-reads-as-a-live-pulse.md).
