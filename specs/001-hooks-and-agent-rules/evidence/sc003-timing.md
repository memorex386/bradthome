# Spec 001: SC-003's commit timing under load

Real runs for [#34](https://github.com/memorex386/bradthome/issues/34) and [D116](../../../docs/decisions/0116-the-commit-timing-test-scales-its-budget-to-the-machine.md), on 2026-11-04.

## Before: the probe (SC-002)

The [probe](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41913529880) ran on the sandbox's `windows-2025` runners, which had 2 cores while the sandbox was private. Each job timed the current commit-msg and the lighter one in turn, 10 rounds each, with nothing kept busy, one core kept busy or both kept busy. Two jobs ran at each load. Each figure is a job's median of what the hooks added.

| Load | The hooks add now | With the lighter commit-msg | A commit with no hooks |
| --- | --- | --- | --- |
| None | 1.77–1.79 s | 1.53–1.55 s | 0.13–0.15 s |
| One core busy | 2.07–2.53 s | 1.80–2.22 s | 0.18–0.22 s |
| Both cores busy | 7.13–7.29 s | 6.42–6.56 s | 0.43–0.46 s |

## After: the SC-003 test (SC-001)

The [proof](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41920710913) ran `tests/001/integration/performance.test.ts` as committed in 523b7ae, in 12 jobs on `windows-2025`. The sandbox is public now, so the runners had 4 cores. Four jobs ran at each load: nothing kept busy, 2 cores kept busy and 4 kept busy. Every job passed all four tests, including the planted wait. Each line is the commit test's own log.

| Load | Job | Added, 5 rounds (ms) | No-hooks commits (ms) | Budget | Result |
| --- | --- | --- | --- | --- | --- |
| None | 1 | 1528, 1372, 1316, 1304, 1306 | 145, 127, 119, 133, 131 | 3.0 s | Pass |
| None | 2 | 1077, 1009, 979, 990, 1000 | 97, 97, 116, 101, 100 | 3.0 s | Pass |
| None | 3 | 1483, 1436, 1293, 1267, 1261 | 141, 127, 117, 134, 124 | 3.0 s | Pass |
| None | 4 | 1029, 1082, 1026, 1092, 1033 | 104, 101, 100, 103, 100 | 3.0 s | Pass |
| Half | 1 | 2002, 1564, 1578, 1687, 1692 | 154, 127, 144, 146, 145 | 3.0 s | Pass |
| Half | 2 | 1686, 1590, 1683, 1515, 1617 | 141, 138, 135, 125, 133 | 3.0 s | Pass |
| Half | 3 | 2091, 1660, 1573, 1658, 1499 | 128, 158, 153, 143, 146 | 3.0 s | Pass |
| Half | 4 | 1594, 1905, 1836, 1533, 1619 | 206, 152, 148, 132, 140 | 3.0 s | Pass |
| Full | 1 | 3737, 3520, 3524, 3424, 3467 | 239, 258, 332, 275, 244 | 5.2 s | Pass |
| Full | 2 | 3575, 3008, 3257, 3288, 3406 | 245, 290, 274, 249, 249 | 5.0 s | Pass |
| Full | 3 | 3894, 4012, 4155, 4186, 4563 | 368, 262, 302, 317, 277 | 6.0 s | Pass |
| Full | 4 | 3127, 3264, 3490, 3203, 3092 | 297, 270, 293, 235, 336 | 5.9 s | Pass |

Under full load the hooks added 3.3 to 4.2 seconds, which the old fixed 3-second budget would have failed. The no-hooks commit slowed by about the same factor, and the budget grew with it. On Brad's PC the hooks add about 0.9 s against a budget of 3 s.
