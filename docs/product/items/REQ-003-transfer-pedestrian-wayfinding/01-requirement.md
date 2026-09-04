# REQ-003 — Transfer Connectivity and Confidence — Requirement

## Metadata

```yaml
id: REQ-003
slug: transfer-pedestrian-wayfinding
type: feature
status: ready
priority: high
size: M
depends_on: [REQ-002]
related_to: [REQ-001, REQ-012, REQ-014]
profile: product-app
links: {}
```

## Summary

As a route planner, Astara needs to determine whether a transfer between supported services or platforms is actually connected and how much confidence to assign to that connection, so that route selection does not treat proximity as proof of a usable transfer.

## Actors / consumers

- Primary consumer: REQ-001 route selection.
- Secondary consumers: REQ-012 route card and REQ-005 map companion.
- Evidence providers: official transfer rules, shared station/platform identities, and verified walking-network data.

## Scope

### In scope

- Resolve candidate transfer edges between services, stops, stations, and platforms in the supported network.
- Apply an evidence precedence order: explicit GTFS transfer rules, shared station/platform relationships, then verified walking-graph evidence. Coordinate proximity may produce a non-routable review candidate only; it cannot produce a transfer edge.
- Calculate transfer walking duration where a usable walking path exists, with a documented safety buffer separate from cognitive decision cost.
- Return confidence, evidence source, limitations, and a deterministic failure state for each transfer edge.
- Prevent an invalid or unsupported connection from entering a primary route as if it were confirmed.

### Explicitly out of scope

- Writing user-facing ordered entrance/JPO/lift/crossing/exit instructions; see REQ-012 and REQ-014.
- Maintaining the curated physical-access record lifecycle; see REQ-014.
- Full audit of every stop and pedestrian path in Jakarta.
- Realtime platform changes, ticketing, and accessibility certification.

## Constraints & invariants

- A short straight-line distance is not by itself a valid transfer or routable graph edge.
- Transfer duration must not be conflated with cognitive decision cost.
- For the contest/demo, only explicit GTFS transfer rules, shared station/platform relationships, or verified walking-graph evidence may support a connection. Missing walking detail on a supported connection produces `limited` confidence, not a positive accessibility claim.
- A candidate with no minimum connection evidence, including proximity-only matching, produces `no-edge` and is excluded from route selection.
- `Terverifikasi` requires a named source, a source/snapshot date or observation/review date, and no unresolved contradiction; stale or contradictory evidence is `Perlu dicek` rather than a positive claim.
- A route can use a transfer only when its evidence satisfies the approved route-selection threshold.
- Initial manual verification is limited to hubs and platform relationships represented in approved demo/golden journeys; this is not a full-network audit.
- Walking geometry, if used, follows the source’s coordinate and attribution obligations.
- The MVP has no user-selectable accessibility profile. An explicit barrier may disqualify the affected path, while absent barrier data remains unknown.
- Results are deterministic for the same network snapshot, evidence set, and rule configuration.

## Behavior / rules

1. Receive two candidate service endpoints and the active network snapshot.
2. Check evidence sources in the approved precedence order and retain which source justified the edge.
3. If a walkable path is available, calculate walking distance/time and apply the approved safety buffer; record cognitive decision cost separately.
4. Assign `Terverifikasi`, `limited`, `Perlu dicek`, or `no-edge` according to the approved evidence state and expose `Data terbatas`/`Perlu dicek` where applicable.
5. If no minimum connection evidence exists, including for a proximity-only match, return `no-edge`, exclude it from route selection, and retain the match only as a non-routable review candidate.
6. If approved connection evidence exists but a usable walking path or physical detail is missing, return a `limited` edge with the limitation; it may be consumed by REQ-001 as the primary demo connection when no candidate with stronger/complete evidence is available or when its configured route trade-offs are materially better. Do not invent geometry, instructions, or accessibility status.
7. Return enough identifiers for REQ-001 to reconstruct why the transfer exists, is limited, or was excluded.

## Success

For a supported transfer hub, Astara returns a valid edge with evidence source, confidence, duration components, and limitations. A supported connection with missing physical detail is explicitly limited; an ambiguous or disconnected pair without minimum evidence is deterministically `no-edge` and cannot enter route selection.

## Edge cases

- Explicit transfer conflicts with a proximity-based review candidate.
- Multiple platforms share a station name but are not physically connected.
- No walking route exists, the walking provider fails, or the route crosses a barrier.
- A transfer path is old, contradictory, or missing access metadata.
- A loop or same-stop service can be mistaken for a transfer.

## Decision references

- REQ-003 discussion OQ-001, OQ-002, and OQ-004 are closed by D-006–D-008; OQ-003 is closed by D-003.
- REQ-014 owns physical-access evidence maintenance; this item consumes only the evidence it needs for graph confidence.
