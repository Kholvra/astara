# REQ-005 — Map Companion Experience — Requirement

## Metadata

```yaml
id: REQ-005
slug: map-route-geometry
type: feature
status: ready
priority: medium
size: M
depends_on: [REQ-001]
related_to: [REQ-003, REQ-012, REQ-014, REQ-015, REQ-016]
profile: product-app
links: {}
```

## Summary

As a traveler reviewing a selected journey, I want a responsive map companion synchronized with the route card, so that I can orient myself around transit legs, walking legs, transfers, and decision points without having to infer the instructions from the map alone.

## Actors / consumers

- Primary actor: traveler reviewing or following a selected route.
- Consumers: REQ-001 route result, REQ-012 route card, and REQ-015 planner state.
- External providers: MapLibre-compatible basemap/style/tile provider and approved walking geometry source.

## Scope

### In scope

- Render the selected route and its legs using MapLibre GL JS.
- Keep route-card step selection and map focus/markers synchronized.
- Distinguish transit and walking legs with line style, labels, and non-color semantics.
- Render boarding, transfer, alighting, entrance/exit, and other available decision markers from the route contract/evidence.
- Define a compact GeoJSON/route-geometry contract using `[longitude, latitude]` and separate selected-route geometry from optional context network.
- Support responsive layouts and usable behavior on small screens and low-end devices within approved performance budgets.
- Treat mobile as the primary layout baseline: one column, touch-friendly controls, no horizontal scrolling, route card first, and a collapsible map companion.
- Provide provider/map failure feedback and required basemap, tile, OSM, and data attribution.

### Explicitly out of scope

- Selecting or ranking the journey; see REQ-001.
- Route-card wording and full ordered instructions; see REQ-012.
- Search, time/fare/preference controls; see REQ-004 and REQ-013.
- Curating or reviewing physical-access evidence; see REQ-014.
- Continuous GPS navigation, realtime vehicle position, and a full-network unsimplified payload.

## Constraints & invariants

- MapLibre is the selected renderer; provider/style configuration must remain replaceable.
- Contest/demo style and tile settings come from environment/deployment configuration; no provider key is hardcoded. Public provider procurement is deferred.
- GeoJSON coordinate order is `[longitude, latitude]`.
- Transit legs use selected shape geometry; walking legs use supported walking or curated access geometry and carry their data status. Missing walking geometry is represented as unknown/limited status, not as a speculative line.
- Solid/dashed and other distinctions must remain understandable without color alone.
- The browser must not receive raw `shapes.txt` or the entire unsimplified shape network as one initial payload.
- A map failure must not hide a usable route card.
- Attribution and provider terms must be visible wherever required.
- Initial budgets are a usable route card within 2 seconds after a route result, map render within 3 seconds on the approved low-end mobile baseline, and selected-route GeoJSON no larger than 500 KB compressed; measurements must record device and viewport.

## Behavior / rules

1. When a selected route is available, fit and render its geometry and relevant decision markers.
2. Selecting a route-card step focuses the corresponding map leg/marker; selecting a map marker identifies the corresponding instruction.
3. Apply stable semantic styling for transit, walking, uncertain/limited geometry, and the active step; do not rely only on hue.
4. Load only the geometry needed for the selected route by default and add context only when the active journey needs it, with a measurable payload boundary; never send the full unsimplified network as the initial mobile payload.
5. On missing geometry, invalid coordinates, provider failure, uncertain stop projection, or unsupported device conditions, show a clear map status and retain route-card access. Keep markers where supported, do not nearest-point clip a misleading loop/ambiguous segment, do not draw an unsupported walking path as if it were verified, and do not render a REQ-003 `no-edge` transfer as a routable connection.
6. Keep the mobile card and map in one-column flow with accessible focus order, touch-sized actions, and non-color cues; collapsing the map must not hide route instructions.
7. Record the provider/configuration, target device/viewport, and performance evidence used for acceptance.

## Success

For an accepted route result, the map and card agree on leg order and decision points, the route is readable across target layouts, payloads remain within the approved budget, and users can still follow the card when the map is unavailable.

## Edge cases

- Invalid or reversed coordinate order.
- Loop routes, missing stop projection, disconnected or unknown walking geometry, partial route geometry, and a `no-edge` transfer.
- Long context-network payload, slow tile provider, provider outage, and small viewport.
- Transit and walking legs with similar colors or a user who cannot distinguish color alone.

## Decision references

- REQ-005 discussion OQ-001 through OQ-004 are resolved for the contest demo by D-004–D-007; mobile/accessibility behavior is recorded in D-008, while public provider procurement remains deferred. The pedestrian-geometry status boundary is recorded in D-003.
- User comprehension is validated in REQ-016; routing correctness is benchmarked in REQ-006.
