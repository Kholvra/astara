# REQ-005 — Map Companion Experience — Discussion

## Raw request

Derived from the design direction: provide a responsive map companion that shows transit legs, walking legs, decision points, transfers, and the selected route without making the user infer the instructions from the map alone.

## Context

MapLibre is the selected renderer. The route engine should return route legs and GeoJSON; the browser should not receive raw GTFS CSV or the entire unsimplified shape network as its initial payload.

## Actor / consumer

Primary actor: a user reviewing or following a selected route. Consumers: the route card, map renderer, and route response contract.

## Problem

A large transit geometry payload can slow the experience, and a map without consistent leg semantics can obscure where the user must walk, board, transfer, or exit.

## Desired outcome

The user sees a responsive map synchronized with the route card: transit is visually distinct from walking, numbered decision points correspond to instructions, and the selected route remains usable on low-end devices within measured performance limits.

## Known constraints

- Use MapLibre GL JS with a provider-agnostic style/tile configuration.
- GeoJSON coordinates use `[longitude, latitude]`.
- Transit legs use selected shape geometry; walking legs use walking or curated access geometry.
- The current contest/demo baseline may have no curated walking/access geometry; unknown walking detail is shown as limited and never drawn as a supported path.
- Context network and selected-route geometry must be separated and optimized.
- Basemap, tile, OSM, and provider attribution requirements apply.
- Raw `shapes.txt` must not be sent to the browser as one large GeoJSON payload.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which basemap provider is approved for prototype and public deployment? | Quota, cost, SLA, key handling, and attribution differ. | Project owner (proposed) | Closed for contest demo — resolved by D-004; public deployment remains deferred |
| OQ-002 | What performance budgets define acceptable initial map and route rendering? | The research requires a benchmark but does not set safe numbers. | Project owner (proposed) | Closed — resolved by D-005 |
| OQ-003 | How should loop or ambiguous shape clipping be shown when stop projection is uncertain? | Nearest-point clipping can produce misleading geometry. | Project owner (proposed) | Closed — resolved by D-007 |
| OQ-004 | Is the full network visible by default, or loaded only as context around the selected route? | This changes payload and visual complexity. | Project owner (proposed) | Closed — resolved by D-006 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | MapLibre is the selected renderer. | 2026-09-01 | Project docs | Route rendering is separated from routing and data preparation. |
| D-002 | Solid lines represent TJ legs and dashed lines represent walking legs. | 2026-09-01 | Project docs | Styling and accessibility semantics must preserve this distinction. |
| D-003 | The map consumes REQ-003/REQ-014 status boundaries: render supported transit and walking geometry, but do not draw speculative walking paths. A supported transfer with missing walking detail is shown as limited; a `no-edge` transfer is not rendered as a routable connection. | 2026-09-03 | Project owner | Map status and markers remain synchronized with the card without implying an unverified path. |
| D-004 | For the contest demo, MapLibre consumes one replaceable style/tile configuration supplied through environment or deployment settings; no provider key is hardcoded or required as a product-level dependency. Provider selection for public deployment remains a later operational decision, with attribution and outage fallback required. | 2026-09-04 | Project owner | The demo can use a configured provider without coupling the map contract to a vendor; the route card remains usable if the provider fails. |
| D-005 | The initial mobile performance budget is a usable route card within 2 seconds after a route result, map render within 3 seconds on a low-end mobile baseline, and selected-route GeoJSON no larger than 500 KB compressed. The measurement device and viewport are recorded with the result. | 2026-09-04 | Project owner | Performance is measurable without promising a production SLA; the map can fail independently without hiding route instructions. |
| D-006 | Load selected-route geometry by default and add context only when the active journey needs it; do not load the full unsimplified network as the initial mobile payload. | 2026-09-04 | Project owner | Payload and cognitive load stay bounded while the route remains visually oriented. |
| D-007 | When stop-to-shape projection is ambiguous, do not nearest-point clip a misleading segment. Keep the stop/decision marker and show the affected leg as limited or use only geometry whose relationship is supported; the card remains authoritative. | 2026-09-04 | Project owner | Loops and uncertain shapes cannot create a false path. |
| D-008 | Mobile is the primary layout baseline: one-column, touch-friendly controls, no horizontal scrolling, non-color leg/status cues, keyboard/screen-reader labels, and a map that can be collapsed without blocking card instructions. | 2026-09-04 | Project owner | The app works in the context where riders are likely to use it, while desktop remains a supported secondary layout and no full accessibility certification is implied. |

## Assumptions (agent-proposed)

- Selected-route GeoJSON can remain small enough for an initial demo while context network geometry is deferred or tiled.

## Next step

Provider configuration, performance budgets, context loading, ambiguous-geometry fallback, and mobile-first behavior are resolved by D-004–D-008. Public provider procurement and formal priority/size metadata remain outside this contest decision.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- Map scope was kept as a companion to the route card: leg semantics, decision markers, synchronization, and geometry payload behavior.
- Provider selection and performance budgets were not promoted to invented defaults.
- The rendering contract and acceptance criteria were drafted; provider, budgets, and ambiguous-shape behavior remain open.

### 2026-09-03 — Decomposition pass

- The item is narrowed to the user-facing map companion, step synchronization, and the route-geometry contract it consumes.
- Route-card content moves to REQ-012; input controls move to REQ-013; access evidence maintenance moves to REQ-014.
- Payload and accessibility checks remain part of this map outcome unless later benchmark evidence proves they need a separate spike.

### 2026-09-03 — Unknown pedestrian-data policy

- The project owner approved the map behavior for missing pedestrian evidence: preserve supported route geometry, expose a limitation, and omit any unsupported walking line or routable `no-edge` transfer.

### 2026-09-04 — Mobile-first map boundary

- The project owner approved mobile as the primary layout baseline: route card first, selected-route geometry by default, collapsible map, touch-friendly controls, no horizontal scrolling, and non-color status cues.
- The project owner approved environment-configured MapLibre style/tile settings for the contest demo; a public provider decision remains an operational follow-up.
- The project owner approved the initial route-card, map-render, and selected-route payload budgets, plus the no-misleading-clip fallback for loops and uncertain projections.
