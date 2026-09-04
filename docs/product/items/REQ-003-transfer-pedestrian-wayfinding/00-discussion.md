# REQ-003 — Transfer Connectivity and Confidence — Discussion

## Raw request

Derived from the product promise: explain how to get to a stop, board in the correct direction, move between services or platforms, and complete the final walk without guessing.

## Context

The TJ feed has only a small set of explicit transfers and no `pathways.txt`. Additional transfer edges need station/platform relationships or verified walking geometry; proximity-only matches can be retained as non-routable review candidates, never as inferred transfer edges. OSM may provide geometry, but absent access tags are unknown rather than accessible.

## Actor / consumer

Primary actor: a transit user at a stop, station, or transfer hub. Consumers: the route card and the map.

## Problem

A route can be correct at the network level while failing at the physical decision point: the user may not know which entrance, JPO, platform, crossing, lift, or exit to use.

## Desired outcome

For each modeled route, Astara presents ordered walking, boarding, transfer, and alighting instructions tied to route facts and physical decision points. Each access fact carries a visible verification or confidence state.

## Known constraints

- Transfer edges must be derived from explicit GTFS rules, shared station/platform relationships, or verified walking-graph evidence. Coordinate proximity may flag an unconnected pair for review, but must not create a transfer edge.
- Transfer duration is walking route plus safety buffer; cognitive decision cost is kept separate.
- Full audit of every stop and path is outside the MVP.
- Missing access data is displayed as `Data terbatas` or `Perlu dicek`, never as an accessibility guarantee.
- The current contest/demo baseline has no gathered pedestrian-access evidence; supported connections with missing physical detail are limited, while unsupported connections remain non-routable.
- OSM attribution and license obligations apply when OSM data is used.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which transfer hubs and entrances receive manual verification first? | Audit depth is intentionally staged. | Project owner (proposed) | Closed — resolved by D-006 |
| OQ-002 | What evidence is sufficient for `Terverifikasi` versus `Perlu dicek`? | The same label must mean the same thing across hubs. | Project owner (proposed) | Closed — resolved by D-007 |
| OQ-003 | What should happen when no reliable walking path connects candidate stops? | The route engine needs a deterministic failure or fallback. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-004 | Which accessibility profiles, if any, are user-selectable in the MVP? | Inclusive design is a constraint, but a dedicated profile changes scope. | Project owner (proposed) | Closed — resolved by D-008 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Transfer and walking are separate graph concerns. | 2026-09-01 | Project docs | A nearby stop is not automatically a valid transfer. |
| D-002 | Decision-oriented instructions are more important than raw turn-by-turn geometry. | 2026-09-01 | Project docs | The requirement centers entrances, direction, platforms, JPO, crossing, and exit. |
| D-003 | For the contest/demo, explicit GTFS transfer rules, shared station/platform relationships, or verified walking evidence are the only permitted connection evidence. A supported connection with missing walking detail is `limited`; a connection without minimum evidence, including proximity-only matches, is `no-edge` and excluded from route selection. | 2026-09-03 | Project owner | REQ-001 can consume limited edges only under its evidence threshold; REQ-012 and REQ-005 must show the limitation and must not invent a path. |
| D-004 | A supported `limited` edge may feed the contest/demo primary route when no candidate with stronger/complete evidence is available; a `no-edge` remains excluded. | 2026-09-03 | Project owner | Route selection may preserve coverage without converting missing walking detail into verified access. |
| D-005 | Evidence completeness is a route-ranking preference for supported edges: complete evidence is preferred when route trade-offs are comparable, while a `limited` edge may still win when materially better or the only viable candidate. | 2026-09-03 | Project owner | REQ-001 owns the ranking decision; this item exposes the edge status and limitation without applying a hidden penalty. |
| D-006 | Initial transfer verification is limited to hubs and platform relationships used by approved demo and golden journeys; the rest of the network follows the same evidence rules without a full audit claim. | 2026-09-04 | Project owner | Scope stays bounded while route selection can cover the modeled network; absent evidence remains limited or unsupported. |
| D-007 | `Terverifikasi` requires an identified evidence source, source/snapshot date or observation/review date, and no unresolved contradiction. A supported connection with missing physical detail is `limited`; stale or contradictory evidence is `Perlu dicek`; proximity-only or otherwise unsupported candidates are `no-edge`. | 2026-09-04 | Project owner | Confidence labels have one observable meaning and never become an accessibility guarantee. |
| D-008 | The MVP exposes no user-selectable accessibility profile. Explicit barrier evidence can disqualify the affected connection/path, but missing barrier data remains unknown and cannot be treated as accessible. | 2026-09-04 | Project owner | The flow stays simple and avoids unsupported accessibility promises; profile-specific planning is deferred. |

## Assumptions (agent-proposed)

- Priority hub audits can cover the demo scenarios while the rest of the network remains explicitly limited or unknown.
- A `WalkingRouter` abstraction keeps the walking provider replaceable if a custom transit engine is selected.

## Next step

Initial hubs, confidence evidence, and accessibility-profile scope are resolved by D-006–D-008; the missing-path behavior is resolved by D-003. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- Transfer inference, walking geometry, physical decision points, and access confidence were kept as one user-facing wayfinding outcome rather than split by data layer.
- Full-network audit coverage remains explicitly out of scope for the MVP.
- The behavior and acceptance criteria were drafted; hub order, evidence thresholds, and profile scope remain open.

### 2026-09-03 — Decomposition pass

- The item is narrowed to determining whether a transfer edge exists and how confident that edge is.
- User-facing physical instructions and the maintenance lifecycle for entrance/JPO/lift/crossing evidence move to REQ-014.
- This preserves the ID and history while separating graph correctness from access-content maintenance.

### 2026-09-03 — Transfer-rule correction

- Proximity-only inference is removed from the routable transfer graph to comply with the repository architecture rule.
- A proximity match may remain as a non-routable review candidate, never as a confirmed or limited-confidence transfer edge.

### 2026-09-03 — Pedestrian-data availability policy

- The project owner approved a deterministic distinction between `no-edge` and `limited` while pedestrian evidence is still missing.
- A route may retain a connection backed by an approved source, but missing walking detail must remain visible and cannot become an accessibility or wayfinding claim.

### 2026-09-03 — Limited-primary fallback

- The project owner approved allowing a supported `limited` edge to participate in the primary demo route when no stronger/complete candidate exists.
- This does not change the prohibition on proximity-only or otherwise unsupported edges.

### 2026-09-03 — Evidence-completeness preference

- The project owner approved preferring complete transfer evidence for comparable route trade-offs while retaining supported `limited` edges when materially better or the only viable option.

### 2026-09-04 — Hub, confidence, and profile scope

- The project owner approved limiting initial manual verification to hubs and platform relationships represented in approved demo/golden journeys.
- The project owner approved the shared confidence vocabulary: sourced and dated evidence without contradiction is `Terverifikasi`; supported but incomplete physical detail is `limited`; stale or contradictory evidence is `Perlu dicek`; proximity-only or unsupported candidates are `no-edge`.
- The project owner approved no user-selectable accessibility profile for the MVP. An explicit barrier may exclude a path, while absent barrier data remains unknown.
