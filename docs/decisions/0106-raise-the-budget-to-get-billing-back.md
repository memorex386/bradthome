---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D106
---

# Raise the budget to get billing back

## Context and problem statement

After the guard unlinks billing, the month's spend stays above $25 until the month ends, so a relinked project would be unlinked again by the next notice. How does Brad get billing back for the rest of the month?

## Decision drivers

- One control is easier to remember than two.
- The guard should have no switch that turns it off silently.

## Considered options

The options are listed in the builder's ranked order.

1. Raise the budget, then relink (recommended)
2. A pause label the guard checks first, then relink

## Decision outcome

Chosen option: "Raise the budget, then relink", as recommended. The guard compares the spend with the budget amount in each notice, so the budget is the one control. Brad fixes the cause, raises "bradthome monthly" above the month's spend, relinks billing in the console, and sets the budget back to $25 at the start of the next month. Spec 004's runbook gives the steps.

### Consequences

- Good, because the guard has no off switch, and the stop moves with the budget.
- Bad, because the budget's email thresholds are percentages, so they move too while the budget is raised.

### Confirmation

Spec 004's tests show that a notice under a raised budget makes no billing call.

## Pros and cons of the options

### Raise the budget, then relink

- Good, because there's no extra code or setting.
- Bad, because Brad must remember to set the budget back.

### A pause label

- Good, because the budget stays at $25.
- Bad, because it's a second switch, and a forgotten label disables the guard.

## More information

- Decided by: Brad Thome, in the slice 2.2 session, 2026-11-03.
