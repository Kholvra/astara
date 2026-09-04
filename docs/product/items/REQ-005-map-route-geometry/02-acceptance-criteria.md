# REQ-005 — Map Companion Experience — Acceptance Criteria

Observable criteria for map rendering and route-geometry behavior.

## AC-01 — Selected route rendering

- Given a successful route result with supported geometry
- When the map companion opens
- Then it renders the selected route, its transit/walking legs, and available decision markers using the route contract without requiring raw feed files in the browser.

## AC-02 — Leg and status semantics

- Given transit, walking, or limited/unknown geometry
- When the route is displayed
- Then the visual and textual treatment distinguishes the leg/status through more than color alone, including a legend or labels that remain available on small screens; unknown walking geometry is not drawn as a supported path.

## AC-03 — Card/map synchronization

- Given a route card step or map decision marker
- When the user selects it
- Then the corresponding leg/marker is focused and identified on both surfaces, and the selected step remains consistent after scrolling or viewport changes.

## AC-04 — Geometry contract and payload boundary

- Given a route response with transit and walking geometry
- When the browser receives map data
- Then coordinates use `[longitude, latitude]`, selected-route geometry is separable from optional context, invalid geometry is rejected visibly, and raw `shapes.txt`/the entire unsimplified network is not sent as one initial payload.

## AC-05 — Responsive and low-end behavior

- Given an approved target viewport and low-end device profile
- When the selected route is loaded and resized
- Then the mobile one-column layout remains usable, the route card is usable within 2 seconds after the route result, the map renders within 3 seconds, selected-route GeoJSON is no larger than 500 KB compressed, and device/viewport measurements are recorded against those budgets.

## AC-06 — Map/provider failure recovery

- Given missing geometry, invalid coordinates, tile/style failure, or provider unavailability
- When the map attempts to render
- Then Astara shows a visible map-specific status and recovery action while retaining the route card and its ordered instructions; a missing walking path or `no-edge` transfer is not rendered as a verified connection.

## AC-07 — Attribution and non-color access

- Given a map or walking geometry provider with attribution requirements
- When the map is visible
- Then required attribution is visible, and keyboard/screen-reader or non-color cues identify active legs, markers, and limited-data states to the extent approved for MVP.

## AC-08 — Unknown walking geometry boundary

- Given a supported route with missing walking geometry or a supported transfer whose physical path is not verified
- When the map companion renders
- Then supported transit geometry and available decision markers remain visible, the affected leg/transfer carries a limited status, and no speculative walking line or `no-edge` transfer is drawn as routable.

## AC-09 — Mobile-first map/card flow

- Given a mobile viewport and a selected route
- When the user opens, collapses, expands, or scrolls the map companion
- Then the route card remains the first and authoritative instruction surface, controls and markers are touch-usable without horizontal scrolling, non-color cues identify leg/status, and collapsing the map does not hide the ordered instructions.

## Edge cases

- Verify coordinate-order fixture, loop/ambiguous clipping, partial geometry, provider timeout, small viewport, long context payload, and color-independent leg identification.

## Verifiability

- AC-01–AC-04 → route-fixture rendering and payload/geometry contract checks.
- AC-05 → device/viewport performance evidence against the D-005 budgets.
- AC-06–AC-09 → failure-state, accessibility review, and attribution checklist.
