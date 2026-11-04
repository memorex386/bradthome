# Rehearsal: release A, release B, roll back to A

The rehearsal for spec 008 ([#29](https://github.com/memorex386/bradthome/issues/29), S2.3, SC-002, SC-003), run on 2026-11-04 before anything reached the live channel. It ran on preview channels of the `bradthome` site only, never the live channel. It used the scripts the release and rollback workflows run, as `release-deployer@bradthome.iam.gserviceaccount.com`, so it also proved that the account's custom role is enough ([D113](../decisions/0113-releases-run-from-a-tag-behind-brads-approval.md)).

## Setup

- A was main's build of the site at the slice's tests commit (`63fe312`, whose site matches main's `8eecb0c`). B was the same build with one HTML comment added to `index.html`, so its version differs only in that file's hash.
- Each build was staged on channel `rehearsal-stage` with the repo's `firebase.json`, as the stage job does. That was done with Brad's login, since the stage job's account is the preview's.
- Releases went to channel `rehearsal-two`, created for the rehearsal. Both channels expired a day later.
- For the rehearsal only, Brad's login could act as `release-deployer` (Service Account Token Creator on that one account), with Brad's yes in the session. The grant was removed at 15:36:45Z, right after the run. The account's only binding now is the one for the `production` environment.

## The run

```text
started 2026-11-04T15:35:57Z at commit 63fe312
created channel `rehearsal-two`, staging on channel `rehearsal-stage`
stage A: success
version A: `0b8e77c986cfac26`
$ node scripts/release/release.ts --version 0b8e77c986cfac26 --channel rehearsal-two --staged-channel rehearsal-stage --as release-deployer@bradthome.iam.gserviceaccount.com
✓ release  version 0b8e77c986cfac26 is served on rehearsal-two at https://bradthome--rehearsal-two-mmn5nu27.web.app: 10 files, after 1 s
stage B: success
version B: `603675cc35597fa0`
$ node scripts/release/release.ts --version 603675cc35597fa0 --channel rehearsal-two --staged-channel rehearsal-stage --as release-deployer@bradthome.iam.gserviceaccount.com
✓ release  version 603675cc35597fa0 is served on rehearsal-two at https://bradthome--rehearsal-two-mmn5nu27.web.app: 10 files, after 1 s
$ node scripts/release/rollback.ts --channel rehearsal-two --as release-deployer@bradthome.iam.gserviceaccount.com
✓ rollback  version 0b8e77c986cfac26 is served on rehearsal-two at https://bradthome--rehearsal-two-mmn5nu27.web.app: 10 files, rollback served after 1 s
rollback command took 4 s end to end
finished 2026-11-04T15:36:28Z
```

Each ✓ line means every file of the version answered at its address with its hash as the ETag. That covers 10 files: the 11 in the version, less Hosting's own `/__/` files, with `/404` counted.

## Checked separately

- A's `index.html` hash is `e6d407f117779a915dde5a58e7ba709227bb9fd6585fa89f3c651cafff931f3f`, and B's is `5cb10153bc461ce686fb6d882d1a9353593da97c4815ee8799751e313aee1448`.
- After the rollback, curl got `/` from the channel with A's ETag, and the page doesn't contain B's marker.
- `pnpm release:status --channel rehearsal-two` listed the releases newest first: the rollback to A, then B, then A.

## What the rehearsal found

The first attempt, on channel `rehearsal`, never passed its served check. For a Brotli response, Hosting's ETag is the file's hash followed by `-br`, and Node's fetch asks for Brotli. curl doesn't ask for it, which is why the probing by hand had shown the bare hash. The fix: `scripts/release/serve.ts` reads the hash with the encoding suffix removed. A unit test covers it, and the fake Hosting in `tests/008/helpers/fake-cloud.ts` now answers with `-br` the way Hosting does. The run above is the second attempt, on a fresh channel, with the fix.
