# REQ-016 — Route Comprehension User Validation — Discussion

## Raw request

Derived from the product success gate: validate with real users that they can understand and reproduce the important route facts, complete a planning task, and recover from uncertainty without switching to another app.

## Context

REQ-006 originally combined routing correctness with human comprehension and device performance. Those are different decision gates. This spike validates the assembled vertical slice after route selection, card, map, and planner recovery are available.

## Actor / consumer

Primary actor: Astara product/design team running manual user sessions. Consumers: the product scope decision and the next engineering handoff.

## Problem

A route can be technically correct while users still board the wrong direction, miss a transfer, misunderstand an interval, or treat unknown access data as a guarantee. Desk review cannot establish whether the route explanation is understood.

## Desired outcome

Astara has a reproducible manual validation plan, observes representative users completing route-planning tasks, records comprehension and recovery failures, and makes an explicit decision about whether the MVP explanation is understandable enough to proceed.

## Known constraints

- The design baseline is at least 4 of 5 participants able to reproduce the key route facts in under one minute for the approved scenarios.
- Test the actual vertical slice: origin/destination selection, timing assumptions, route card, map companion, status language, and recovery behavior.
- The timing control exercised in the MVP study is the local depart-at input from REQ-013; arrive-by comprehension is outside the first study scope.
- The MVP study does not test preference selection because the product exposes no user-selectable preference; participants evaluate the fixed-policy explanation instead.
- Include older, visitor, stroller, wheelchair, screen-reader, or low-vision perspectives when the approved cohort and scenarios require them; do not claim full accessibility from a small test.
- Manual research and anonymized outcome notes are in scope; production analytics instrumentation is not.
- This spike does not select a routing engine, fix UI issues, or certify every network route.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which five participants and mobility/accessibility perspectives are approved? | Cohort composition affects what the result can support. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-002 | Which origin/destination cases represent the MVP promise? | Easy direct trips can hide transfer and uncertainty problems. | Project owner (proposed) | Closed — resolved by D-004 |
| OQ-003 | What counts as reproducing a key route fact? | Scoring must distinguish a correct answer from a guess. | Project owner (proposed) | Closed — resolved by D-005 |
| OQ-004 | Is the 4-of-5/one-minute target a release gate or a research signal? | The consequence of a miss changes scope and iteration. | Project owner (proposed) | Closed — resolved by D-006 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Human comprehension is a separate validation spike, REQ-016. | 2026-09-03 | Project backlog refinement | REQ-006 measures routing correctness; this item measures whether people can use the assembled result. |
| D-002 | The design’s 4-of-5 and under-one-minute measure is the working success baseline. | 2026-09-01 | Project docs | The threshold is visible for approval rather than hidden as a vague usability claim. |
| D-003 | Use five manual participants for the contest study, prioritizing older or novice TJ users and including visitor and relevant mobility/accessibility perspectives when available. Findings are bounded to the tested cohort and do not certify full accessibility. | 2026-09-04 | Project owner | The study reflects the primary cognitive-load risk without pretending to represent every rider. |
| D-004 | Use representative scenarios covering a direct trip, a transfer hub, a limited/unknown walking case, a frequency or timing case, and a no-route/recovery case. | 2026-09-04 | Project owner | The study tests the core promise and uncertainty/recovery risks instead of only easy routes. |
| D-005 | A participant passes a scenario when, without leading prompts, they reproduce at least four of five facts—service/direction, boarding/alighting, transfer, timing/interval, and limitation—within 60 seconds; mandatory facts for the scenario must be included. | 2026-09-04 | Project owner | Correct understanding is scored against observable route facts rather than confidence alone. |
| D-006 | Treat the 4-of-5 participant result as a release gate only for the tested contest/demo scenarios. If a scenario misses, fix the issue or remove/narrow that demo claim; do not generalize the result to the full network. | 2026-09-04 | Project owner | A miss has a clear consequence without turning a small study into a universal quality claim. |
| D-007 | Run sessions on a low-end mobile baseline with a 360–412px viewport and ordinary mobile network conditions; record anonymized notes and accessibility observations. The Astara developer/project owner owns the study report. | 2026-09-04 | Project owner | The validation reflects the primary use context while keeping research data bounded and reviewable. |

## Assumptions (agent-proposed)

- Manual sessions are sufficient for the first comprehension gate; anonymous analytics can be considered later after privacy and event definitions are approved.
- The test report should classify failures by input resolution, timing, route choice, transfer, access status, map interpretation, and recovery.
- REQ-005 supplies performance/accessibility evidence separately; this spike observes user impact rather than setting technical budgets.

## Next step

The cohort, scenarios, key-fact rubric, contest-gate consequence, mobile environment, and report ownership are resolved by D-003–D-007. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-03 — Decomposition pass

- Added to separate human comprehension from REQ-006’s routing-engine correctness benchmark.
- Kept the spike outcome as evidence and a decision report, not an implementation task or production analytics feature.

### 2026-09-03 — Dependency clarification

- Added REQ-013 as a direct prerequisite because the study explicitly exercises timing assumptions and controls, not only the downstream route result.

### 2026-09-04 — Depart-at-only timing decision

- The study validates the MVP’s local depart-at timing flow; arrive-by is not included unless the product scope changes.

### 2026-09-04 — No-preference simplicity decision

- The study validates comprehension of the fixed route-selection explanation without asking participants to choose a preference or slider.

### 2026-09-04 — Contest comprehension gate and mobile study

- The project owner approved five bounded participants, with older/novice TJ users prioritized and relevant accessibility perspectives included when available.
- The project owner approved direct, transfer, limited/unknown, timing/frequency, and no-route/recovery scenarios.
- The project owner approved the five-fact rubric and the per-scenario pass definition of at least four facts in under 60 seconds.
- The project owner approved 4-of-5 participants as a release gate only for tested demo scenarios; misses require fixes or narrower claims.
- The project owner approved a low-end mobile test baseline and developer/project-owner report ownership with anonymized notes.
