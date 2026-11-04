---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D113
---

# Releases run from a tag, behind Brad's approval

## Context and problem statement

Slice 2.6 releases the rebuilt site to bradthome.com as v1.0 ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)). Today the live channel serves v0, which was deployed by hand from a folder outside the repo, and nothing in the repo deploys to it. Three questions came up:

- How does main reach the live channel?
- Which Google identity may make a release live?
- What records a release?

## Decision drivers

- Every release is approved by a person, and a bad one can be undone in minutes.
- The version that goes live is the version that was checked.
- An identity holds only the rights it needs ([D91](0091-preview-channels-on-the-live-firebase-project.md) left the preview's sign-in able to reach the live channel).
- Industry standard by default ([D50](0050-industry-standard-by-default.md)).

## Considered options

The options are listed in the builder's ranked order.

1. How it's released:
   - A workflow run by hand on a tag. It stages the build on a channel, checks it, and waits for Brad's approval in a `production` environment before the release (recommended, chosen).
   - A local script, like the cost guard ([D105](0105-the-cost-guard-deploys-by-hand-from-a-repo-script.md)).
   - Release on every tag push, with the same approval.
2. The identity:
   - A new `release-deployer` account, usable only by the `production` environment, with a custom role (recommended, chosen).
   - The same account with Firebase Hosting Admin.
   - Reuse the preview's account.
3. The record:
   - A semver tag `v1.0.0` and a GitHub release (recommended, chosen).
   - A `v1.0` tag and a release.
   - The runbook only.

## Decision outcome

Brad chose the recommendation for each, in the slice 2.6 session on 2026-11-04.

- `release.yml` runs by hand on a `vX.Y.Z` tag on main:
  - **build** checks the tag and builds it.
  - **stage** deploys to the channel `release` as the preview account, with the live config, and runs the pre-release check against bradthome.com.
  - **release** waits for Brad in `production`, then points the live channel at the staged version and proves bradthome.com serves its every file.
- `rollback.yml` points the live channel back at the previous version, behind the same approval. `pnpm release:rollback` does the same from a machine.
- `release-deployer` holds the custom role "Hosting releaser", with `firebasehosting.sites.get` and `firebasehosting.sites.update`.
  - Hosting's IAM has no narrower permission for releases, so the role also allows uploads and domain settings. It leaves out creating, listing and deleting sites.
  - Its Workload Identity binding lets only `repo:memorex386/bradthome:environment:production` use it.
- The `production` environment needs Brad's review and allows only `v*` tags and main.
- Each release is a signed `vX.Y.Z` tag on main with a GitHub release. `docs/release.md` is the runbook.

### Consequences

- Good, because nothing reaches the live channel without Brad's approval in GitHub, and the approval comes after the check's results are shown.
- Good, because the release job builds and installs nothing: it releases a version that already exists, which is also how a rollback works.
- Good, because the release account can't be used by a pull request's run, only by the approved environment.
- Bad, because the preview's account can still reach the live channel, as D91 accepted. That's out of this slice's scope.
- Neutral: a second, emergency path stays open. Brad's own login, through `pnpm release:rollback` or the Firebase console, can roll back without Actions.

### Confirmation

Spec 008's tests (`tests/008/`) check the workflows' jobs, permissions and environment. They also check the release, the rollback and the pre-release check against a fake Hosting API. The rehearsal in `docs/releases/rehearsal.md` ran both on preview channels, as `release-deployer`.

## More information

- Decided by: Brad Thome, in the slice 2.6 session, 2026-11-04. The settings were made after Brad's yes in the same session.
- Spec: [issue #29](https://github.com/memorex386/bradthome/issues/29).
- Evidence, checked on 2026-11-04: [Hosting REST releases](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.channels.releases/create), [Firebase Hosting IAM](https://firebase.google.com/docs/projects/iam/roles-predefined-product), [GitHub environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment), [OIDC subject claims](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect).
