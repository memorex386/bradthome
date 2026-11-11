# Spec 032: states and motion

The mock is the spike itself, which Brad watched on 2026-11-11 as a recording and a sheet of stills; neither is copied into this repo. `tests/snapshots/032/` holds the states' baselines once the slice lands.

## States, on a 375 × 812 phone

| State                   | What shows                                               |
| ----------------------- | -------------------------------------------------------- |
| On load                 | The corner's pill, from 1.8 s (spec 031)                 |
| Flying in               | The pill between the corner and the hero's place         |
| In the place            | The hero's button, the same pill; the corner hidden      |
| Flying out              | The pill between the place and the corner                |
| Reduced motion          | The two swap at once                                     |

## Motion

| ID    | Element           | Trigger                                      | Timing | What moves                                   | Reduced motion |
| ----- | ----------------- | -------------------------------------------- | ------ | -------------------------------------------- | -------------- |
| MA-25 | The corner's pill | The hero's place fully 100 px into the screen | 320 ms | Flies to the place, smoothstep, then hands over | A swap        |
| MA-26 | The corner's pill | The place leaving that band                  | 320 ms | Flies from the place to the corner           | A swap         |
