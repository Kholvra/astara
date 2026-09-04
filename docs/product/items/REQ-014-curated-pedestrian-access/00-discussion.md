# REQ-014 — Curated Pedestrian Access Evidence — Discussion

## Raw request

Derived from the product risk that route correctness alone does not prove a usable entrance, platform, JPO, crossing, lift, sidewalk, or exit. Astara needs a small, maintainable evidence layer for priority transfer hubs and demo scenarios.

## Context

The current transit feed has no `pathways.txt`, and open map data may have incomplete or absent access tags. The product must distinguish verified facts from unknown conditions rather than infer accessibility from missing data.

## Actor / consumer

Primary actor: an Astara maintainer or reviewer curating access evidence. Consumers: route-card content, map decision markers, transfer confidence, and travelers with different mobility needs.

## Problem

Access facts age and can conflict. Without provenance, observation dates, and a publication lifecycle, a detail that was once true can become an unsafe or misleading instruction.

## Desired outcome

Astara can record, review, publish, age, and retire curated pedestrian-access evidence for priority hubs. Users see the evidence status and an explicit limitation/barrier state when the product cannot support a claim.

## Known constraints

- This item covers a curated subset, not a full audit of every stop, entrance, or sidewalk in Jakarta.
- Evidence records need at least a location/hub identifier, access type, status, source, observed date, review date, confidence, and notes or supporting evidence.
- Contest lifecycle: `draft → verified` with manual `Perlu dicek`/retired transitions; automatic aging/expiry thresholds are deferred beyond the contest.
- Missing evidence is internally `Unknown` and user-facing as `Data terbatas` or `Perlu dicek`; an explicit barrier can disqualify a route for a profile, but absence of a barrier is not proof of accessibility.
- The current contest/demo baseline has no gathered pedestrian/access records. Until records exist, no point may be labeled `Terverifikasi`; consumers must apply the REQ-003 `no-edge` versus `limited` boundary.
- User-visible claims must not exceed the evidence, and any map-data attribution obligations remain in force.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which hubs and access points are the first curated set? | Scope and user value depend on the audit boundary. | Project owner (proposed) | Closed — resolved by D-004 |
| OQ-002 | What observations and sources qualify for `Terverifikasi`? | The label needs a repeatable evidence standard. | Project owner (proposed) | Closed — resolved by D-005 |
| OQ-003 | How long before evidence becomes `aging` or `stale`? | Expiry changes both copy and route eligibility. | Project owner (proposed) | Closed for contest demo — resolved by D-006 |
| OQ-004 | Who can review, publish, contradict, or retire a record? | Lifecycle ownership is required for trustworthy maintenance. | Project owner (proposed) | Closed — resolved by D-007 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Curated access evidence is a separate outcome from transfer-graph connectivity. | 2026-09-03 | Project backlog refinement | REQ-003 determines graph confidence; this item owns the evidence records and maintenance lifecycle. |
| D-002 | Unknown access data must remain visible rather than being converted into a positive claim. | 2026-09-01 | Project docs | Product copy can say `Data terbatas` or `Perlu dicek`, but cannot promise accessibility. |
| D-003 | For the contest/demo, the absence of gathered access records is an explicit limited-coverage state. No record can become `Terverifikasi`; REQ-003 decides whether a connection is `no-edge` or `limited`, while REQ-005 and REQ-012 expose the resulting limitation without inventing a path or accessibility outcome. | 2026-09-03 | Project owner | The demo may proceed with known transit facts and bounded access claims until sourced curation is completed. |
| D-004 | The first curated set is limited to access points at hubs and journey points used by approved demo/golden scenarios; no full-network accessibility audit is implied. | 2026-09-04 | Project owner | Curation effort stays bounded and aligned with the journeys being demonstrated. |
| D-005 | `Terverifikasi` requires a stable location/type, named source, observation date, supporting note/evidence, and manual review with no unresolved contradiction. Records missing these fields remain unknown/limited. | 2026-09-04 | Project owner | Consumers can distinguish sourced evidence from absent or insufficient evidence. |
| D-006 | The contest demo does not run automatic aging or expiry thresholds. Records are pinned to the demo snapshot and manually marked `Perlu dicek`/retired when contradicted; production aging thresholds are deferred. | 2026-09-04 | Project owner | Static demo data remains honest without pretending to have a maintenance cadence that does not exist. |
| D-007 | The Astara developer/project owner reviews, publishes, contradicts, and retires curated records for the contest. A contradiction demotes the claim from verified; community submission/moderation remains REQ-008. | 2026-09-04 | Project owner | Ownership and lifecycle actions are explicit without adding a separate moderation system. |

## Assumptions (agent-proposed)

- A priority-hub subset can cover the first demo and validation journeys while the rest of the network remains explicitly unknown.
- A record-level provenance model is enough for the MVP; a community submission workflow belongs to REQ-008.
- REQ-002 supplies the network identifiers used to attach evidence, but access records need their own review timestamps.

## Next step

The initial demo set, evidence standard, contest lifecycle, and review authority are resolved by D-004–D-007. Formal priority/size metadata remains a backlog gate; production expiry policy is deferred.

## Refinement log

### 2026-09-03 — Decomposition pass

- Added to isolate the missing physical-access data lifecycle from transfer-edge calculation and route-card presentation.
- Kept the MVP intentionally curated and evidence-limited; no full Jakarta accessibility audit is implied.

### 2026-09-03 — Data availability clarification

- The project owner confirmed that pedestrian/access evidence has not yet been gathered.
- Treat this as an open data gap; no access detail may be presented as verified until a source and observation are recorded.

### 2026-09-03 — No-data consumer policy

- The project owner approved the limited-coverage baseline for the contest/demo.
- Missing records remain `Unknown`; graph connectivity and route-surface behavior follow REQ-003, REQ-005, and REQ-012 rather than inventing an access result.

### 2026-09-04 — Demo curation boundary and lifecycle

- The project owner approved curating only hubs/access points represented in approved demo/golden journeys.
- The project owner approved a source/date/evidence/manual-review gate for `Terverifikasi`; missing fields remain unknown/limited.
- The project owner approved snapshot-pinned, manual contradiction/retirement handling for the contest, with automatic aging thresholds deferred.
- The Astara developer/project owner owns review and publication for the contest; community moderation remains out of scope.
