# Releasing and rolling back bradthome.com

How a commit on main reaches bradthome.com, and how to put the previous version back. Spec 008 ([#29](https://github.com/memorex386/bradthome/issues/29)) built this, and [D113](decisions/0113-releases-run-from-a-tag-behind-brads-approval.md) records why it's shaped this way.

## The parts

| Part | What it is |
| --- | --- |
| `release.yml` | Run by hand on a `vX.Y.Z` tag on main. It runs four jobs. **tag** checks the run is on a release tag on main. **build** builds it in the pinned Playwright container, as `ci / build` does, with WeasyPrint for the résumé PDFs and `pnpm csp --check`. **stage** puts the build on the Hosting channel `release` and runs the pre-release check. **release** waits for Brad, then makes the staged version live and proves it's served. |
| `rollback.yml` | Run by hand from main. It makes the version live before the current one live again, or a version you name, and proves it's served. |
| `production` | The GitHub environment both live jobs run in. It needs Brad's approval, and only `v*` tags and main may use it. |
| `release-deployer` | The Google account the live jobs sign in as, through Workload Identity Federation with no key. Only `production` jobs can use it. Its binding names GitHub's immutable subject for those jobs, `repo:memorex386@11021156/bradthome@1440242332:environment:production`, since this repo's identity tokens carry the owner's and repo's IDs. Its custom role "Hosting releaser" holds `firebasehosting.sites.get` and `sites.update`. |
| `release` channel | Where stage puts each candidate, with the live `firebase.json`. It's a preview channel that expires 7 days after the run. |

**Proof that a version is served.** Hosting's ETag for a file is the file's hash in its version, with `-br` added for Brotli. So a release counts as done only when every file of the version answers at its address on bradthome.com with its hash. The job checks every 15 seconds, for up to 10 minutes. If a release isn't served by then, the job puts the previous version back and fails.

## Release

1. Merge the change into main the usual way (Gate 2).
2. Tag the merged commit on main with a signed semver tag, and push the tag:

   ```bash
   git fetch origin && git tag -s v1.0.0 origin/main -m "v1.0.0"
   ```

   ```bash
   git push origin v1.0.0
   ```

3. Run the release on the tag. Add `-f words-may-change=home` only when the home page's words change on purpose, or `home-and-essay` when the essay's do too. A title Brad renamed is listed in `TITLE_CHANGES` in `scripts/release/check.ts` instead, and Umami's one `connect-src` host in `ADDED_SOURCES` (D159):

   ```bash
   gh workflow run release.yml --ref v1.0.0
   ```

4. Read the stage job's summary. Each line of the pre-release check is there:
   - every URL the live site serves still answers
   - every redirect is the same, and a missing page answers 404
   - every security header is at least as strict
   - the home page's and the essay's words match

   If stage fails, nothing was released. Fix the build and tag again.
5. Brad approves the release job in the run's **Review deployments** box. The job makes the staged version live and prints `✓ release  version <id> is served on live`.
6. Check it from a machine, which only reads:

   ```bash
   pnpm release:status
   ```

7. Record the release:

   ```bash
   gh release create v1.0.0 --verify-tag --title "v1.0.0" --notes "What changed, and the version ID pnpm release:status shows."
   ```

### The v1.0 cutover, once

v1.0 replaces v0, which was deployed by hand from outside the repo. After the v1.0 release, run the pre-release check again, with bradthome.com as the candidate and v0 as the baseline. Serve v0 from a preview channel, so the words, URLs and headers are compared with v0 itself. Record the output in `docs/releases/v1.0.0.md`, beside the release job's `✓ release` line (SC-001):

```bash
npx firebase hosting:channel:create v0 --expires 30d --project bradthome
```

```bash
pnpm release:rollback --channel v0 --version 1a8537e6c37af51e
```

```bash
pnpm release:check --live https://bradthome--v0-<suffix>.web.app --candidate https://bradthome.com
```

`<suffix>` is the channel's address, which the second command prints.

## Roll back

Any of these three puts a version back, and the first two prove that it's served. Pick the first that works.

1. **The workflow**, as `release-deployer`, after Brad approves:

   ```bash
   gh workflow run rollback.yml --ref main
   ```

   To go back further, name a version from `pnpm release:status`: add `-f version=<id>`.
2. **From a machine**, with Brad's gcloud login, if Actions is down:

   ```bash
   pnpm release:rollback
   ```

   It takes `--version <id>` too, and `--channel <name>` to roll back a preview channel instead.
3. **The Firebase console:** Hosting, then the site's release history, then **Rollback** on the release to restore. Afterwards, check it with `pnpm release:status`.

A rollback doesn't build or upload anything. It points the live channel at a version Hosting already has, the way the console's rollback does. So it takes seconds. The rehearsal's was served after 1 second ([rehearsal](releases/rehearsal.md)).

## Which version is live

`pnpm release:status` prints:

- the version the live channel serves, and when it was released
- what a rollback would put back
- the last releases

It only reads. Add `--channel <name>` for a preview channel.

## Since v2.0

Phase 3's redesign merged into main before the v2.0 relaunch, and every push to main shows on the `next` channel through `next.yml` ([D119](decisions/0119-main-deploys-to-the-next-channel-on-every-push.md)). Until v2.0 a release build left phase 3 out with a build flag ([D127](decisions/0127-the-new-home-shows-at-v2-and-stays-off-live.md)). Spec 019 retired that flag: a release build is the same build as CI's, in the pinned Playwright container, where WeasyPrint prints the résumé PDFs and `pnpm csp --check` proves `firebase.json`'s hashes match the build. `/v2` redirects to `/` ([D162](decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). Phase 4 brought one flag back for the chat until v2.1 ([D190](decisions/0190-a-release-flag-keeps-the-chat-off-live-until-v2-1.md)), and slice 4.4 removed it, so a release build is again exactly CI's (spec 023). A fix still ships the way [D120](decisions/0120-v1-x-fixes-ship-from-main-which-stays-releasable.md) set out for v1.x: merge it, tag `v2.x.y` on main, and release the tag.

### The v2.0 relaunch, once

v2.0 replaces v1.0's home with the redesign. Its rehearsal is recorded in [releases/v2.0.0-rehearsal.md](releases/v2.0.0-rehearsal.md), and its release in `releases/v2.0.0.md`. It runs with `words-may-change=home`, since only the home's words change. The essay's words are compared as before, with its renamed title allowed ([D163](decisions/0163-the-essays-title-drops-one-person.md)). v1.0.0 stays in Hosting's release history, and `pnpm release:rollback` puts it back.

## v0, the fallback

The hand-deployed prototype stays in Hosting's release history as version `1a8537e6c37af51e`. The first rollback after v1.0 puts it back. Its source folder stays on Brad's machine, outside the repo, until Brad decides otherwise.

## Rehearsing a change to this process

A change to the release or rollback scripts is rehearsed the way slice 2.6 was, on preview channels and never live. Stage two builds on a channel, release each with `node scripts/release/release.ts --channel <c> --staged-channel <s>`, roll back with `pnpm release:rollback --channel <c>`, and check that the served files match the first build. On a machine, `release.ts` refuses the live channel.
