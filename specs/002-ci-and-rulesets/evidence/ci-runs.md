# Spec 002: evidence from real CI runs

The states only GitHub can show, recorded from real runs ([D82](../../../docs/decisions/0082-the-conventions-batch-for-building-ci.md)). Planted failures ran in the private sandbox `bradthome-agent/bradthome-ci-sandbox`, a copy of this branch whose secrets hold made-up terms only. `static/evidence.test.ts` reads this file.

The plants ran twice on 2026-11-02, each as its own pull request into the sandbox's default branch:

- **Round 1** failed the gate on every plant's first push, naming its job. But the tests jobs failed in every run too, since this file didn't exist yet, and the log sweep found branch names in the logs (below).
- **Round 2**, recorded here, ran after both were fixed, on a base whose own run passes (K0). Each plant's row is its first push in round 2.

## Planted failures

| State | Planted | Failing job | Required check | First try | Run |
| --- | --- | --- | --- | --- | --- |
| K1 | A made-up term and a test that fails only on Windows, in one push. The gate printed the mock's block: 2 of 8 jobs. | privacy, tests (windows-2025) | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475050999) |
| K2 | A type error. Only the types job failed. | types | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475056462) |
| K2 | A test that fails only on Windows. tests (ubuntu-24.04) passed. | tests (windows-2025) | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475064771) |
| K3 | A made-up term in a changed line, a commit message, the branch name, the title and the description | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475073533) |
| K4 | A made-up author address, shown as jo***@example.com | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475077162) |
| K5 | A made-up token, built at run time, shown as REDACTED | secrets | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475083890) |
| K6 | The Actions secret removed for the run, then put back | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41477463924) |
| K7 | A commit and a title that aren't Conventional Commits | commits | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475088858) |
| K8 | A locked test changed without its spec. Spec 001's suite caught it too, so both tests jobs failed in the CI run. | lock | locked-tests / lock: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475093583) |
| K9 | An ID that no test name leads. Spec 001's trace test and spec 002's coverage test caught it too, in both tests jobs. | trace | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475103114) |
| K10 | CRLF endings, a whitespace error and a drifted skill copy. Spec 001's suite caught the copy too, in both tests jobs. | hygiene | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475109000) |

## Other runs

| State | What | Result | Run |
| --- | --- | --- | --- |
| K0 | A docs-only pull request on round 2's base, so every job ran with no path filter, and the gate printed its pass line (D85, D86) | success | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475116712) |
| S1.5 | A second push to the same pull request, a few seconds after the first | cancelled | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475045708) |
| D1 | Dependabot's grouped pull request for the packages, rebased after D83 and D84. Privacy, commits and every other job passed except the tests, which failed only because this file didn't exist yet. Dependabot opened no Actions pull request, since the Actions are current. | failure | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41468329508) |

## Timings

| Run | From push to gate |
| --- | --- |
| [Pull request #6's first run](https://github.com/memorex386/bradthome/actions/runs/41463856419), with no queue | 10m 37s |
| [Round 2's K2 Windows plant](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475064771), queued behind the other plants | 13m 3s |
| [Round 2's K0 run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41475116712), queued behind the other plants | 21m 0s |

SC-002 asks for about 10 minutes. With no queue a run takes 10m 37s, and the Windows tests job is 10 of those minutes. It's a measure, not a limit (D55). The sandbox's times include waiting for runners, since its eleven plants started at once on one account.

## Log sweep

Round 2: 128 logs from 26 runs, every job of every run since round 2 started, downloaded and searched for each made-up term, in any letter case and the made-up digits in any format, and for any address that isn't a GitHub noreply address, brad@bradthome.com, Claude's co-author address or masked. They held no made-up term and no unmasked address, while K3's privacy job still named the branch name, the title and the description as places, K4 showed its address as jo***@example.com, and K5 showed its token as REDACTED.

Round 1's sweep found a made-up term in 61 of 145 logs, all from one cause: checkouts of the full history listed every branch name, including K3's. The privacy job itself printed none. The jobs now fetch the history quietly, and round 2 shows the fix.

## Minutes

From [pull request #6's first run](https://github.com/memorex386/bradthome/actions/runs/41463856419), billed by the rounded-up minute per job at GitHub's list prices on 2026-11-01:

- Linux: 10 minutes over the eight Linux jobs, the Ubuntu tests taking 3 of them, at $0.006 a minute: $0.06.
- Windows: the Windows tests, 10m 13s, so 11 minutes at $0.010 a minute: $0.11.
- The lock check adds about 1 Linux minute once it runs on pull requests after this one merges.
- So about $0.18 a run. The Windows tests are about two thirds of the cost, and the plan's estimate of 4 Windows minutes was low.

A month's projection: about 30 pushes and title edits on pull requests, and about 16 runs for Dependabot's weekly pull requests, so about 45 runs, or $7.92 a month, inside the free plan's $12. The $12 covers about 68 runs. Planted failures run in the sandbox, on the agent account's own minutes.

Brad reads GitHub's usage report two weeks after this pull request merges, and slice 1.5's pull request reports the real figure. From slice 1.5 the repo is public, and standard runners cost nothing.
