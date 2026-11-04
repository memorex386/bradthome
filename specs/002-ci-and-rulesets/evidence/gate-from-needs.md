# Spec 002: evidence for the gate from needs and the text check

Real runs for [#32](https://github.com/memorex386/bradthome/issues/32) and [D115](../../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md), on 2026-11-04:

- The gate decides from its workflow's `needs` and counts the tests matrix once.
- `ci.yml` no longer runs on an edit.
- `pr-text.yml`'s `text` job checks the pull request's title and description.

Each run's verdict was read from its gate or text job's log.

## Planted cases (SC-001)

The private sandbox `bradthome-agent/bradthome-ci-sandbox` holds made-up terms only. Its base `gfn-base` has this branch's files as one snapshot commit, and each plant is its own pull request into that base. All six started within a minute of each other.

| Case | Plant | Verdict | Run |
| --- | --- | --- | --- |
| S1.1 | A clean change (#25) | `✓ gate  every ci job passed`, and `text` passed | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898137140), [text](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898137098) |
| S1.2 | A type error (#26) | `✖ gate  2 of 15 jobs didn't pass`: `types failure`, `tests failure` (see below) | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898160407) |
| S1.2, FR-002 | A test that fails only on Windows (#27) | `✖ gate  1 of 15 jobs didn't pass`: `tests failure`. Only `tests (windows-2025)` failed | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898195913) |
| S1.2 | A run cancelled while its jobs ran (#30) | `✖ gate  7 of 15 jobs didn't pass`, naming each job `cancelled`. The gate still ran, since it runs `always()` | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898267618) |
| S2.2, S2.1 | The title `update the notes` (#28) | `text` failed: `✖ commits  the title fails the message rules`, with `subject-empty` and `type-empty`. Privacy passed | [text](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898214761) |
| S2.2, S2.1 | The same pull request after the title was fixed | `text` passed on the edit's own run. No ci run started for the edit, and the pull request has one ci run | [text](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898952952) |
| S1.3 | A draft (#29) | `✓ gate  every quick job passed. A draft runs the full suite once it's ready for review.` | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898240410) |
| S1.3 | The same draft marked ready | `✓ gate  every ci job passed`, with e2e, lighthouse, html and links run | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41899372087) |
| S1.4 | The bad-title plant's ci, re-run with "failed jobs" only | Attempt 2 re-ran `tests (windows-2025)` and the gate. Both runners passed and the gate read `✓ gate  every ci job passed` | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898214712) |
| S1.4, S1.6 | The clean plant's gate, re-run on its own | Attempt 2 read `✓ gate  every ci job passed`. This is the re-run that misread as "missing" on #30 under the old gate | [ci](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41898137140) |

**The extra `tests` failures.** In the type-error plant and the bad-title plant's first attempt, `tests (windows-2025)` also failed. The cause was spec 001's SC-003 timing test: "the commit hooks add under 3 seconds to a commit of 50 changed files". It measured 3.8 to 5.3 seconds with six plants sharing the sandbox's Windows runners. That's a real failing job, and the gate named it correctly. It has nothing to do with this change, and re-running it alone passed (S1.4 above). This timing test can fail on a loaded Windows runner, and that's worth a look of its own.

## This change's own pull request (SC-002)

[#33](https://github.com/memorex386/bradthome/pull/33), head `b881253`:

| Step | Verdict | Run |
| --- | --- | --- |
| Opened as a draft | `✓ gate  every quick job passed…`, with `text` and `lock` passing | [ci](https://github.com/memorex386/bradthome/actions/runs/41899906485), [text](https://github.com/memorex386/bradthome/actions/runs/41899906301) |
| Marked ready | `✓ gate  every ci job passed` | [ci](https://github.com/memorex386/bradthome/actions/runs/41901356958) |
| Title edited to `make the gate better` while the full run was still going | `text` failed 3 seconds later. No ci run started, and the full run went on to pass | [text](https://github.com/memorex386/bradthome/actions/runs/41901397675) |
| Title set back | `text` passed. Still no new ci run: the commit has exactly two, the draft's and the ready one | [text](https://github.com/memorex386/bradthome/actions/runs/41901499965) |

The push that adds this file is the last case: a new head on a ready pull request, where `ci` and `pr-text` both run (S2.3). Its runs are linked in #33's description.

## Misreads

None. Every gate and text verdict above matches the jobs' own results, re-runs included.
