# Spec 003: evidence from real runs

The states only GitHub and Google can show, recorded from real runs ([D78](../../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md), [D82](../../../docs/decisions/0082-the-conventions-batch-for-building-ci.md)). `tests/003/static/evidence.test.ts` reads this file.

Planted failures ran on 2026-11-03 in the private sandbox `bradthome-agent/bradthome-ci-sandbox`, each as its own pull request into the branch `s003-base`. That base is one commit carrying this branch's files at `c56262e`, since main's merged history fails the pre-push hook's commit checks. Every plant's tests jobs failed too, since this file didn't exist yet, and the row names the job the plant was for. The sandbox has no Google sign-in, so its preview runs failed outside the gate.

## Planted failures

| State | Planted | Failing job | Required check | First try | Run |
| --- | --- | --- | --- | --- | --- |
| C1 | The dark accent token set to `#3d5a99`, too low in contrast on the dark background. The dark snapshots differed too. | e2e | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41693941159) |
| C2 | The layout's gap moved by one pixel, from 16 to 17 px | e2e | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41693966636) |
| C3 | An inline script that blocks for 900 ms, with its hash written into `firebase.json`. The median missed best practices, at 93. | lighthouse | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694263038) |
| C4 | An unused variable in `apps/site/src/planted.ts` | lint | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41693994952) |
| C4 | An unformatted file, `scripts/site/planted.ts` | format | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694020721) |
| C4 | A string assigned to a number in a page's frontmatter, `ts(2322)` | site-types | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694044281) |
| C5 | Two elements with the same id on the 404 page | html | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694069305) |
| C5 | The 404 page's link pointed at `/essay#intro`, which the build doesn't have | links | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694289585) |
| C6 | The Permissions-Policy header removed from `firebase.json` | e2e | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41694099361) |

## Lighthouse

| Metric | Median | Budget |
| --- | --- | --- |
| performance | 100 | 95 |
| accessibility | 100 | 100 |
| best-practices | 100 | 100 |
| seo | 100 | 100 |
| largest-contentful-paint | 1.5 | 2.0 s |
| cumulative-layout-shift | 0 | 0.05 |
| total-blocking-time | 0 | 150 ms |

The medians of five phone runs in [pull request #12's lighthouse job](https://github.com/memorex386/bradthome/actions/runs/41693658386), largest-contentful-paint in seconds and total-blocking-time in milliseconds.

## Keys

- `gh secret list`: PRIVATE_TERMS only
- `gcloud iam service-accounts keys list --iam-account=preview-deployer@bradthome.iam.gserviceaccount.com --managed-by=user`: none

## Sign-in

Read on 2026-11-03 with `gcloud iam workload-identity-pools providers describe` and `gcloud iam service-accounts get-iam-policy`.

- provider condition: `assertion.repository_id == '1440242332'`
- impersonation: `roles/iam.workloadIdentityUser` for `principalSet://iam.googleapis.com/projects/568431230204/locations/global/workloadIdentityPools/github/attribute.repository_id/1440242332`, the only binding

The service account holds `roles/firebasehosting.admin`, `roles/serviceusage.apiKeysViewer` and `roles/serviceusage.serviceUsageViewer` on the project ([D99](../../../docs/decisions/0099-the-preview-comments-with-pull-requests-write-and-accepts-hostings-hsts.md)). The settings were made on 2026-11-03 with Brad's go-ahead for each, with Brad's gcloud login, and the three repo variables with Brad's gh login, which the agent's account can't set.

## Preview headers

| Header | Value |
| --- | --- |
| Content-Security-Policy | `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; script-src 'self' …; style-src 'self' …`, with the seven script and three style hashes in `firebase.json` |
| Strict-Transport-Security | `max-age=31556926; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=()` |
| X-Robots-Tag | `noindex` |

Read from `/` on `https://bradthome--pr-12-8lflsni2.web.app`, which [this preview run](https://github.com/memorex386/bradthome/actions/runs/41693658639) deployed. A missing path answered 404. Hosting sends its own HSTS header on `web.app` addresses in place of `firebase.json`'s two-year value (D99).

## Other runs

- V1: [the preview run on `ab8dcee`](https://github.com/memorex386/bradthome/actions/runs/41698093979) deployed `pr-12` and posted one comment, 6612733528, by github-actions[bot]. [The run on the next push, `f66b15d`](https://github.com/memorex386/bradthome/actions/runs/41700280692), edited that same comment to show `f66b15d` and posted no second one.
- V2: Brad chose not to open a throwaway pull request from a fork. The unit and integration tests cover the fork's skip, and Dependabot's first pull request after the merge shows whether GitHub gives it an identity token.
- V3: a real refusal, before D99's role, printed `✖ preview  Firebase Hosting refused the deploy` and `HTTP 403 from serviceusage.googleapis.com`, and the gate wasn't affected ([run](https://github.com/memorex386/bradthome/actions/runs/41693658639), first attempt).

## Measured after the merge

- SC-003, a preview link within 10 minutes of each push over the first two weeks: reported in slice 2.2's pull request.
- SC-006, Hosting's use inside the no-cost allowance over the first two weeks: reported in slice 2.2's pull request.
