# Design Contract: Map Companion Experience

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-005`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Prepared route geometry, MapLibre rendering, card/map synchronization, semantic leg/status display, payload boundary, provider failure, attribution, and mobile budgets
- Owner: Map/UI owner; route geometry remains produced by route/data layers
- Risk: A misleading geometry, oversized payload, or map failure can cause wrong walking/transfer behavior or hide the only usable route instructions on a low-end phone.
- Existing behavior: Specification/bootstrap phase; no browser source, GeoJSON fixtures, MapLibre integration, performance evidence, or tests exist. Active architecture checks include browser raw-GTFS and configurable map-provider rules.

## Intent and non-goals

The map is a synchronized visual companion to one selected route. It renders prepared geometry and decision markers while leaving the route card authoritative and usable without the map.

It does not select/rank routes, parse raw GTFS, curate access evidence, provide continuous navigation/realtime positions, load the full unsimplified network initially, or choose a public provider for deployment.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Route result to map adapter | Selected route identity, leg order, geometry references, markers, and shared status axes; trusted only from REQ-001/003/014 | Check selected-route identity, leg/status alignment, geometry availability, and coordinate order | Prepared selected-route geometry and marker model | Invalid/missing geometry becomes visible limited/map failure; card remains available |
| TB-02 | Geometry source to GeoJSON | Selected transit shapes, supported walking/curated access geometry, optional context geometry; untrusted raw/provider data | Validate GeoJSON structure, `[longitude, latitude]`, continuity/association, `geometryState`, clipping confidence, and payload size | Compact route-specific GeoJSON separated from optional context | Reject invalid/reversed/ambiguous geometry; never draw speculative walking or misleading clipped loops |
| TB-03 | Provider configuration to renderer | Environment/deployment style/tile configuration and attribution requirements; external provider is untrusted | Validate configured URL/style/key/attribution policy without hardcoding a provider | Replaceable MapLibre provider configuration | Missing/provider failure enters map-failure with recovery; no silent provider substitution |
| TB-04 | Map state to card/planner | Render/load/provider errors, focus events, marker selection, and shared status; internal event data | Map translates only visual events/status; it does not change route identity or ranking | Synchronized map/card state | Map failure preserves route-card facts and ordered instructions |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before rendering a route | A selected route result and stable leg/marker identity are available | Route/map boundary | Show no selected-route map state; keep card/result visible |
| PRE-02 | Before accepting geometry | Geometry is prepared for the selected route, valid GeoJSON, and coordinate order is `[longitude, latitude]` | Geometry/data owner | Reject the affected geometry visibly and preserve supported markers/card facts |
| PRE-03 | Before initializing provider | Style/tile configuration and required attribution are supplied through configuration/deployment, not a hardcoded provider assumption | Map/platform owner | Enter provider/configuration failure with actionable recovery |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Selected route, transit/walking legs, and available decision markers render with stable identity and status | Route-card step order remains the source of truth | Map view/focus is available to the user |
| POST-02 | Card step selection focuses the corresponding map leg/marker, and map marker selection identifies the corresponding instruction | Selection stays consistent after scroll/resize | Card/map synchronization events are emitted/consumed |
| POST-03 | Transit and walking/limited/unknown geometry have understandable semantic styling and non-color cues, using the shared `geometryState` and `connectionState` meanings | Status and active step remain legible on small screens | Legend/labels/focus states are available |
| POST-04 | Browser receives selected-route geometry separately from optional context, within the 500 KB compressed selected-route budget; raw `shapes.txt` and the full unsimplified network are not initial payloads | Geometry lineage/status remains attached | Compressed wire-byte measurement records payload scope and encoding |
| POST-05 | Missing/invalid/ambiguous geometry or provider failure shows map-specific status/recovery while retaining route-card access | Known route facts/instructions are not discarded | Planner may enter `map-failure` without becoming no-route |
| POST-06 | Configured map-provider/style attribution is visible for the basemap; OSM attribution is visible for OSM-derived tiles/geometry; route/access data attribution is visible wherever those sources support a displayed claim | Provider remains replaceable and source-specific attribution is not conflated | Attribution source and displayed context are recorded |
| POST-07 | On the approved 360–412px low-end mobile baseline under ordinary mobile network conditions, card readiness is ≤2 seconds and successful selected-route map render is ≤3 seconds from the typed route-result event; provider/geometry failure is recorded separately as `map-failure` | No production SLA is implied by the contest budget | Performance evidence records device, viewport, network condition, measurement marks, and payload encoding |

## Performance measurement contract

- `cardReady` starts when the UI accepts the typed route-result event and ends when endpoints, service/direction, depart-at, duration/interval, transfers, walking/data status, reason, and the first ordered instruction are present in the rendered UI/accessibility tree. Skeleton-only content does not count.
- `mapRender` starts when the UI accepts the same route-result event and ends when the selected-route geometry and available decision markers are rendered with their associated status. A provider/geometry failure is reported as `map-failure`, not counted as a successful render.
- `selectedRoutePayloadBytes` is the compressed wire size of selected-route geometry and required markers, excluding optional context; the evidence records the content encoding and exact included resources.
- Each measurement records the device, viewport width in the approved `360–412px` range, and ordinary mobile network condition. A result without these fields is incomplete performance evidence.

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Geometry owner | All GeoJSON positions are `[longitude, latitude]`; geometry belongs to the selected route/leg it labels | Reversed coordinate order or geometry from an unrelated route is rendered |
| INV-02 | Map owner | Transit uses supported selected shape geometry; walking uses supported walking/curated geometry and retains shared `geometryState`/`connectionState`; unknown/missing walking is not drawn as verified | A speculative walking line or `no-edge`/`review-only` transfer is shown as routable |
| INV-03 | Map/card owner | Card and map share route identity, leg order, decision-marker identity, and shared status axes; map cannot re-rank or change route facts | Focus/viewport changes create a different route or hide ordered instructions |
| INV-04 | Payload owner | Selected-route payload is bounded and context is optional/secondary; raw unsimplified shapes never cross into browser initial payload | Full `shapes.txt`/network is sent to the browser |
| INV-05 | Provider owner | Style/tile configuration is replaceable and attribution is visible; provider failure is isolated from route-card availability | Tile URL/key is hardcoded or provider outage removes the route card |
| INV-06 | Mobile/access owner | One-column mobile flow, touch/focus controls, and non-color status cues remain usable; collapsing map never hides the card | Horizontal scrolling or color-only meaning is required |
| STATE-01 | Map/planner owner | `selected route → loading → rendered/limited`; `loading → map-failure`; `map-failure → result/detail` after recovery/dismissal are legal without changing route identity | Map failure becomes no-route or discards card instructions |

## Failure and recovery semantics

- Invalid/reversed coordinates, missing geometry, unsupported walking detail, ambiguous loop clipping, or partial route geometry produces a visible map limitation and preserves supported markers/card facts.
- A `no-edge` transfer is absent from routable map geometry; a supported transfer with missing physical detail may retain its supported marker/status without an invented walking line.
- Style/tile/provider failure is scoped to the map. The planner/card owns recovery and may retry/dismiss; the map does not fabricate a basemap or alternate route.
- Performance over budget is recorded with device/viewport evidence and does not silently weaken the payload boundary or remove card instructions.
- Attribution/provider procurement decisions remain operational follow-up; this contract requires configuration and visible attribution, not a vendor commitment.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | Map receives prepared route legs/GeoJSON/status only; browser-facing code MUST NOT parse raw GTFS or own route selection. | Map/UI owner | `ARCH-MAP-001` is an active machine-checkable guardrail; route selection remains in REQ-001. |
| ARCH-02 | Basemap/style/tile URL is supplied through configuration/deployment; standard OSM endpoint is not hardcoded in browser code. | Map/platform owner | `ARCH-MAP-002` is an active machine-checkable guardrail. |
| ARCH-03 | Geometry preparation/clipping belongs to data/core; MapLibre renders supplied features, shared status axes, and markers without changing routing decisions. | Data/map owners | Preserves map/routing decoupling; import-graph and geometry semantic checks are deferred. |
| ARCH-04 | REQ-012 remains the authoritative instruction surface; REQ-005 may focus/identify steps but does not duplicate card content ownership. | Map/card owners | Prevents map failure or visual ambiguity from becoming an instruction source. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Route/geometry/provider fixtures validate identity, coordinates, payload, attribution, and isolated failure | Map integration/GeoJSON tests; map owner | AC-01, AC-02, AC-03, AC-04, AC-06, AC-08; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Missing route, invalid geometry, or absent config cannot render a misleading map | Boundary/failure tests; map owner | AC-01, AC-04, AC-06; no tests exist | Unverified |
| POST-01, POST-02, POST-03 | Rendered legs/markers and card/map focus remain synchronized with non-color semantics | Component/accessibility tests; map + card owners | AC-01, AC-02, AC-03, AC-07, AC-09; no implementation exists | Unverified |
| POST-04, POST-05, POST-06, POST-07 | Payload scope/encoding, selected-route separation, attribution, failure handling, and timing marks are measured on the recorded device/viewport/network baseline | Payload/performance/accessibility walkthrough; map owner | AC-04, AC-05, AC-07; no evidence exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Coordinate reversal, loop ambiguity, no-edge, unknown walking, provider outage, and small viewport fixtures preserve boundaries | Geometry/provider/viewport fixtures; map/data owners | AC-02, AC-04, AC-06, AC-08, AC-09; no fixtures exist | Unverified |
| STATE-01 | Map failure/recovery preserves result/detail and card content | Planner/map integration test; REQ-015 owner | AC-06, AC-09; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03, ARCH-04 | Guardrail checker and source review prove raw GTFS/provider hardcoding absence and map/routing separation | Architecture guardrails/import review; architecture owner | `ARCH-MAP-001`, `ARCH-MAP-002`, `ARCHITECTURE.md`; no application source exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-005 is `Ready`, priority `medium`, size `M`.
- D-003 through D-008 in [`00-discussion.md`](00-discussion.md) are treated as approved, including selected-route loading, no-misleading-clip behavior, mobile baseline, provider configuration, attribution, and budgets.

### Deferred or implementation-facing decisions

- Public provider procurement, SLA, and production fallback remain deferred. The renderer must use a replaceable configured provider.
- The measurement marks and payload encoding are now defined; the actual approved device, viewport instance, network run, fixtures, and benchmark evidence remain implementation artifacts, so all statuses are `Unverified`.
