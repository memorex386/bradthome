---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D182
---

# The chat's spend totals live in Firestore

## Context and problem statement

The chat switches off at $2.50 in a day or $20 in a month ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)). The API scales to zero and runs up to 2 instances ([D170](0170-the-chat-api-runs-on-cloud-run-scaled-to-zero.md)), so a total kept in memory resets each time the API sleeps and isn't shared between instances. Where should the totals live?

## Decision drivers

- The shutoffs must hold across sleeps and across both instances.
- No cost beyond a free tier, and no new vendor.
- Industry standard by default ([D50](0050-industry-standard-by-default.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Firestore, one document a day and one a month (recommended)
2. One JSON object in Cloud Storage, written with generation checks
3. Memory only

## Decision outcome

Chosen option 1, as recommended. Firestore in Native mode is turned on in the `bradthome` project, in `us-central1`. The API keeps one document for each UTC day and one for each UTC month, each holding the dollars spent and the number of answers, and adds each answer's cost with an atomic increment. Before answering, it reads both and refuses with the paused state at either limit. The documents hold numbers only ([D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md)). Only the API's service account can read or write them.

### Consequences

- Good, because the shutoffs hold whatever the instances do.
- Good, because a few hundred reads and writes a day stay well inside Firestore's free tier of 50,000 reads and 20,000 writes a day.
- Bad, because each question waits on one Firestore read, a few tens of milliseconds.
- Bad, because two answers in flight at once can each pass the check, so a total may overshoot its limit by about one answer's cost.

### Confirmation

Spec 021's tests show the API refuses at each total, with a fake store, and the deploy script reads the database's location.

## Pros and cons of the options

### Firestore

- Good, because it's Google's standard store for shared counters, with atomic increments.
- Bad, because it's one more service turned on in the project.

### Cloud Storage

- Good, because its API is already on.
- Bad, because a counter in a file needs a read and a conditional write with retries, which is clumsier and slower.

### Memory only

- Good, because nothing new is turned on.
- Bad, because the totals reset each time the API sleeps, so the shutoffs would barely work.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.2 session, 2026-11-08.
- Evidence, checked 2026-11-08: [Firestore pricing and free tier](https://cloud.google.com/firestore/pricing), [increment](https://cloud.google.com/firestore/docs/manage-data/add-data#increment_a_numeric_value).
