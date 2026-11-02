# Spec 002: evidence from real CI runs

The states only GitHub can show, recorded from real runs ([D82](../../../docs/decisions/0082-the-conventions-batch-for-building-ci.md)). Planted failures ran in the private sandbox `bradthome-agent/bradthome-ci-sandbox`, a copy of this branch whose secrets hold made-up terms only. `static/evidence.test.ts` reads this file.

Round 1 of the plants, on 2026-11-02. Every planted failure failed the gate on its first push, naming its job. In this round the tests jobs also failed in every run, since this file didn't exist yet, so round 2 reruns them on a base that has it.

## Planted failures

| State | Planted | Failing job | Required check | First try | Run |
| --- | --- | --- | --- | --- | --- |
| K1 | A made-up term and a test that fails only on Windows, in one push | privacy, tests (windows-2025) | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463562233) |
| K2 | A type error | types | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463573283) |
| K2 | A test that fails only on Windows | tests (windows-2025) | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463587138) |
| K3 | A made-up term in a changed line, a commit message, the branch name, the title and the description | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463595446) |
| K4 | A made-up author address, jo***@example.com | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463608856) |
| K5 | A made-up token, built at run time | secrets | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463618716) |
| K6 | The Actions secret removed for the run | privacy | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41467486054) |
| K7 | A commit and a title that aren't Conventional Commits | commits | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463631173) |
| K8 | A locked test changed without its spec | lock | locked-tests / lock: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463638370) |
| K9 | An ID that no test name leads | trace | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463652091) |
| K10 | CRLF endings, a whitespace error and a drifted skill copy | hygiene | ci / gate: failure | yes | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463669004) |

## Other runs

| State | What | Result | Run |
| --- | --- | --- | --- |
| K0 | A docs-only pull request, so every job runs with no path filter. Round 1's run failed only on this file's absence, so a clean run of this file is still to come (D86). | pending | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463695245) |
| S1.5 | A second push to the same pull request, a few seconds after the first | cancelled | [run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41463548025) |

## Timings

| Run | From push to gate |
| --- | --- |
| [Pull request #6's first run](https://github.com/memorex386/bradthome/actions/runs/41463856419) | 10m 37s |

## Log sweep

Round 1's sweep found a made-up term in 61 of 145 logs, all from one cause: checkouts of the full history listed every branch name, including K3's. The privacy job itself printed none. The jobs now fetch the history quietly. After that change, K3 ran again as a canary: its 8 logs from 2 runs held no made-up term and no unmasked address, while the privacy job still named the branch name and the title as places.

## Minutes

From [pull request #6's first run](https://github.com/memorex386/bradthome/actions/runs/41463856419), billed by the rounded-up minute per job at GitHub's list prices on 2026-11-01:

- Linux: 10 minutes over the eight Linux jobs, the Ubuntu tests taking 3 of them, at $0.006 a minute: $0.06.
- Windows: the Windows tests, 10m 13s, so 11 minutes at $0.010 a minute: $0.11.
- The lock check adds about 1 Linux minute once it runs on pull requests after this one merges.
- So about $0.18 a run. The Windows tests are about two thirds of the cost, and the plan's estimate of 4 Windows minutes was low.

A month's projection: about 30 pushes and title edits on pull requests, and about 16 runs for Dependabot's weekly pull requests, so about 45 runs, or $7.92 a month, inside the free plan's $12. The $12 covers about 68 runs. Planted failures run in the sandbox, on the agent account's own minutes.

Brad reads GitHub's usage report two weeks after this pull request merges, and slice 1.5's pull request reports the real figure. From slice 1.5 the repo is public, and standard runners cost nothing.
