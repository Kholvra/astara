# REQ-012 — Route Card and Journey Instructions — Discussion

## Raw request

Derived from the product promise that Astara must explain a selected TransJakarta journey in a route card a person can follow without reverse-engineering the map.

## Context

The earlier route-planning requirement combined route selection with the user-facing summary, explanation, ordered steps, and trust copy. Those concerns are related but can be reviewed and delivered as a separate vertical outcome once the route result contract exists.

## Actor / consumer

Primary actor: a person who needs to understand one selected journey. Consumers: the route-selection result, curated access evidence, map companion, and planner state.

## Problem

A technically valid route is not actionable if the user cannot tell where to board, when to transfer, which direction to take, where to alight, or which facts are verified versus uncertain.

## Desired outcome

After Astara selects a primary journey, the user can read a Bahasa Indonesia route card containing a concise summary, the reason for the recommendation, ordered journey steps, and visible data-status language. The card remains understandable when the map is unavailable.

## Known constraints

- The route card is the primary instruction surface; the map is a companion.
- Route facts must be traceable to the route result and evidence status; copy must not invent details.
- Use a consistent Bahasa Indonesia glossary for halte, rute, arah, transit, transfer, berjalan, and data status.
- `Terverifikasi`, `Perlu dicek`, and `Data terbatas` communicate evidence state, not a guarantee of safety or accessibility.
- `Unknown` may be used as an internal evidence state, but user-facing copy uses only the approved Bahasa Indonesia labels.
- The MVP timing input is depart-at-only; the card shows the selected departure date/time and timing assumption, not an arrival deadline.
- The MVP has no user-selectable preference; the card explains the fixed route-selection policy through observable facts rather than a chosen preset or slider.
- When fare data is incomplete, the card omits the fare amount and shows `Data terbatas` or `Perlu dicek` rather than an estimate without a basis.
- Live turn-by-turn navigation, ticket payment, and realtime promises are outside this item.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Is one primary route sufficient, or must visible alternatives be included in the first card? | Alternatives change card structure and the route-selection contract. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-002 | Which explanation facts must appear above the fold? | The user needs to understand “best” without reading every step. | Project owner (proposed) | Closed — resolved by D-006 |
| OQ-003 | Who approves the Bahasa Indonesia glossary and uncertainty wording? | Inconsistent terms can create operational mistakes. | Project owner (proposed) | Closed — resolved by D-007 |
| OQ-004 | What is the minimum card behavior when a route contains unknown access evidence? | The card must stay useful without turning unknown data into a claim. | Project owner (proposed) | Closed — resolved by D-004 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Route-card content is separated from route selection as REQ-012. | 2026-09-03 | Project backlog refinement | REQ-001 returns route facts and reasons; this item turns them into user-facing instructions. |
| D-002 | The route card must be useful without map interpretation. | 2026-09-01 | Project docs | Missing map geometry cannot remove the core ordered instructions. |
| D-003 | The MVP presents one primary route card per planning scenario; visible alternative routes are deferred. | 2026-09-03 | Project docs (`docs/design.md`) | REQ-012 renders one primary card and does not require alternative-card comparison in the first release. |
| D-004 | When pedestrian evidence is unknown, keep supported journey steps visible with `Data terbatas` or `Perlu dicek`. A direct route may remain usable with an unknown origin/final walk; a supported transfer with missing physical detail is limited; a `no-edge` or proximity-only transfer is not rendered as a route or invented instruction. | 2026-09-03 | Project owner | The card preserves known transit facts while clearly separating missing access detail from unsupported connectivity. |
| D-005 | A selected `limited` route may be shown as the primary demo route when no candidate with stronger/complete evidence is available; the card must keep the limitation visible and must not add unsupported instructions. | 2026-09-03 | Project owner | The primary card remains useful without converting missing pedestrian detail into certainty. |
| D-006 | Above the fold, the card shows origin/destination, service and direction, selected depart-at timing assumption, duration or interval, transfer count, walking/data status, and a short factual reason for the choice. | 2026-09-04 | Project owner | A traveler can understand the primary decision before opening every step or the map. |
| D-007 | The project owner approves the MVP Bahasa Indonesia glossary and status wording: `Halte`, `Arah`, `Pindah`, `Jalan kaki`, `Perkiraan`, `Data terbatas`, `Perlu dicek`, and `Tidak ada rute`. | 2026-09-04 | Project owner | Card, map, search, and recovery copy use one plain-language vocabulary. |
| D-008 | On mobile, the card is the first and authoritative surface in a one-column flow; ordered steps, status, and actions are touch-usable without horizontal scrolling, while the map remains a collapsible companion. | 2026-09-04 | Project owner; see REQ-005 D-008 | Older or in-transit users do not need to interpret or wait for the map to follow the journey. |

## Assumptions (agent-proposed)

- The MVP presents one primary route card; visible alternatives are deferred by the shared product decision recorded as D-003.
- The same status vocabulary can be reused across route, map, and access evidence surfaces.
- REQ-014 supplies access evidence fields, but this item does not own their maintenance lifecycle.

## Next step

The card contract, above-the-fold facts, glossary ownership/wording, and mobile-first layout are resolved by D-006–D-008; the unknown-access behavior is resolved by D-004. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-03 — Decomposition pass

- Added as a separate vertical outcome because route-card copy, ordered steps, and data-status language made the earlier route-selection item too large.
- Kept the card as the primary instruction surface and explicitly separated it from map rendering, route scoring, and evidence maintenance.

### 2026-09-03 — Shared route-presentation decision

- Closed OQ-001 using the existing product decision in `docs/design.md`: the MVP presents one primary route card per scenario, with visible alternatives deferred.

### 2026-09-03 — Unknown pedestrian-data policy

- The project owner approved the card behavior for the current no-data baseline: preserve supported facts, label missing access detail, and never fabricate a walking path or accessibility outcome.
- The card consumes the `no-edge` versus `limited` distinction from REQ-003 rather than deciding transfer connectivity itself.

### 2026-09-03 — Limited-primary fallback

- The project owner approved displaying a selected supported `limited` route as the primary demo card when no stronger/complete candidate exists.
- The card must make the limitation visible and retain only supported transit/access facts.

### 2026-09-04 — Depart-at-only timing decision

- The card consumes the selected local depart-at date/time from REQ-013 and does not present arrive-by or reverse-scheduling language in the MVP.

### 2026-09-04 — No-preference simplicity decision

- The card does not ask the user to choose a preference, slider, or preset; it presents the fixed-policy facts behind the selected route.

### 2026-09-04 — Incomplete-fare display decision

- The card shows a fare amount only when REQ-013 provides a complete source and calculation; otherwise it displays the approved limitation label without a number.

### 2026-09-03 — Evidence-completeness preference

- The card remains presentation-only: when REQ-001 selects a supported `limited` route under the evidence-completeness policy, it displays the limitation and reason without re-ranking the route.

### 2026-09-04 — Card hierarchy and mobile baseline

- The project owner approved the above-the-fold fact set: route endpoints, service/direction, depart-at assumption, duration/interval, transfers, walking/data status, and a short factual reason.
- The project owner approved the shared Bahasa Indonesia glossary/status wording for card, map, search, and recovery surfaces.
- The project owner approved a mobile-first one-column card flow with touch-usable actions, no horizontal scrolling, and a collapsible map companion.
