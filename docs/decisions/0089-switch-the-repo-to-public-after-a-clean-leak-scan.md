---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D89
---

# Switch the repo to public after a clean leak scan

## Context and problem statement

[D11](0011-build-privately-then-go-public-after-a-leak-scan.md) kept the repo private until the foundation merged and a full leak scan passed, and asked for Brad's go-ahead before the switch. Slice 1.4 merged, and the scan found nothing. [D80](0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md) left main's ruleset, CodeQL and secret scanning for the moment the repo is public. Should the repo go public now, and who runs the admin steps?

## Decision drivers

- Nothing private reaches the public: no secret, private term or personal email address, in the files, the history or GitHub's text (D11).
- Until the ruleset is live, nothing on GitHub blocks a merge, so the gap should be as short as possible (D80).
- The switch and the protections need an admin, and the agent's account has write access only ([D73](0073-keep-the-agent-on-its-own-github-account.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Switch now, and the agent runs the five admin steps in order with Brad's login (recommended)
2. Switch now, and Brad runs the admin steps
3. Not yet

## Decision outcome

Chosen option: "Switch now, and the agent runs the five admin steps in order with Brad's login", the recommended option. Brad added no note. The scan was clean, and running the steps back to back keeps the unprotected gap to about a minute.

On 2026-11-02 the agent ran these with Brad's gh login, each one stated first and approved in Claude Code, and used that login for nothing else:

1. The repo's visibility became public.
2. Main's ruleset was applied from `.github/rulesets/main.json`, unchanged.
3. Secret scanning and push protection were turned on.
4. CodeQL default setup was configured.
5. Private vulnerability reporting was turned on ([D63](0063-security-reports-through-private-vulnerability-reporting.md)).

### Consequences

- Good, because the repo, its history and its pull requests are public as the portfolio [D9](0009-the-site-repo-is-the-public-portfolio.md) describes, and Actions on public repos costs nothing.
- Good, because a pull request can't reach main without Brad's approval and the gate and lock checks, and GitHub now enforces it.
- Bad, because the switch can't really be undone: anyone can copy a public repo. The scan is the safeguard.
- Neutral: GitHub's API added a pull request parameter the ruleset file doesn't set, for pull requests Copilot opens, and turned it on when the file left it out. It was set to off on the live ruleset so that the live ruleset matches the reviewed file, and the file didn't change.

### Confirmation

- `pnpm ruleset:check` passes against the live ruleset with the file unchanged (spec 002, SC-005).
- GitHub's API reports the repo public, secret scanning and push protection enabled, CodeQL default setup configured, and private vulnerability reporting enabled.
- Slice 1.5's pull request shows its own merge blocked until its checks pass and Brad approves ([#8](https://github.com/memorex386/bradthome/issues/8), S1.11).

## Pros and cons of the options

### Switch now, and the agent runs the admin steps

- Good, because the steps run in order within a minute of the switch.
- Bad, because the agent uses Brad's login, so each step needs Brad's approval in Claude Code.

### Switch now, and Brad runs the admin steps

- Good, because the agent never uses Brad's login.
- Bad, because the steps take longer, and the gap between the switch and the ruleset grows.

### Not yet

- Good, because nothing changes that can't be undone.
- Bad, because nothing on GitHub blocks a merge in the meantime.

## More information

- Decided by: Brad Thome, on the slice 1.5 decision page (Q1).
- Evidence, scan run on 2026-11-02 before the switch, and again just before it, over every branch, tag and pull request head:
  - gitleaks 8.30.1 over all 66 commits: no leaks.
  - The private-term list over every version of every file (486 versions, 813 paths), every commit message, every author and committer name and address, every trailer, and every branch and tag name: no match.
  - Every author and committer address is a GitHub noreply address or brad@bradthome.com. The only addresses inside files are test fixtures on example domains, GitHub's system addresses, and the project address [D61](0061-the-agents-email-is-agent-bradthome-com.md) records.
  - 30 texts through GitHub's API (issues, pull requests, comments, reviews, review comments, commit comments and head branch names), and no releases: no term and no personal address.
- Issue: [#8](https://github.com/memorex386/bradthome/issues/8).
