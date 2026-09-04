# REQ-006 — Routing Correctness Benchmark — Discussion

## Raw request

Derived from the research gate: run OTP and, if needed, a custom candidate engine against 30–50 golden origin-destination cases before committing to a transit core or claiming that route explanations are data-derived.

## Context

Astara’s largest risks are route truth, transfer inference, time-dependent behavior, shape clipping, and whether users understand the recommended route. Desk research is complete, but prototype and field/user validation remain open.

## Actor / consumer

Primary actor: the Astara product/engineering team making the route-engine decision. Consumers: the product scope decision and the later engineering handoff.

## Problem

Without a shared oracle and observable assertions, the team cannot tell whether an apparently plausible route has the right order, direction, transfer count, walking geometry, service calendar, or explainable reason.

## Desired outcome

Astara has a reproducible golden-case set, compares candidate routing behavior, records failures, and uses user and performance evidence to decide whether the selected route engine and explanation model are sufficient for the MVP.

## Known constraints

- Cases should cover direct BRT, transfer hubs, Mikrotrans/feeder, similar-duration trade-offs, long walking, frequency service, after-midnight time, weekend, inactive service, loops, duplicate platforms, barriers, no route, and stale feed.
- Assertions must cover stop order, headsign/direction, geometry continuity and coordinate order, walking distance labeling, summary consistency, explanation reconstruction, unknown accessibility, and stale-feed visibility.
- Product success evidence in the design includes 4 of 5 users reproducing the key route facts in under one minute and completing a demo without switching apps.
- This item is a decision spike, not a promise that a custom engine will be built.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which 30–50 golden cases and reference answers are approved? | The oracle must represent the full-network risks rather than easy demos only. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-002 | What evidence threshold decides OTP is sufficient versus requiring a custom engine? | This controls a major architecture and maintenance decision. | Project owner (proposed) | Closed — resolved by D-004 |
| OQ-003 | Which user-test cohort and comparison baseline are approved? | The brief, design, and research describe different scales and tasks. | Project owner (proposed) | Closed — owned by REQ-016 |
| OQ-004 | Which low-end device and performance measures are part of the gate? | The result must be reproducible rather than subjective. | Project owner (proposed) | Closed — owned by REQ-005 D-005/D-008 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Start with OTP as an oracle or benchmark before deciding on a custom engine. | 2026-09-01 | Project docs | Custom routing is not assumed as the first implementation. |
| D-002 | Route explanations must be reconstructable from route facts and scorer fields. | 2026-09-01 | Project docs | Hardcoded reasons are insufficient for the validation gate. |
| D-003 | The benchmark starts with a minimum of 30 approved golden cases, stratified across direct BRT, transfers, feeder/Mikrotrans, loops/platform ambiguity, frequency/after-midnight/calendar, stale/unknown access, and no-route behavior. Each case has a manually approved expected answer and rationale. | 2026-09-04 | Project owner | The set is large enough to expose the documented risks without requiring the full network as an oracle; it may grow to 50 when evidence is available. |
| D-004 | Run OTP first as an offline oracle/benchmark. A custom explainable engine is justified only when the benchmark shows an OTP gap in required transfer, time, geometry, or explanation behavior; OTP is not a runtime dependency for the demo. | 2026-09-04 | Project owner | Engine choice is evidence-based and the product route contract stays explainable. |
| D-005 | Use a two-tier threshold: 100% of selected demo cases must match critical route facts (stop order, service/direction, service-day/time, transfer/no-route), and the broader benchmark must reach at least 90% fact-level correctness with no hidden critical mismatch. A miss blocks the related demo claim until fixed or the scenario is removed. | 2026-09-04 | Project owner | The release consequence is explicit without claiming that a small benchmark certifies every network journey. |
| D-006 | Fixture and decision-report maintenance belongs to the Astara developer/project owner. Benchmark execution is deterministic in the approved snapshot/configuration; low-end device and map performance gates remain owned by REQ-005, and human cohort validation remains owned by REQ-016. | 2026-09-04 | Project owner | Ownership and evidence boundaries are clear without duplicating other validation spikes. |

## Assumptions (agent-proposed)

- A deterministic fixture format can compare route cards, map legs, and API output using the same expected facts.

## Next step

Golden-case inventory, comparison method, thresholds, ownership, and boundaries with REQ-005/REQ-016 are resolved by D-003–D-006. Formal priority/size metadata and execution evidence remain before handoff.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- Validation was kept as a decision spike covering routing correctness, explainability, user comprehension, and measured performance.
- OTP remains the first benchmark/oracle; a custom engine is not treated as a predetermined deliverable.
- The spike contract and acceptance criteria were drafted; case inventory, thresholds, cohort, and device measures remain open.

### 2026-09-03 — Decomposition pass

- The item is narrowed to reproducible routing correctness and engine-choice evidence using golden cases.
- User comprehension moves to REQ-016; map performance/accessibility remains in REQ-005 and its validation evidence.
- Explainability remains a product behavior in REQ-001 and REQ-012; this spike only verifies that the underlying route facts and candidate behavior are correct.

### 2026-09-03 — Artifact-status correction

- Updated the next step to reflect that the validation requirement and acceptance-criteria artifacts already exist; case, threshold, and evidence decisions remain open.

### 2026-09-04 — Benchmark gate decision

- The project owner approved a minimum 30-case stratified golden set with manually approved expected facts, extendable to 50.
- The project owner approved OTP as an offline benchmark/oracle first; a custom engine is only justified by observed benchmark gaps and is not a runtime dependency.
- The project owner approved 100% critical-fact correctness for selected demo cases and at least 90% fact-level correctness across the broader set, with explicit scope reduction or fixes after a miss.
- Fixture/report ownership is the Astara developer/project owner. Device performance and human cohort decisions remain in REQ-005 and REQ-016.
