# REQ-001 — TJ Route Selection — Requirement

## Metadata

```yaml
id: REQ-001
slug: explainable-tj-journey
type: feature
status: ready
priority: high
size: L
depends_on: [REQ-002, REQ-003, REQ-004, REQ-013]
related_to: [REQ-006, REQ-012, REQ-015]
profile: product-app
links: {}
```

## Summary

As a person who is unfamiliar with TransJakarta, I want Astara to select one primary journey from my resolved origin, destination, and timing preferences, so that I have a route result whose facts and recommendation reason can be checked.

## Actors / consumers

- Primary actor: traveler planning a regular TransJakarta journey.
- Consumers: REQ-012 route card, REQ-005 map companion, and REQ-015 planner state.
- Upstream providers: REQ-002 network snapshot, REQ-003 transfer graph, REQ-004 resolved locations, and REQ-013 normalized timing/fare/preference input.

## Scope

### In scope

- Generate candidate journeys over the modeled regular TransJakarta network.
- Apply active service-calendar, scheduled-time, after-midnight, and frequency semantics for the requested planning time.
- Calculate route facts including ordered legs, boarding and alighting stops, direction/headsign where available, transfers, walking segments, duration, and data-status references.
- Rank candidates with documented facts and the fixed scoring policy, then return one primary route and machine-readable reason fields.
- Return an explicit no-route or unsupported-data outcome when the input cannot produce a trustworthy journey.
- Preserve source/snapshot lineage needed by downstream surfaces to explain freshness and evidence.

### Explicitly out of scope

- Bahasa Indonesia route-card copy and ordered presentation details; see REQ-012.
- Curation or maintenance of entrance, JPO, lift, crossing, sidewalk, and other physical-access evidence; see REQ-014.
- Map rendering, GeoJSON payload optimization, and visual accessibility; see REQ-005.
- Planner loading/error/reset state orchestration; see REQ-015.
- Human comprehension research; see REQ-016.
- Realtime service updates, payment, booking, and live navigation.

## Constraints & invariants

- The MVP route universe is the regular TransJakarta network represented by the approved data snapshot; MRT, KRL, and LRT are not silently added.
- Active calendar dates determine service availability. GTFS times above `24:00:00` remain on the originating service day.
- Frequency-based service with `exact_times=0` is an interval/headway fact, not an exact departure promise.
- The MVP timing input is a local depart-at date/time from REQ-013; arrive-by or reverse-scheduled arrival planning is not implied.
- Route facts and scoring configuration are separate fields. The MVP has no user-selected preference; fixed scoring may rank only on facts present in the route result.
- The MVP has no user-selectable preference input; ranking uses a fixed policy and returns the observable facts used by that policy.
- The fixed ranking order is valid/routable service, fewer transfers and decision points, less supported walking, shorter expected duration, stronger evidence when earlier trade-offs are comparable, then a stable route-ID tie-break.
- A route explanation must be reconstructable from returned facts and scorer fields; hardcoded reasons are not sufficient.
- Missing or stale evidence is surfaced as a status and cannot be upgraded to a positive claim by the scorer.
- Transfer states from REQ-003 are preserved: `no-edge` is excluded from candidates, while a supported connection with missing walking detail remains `limited` and is subject to the approved recommendation threshold.
- Evidence completeness is a ranking preference rather than an absolute gate: prefer complete evidence when configured route trade-offs are comparable, and allow a supported `limited` candidate only when it is materially better or the only viable candidate.
- A candidate route is not a safety or accessibility guarantee.

## Behavior / rules

1. Accept only resolved, routable origin and destination references plus a normalized planning input.
2. Build candidates from the published snapshot and transfer behavior; exclude `no-edge` transfers and do not use an unrelated provider as an untracked fallback.
3. Evaluate service availability for the requested local date and time, including after-midnight service-day semantics.
4. For each candidate, return its observable facts and the evidence/freshness references used to calculate them; no user preference field is required in the MVP input.
5. Select a primary route using the fixed lexicographic policy: valid/routable service, fewer transfers and decision points, less supported walking, shorter expected duration, stronger evidence when earlier trade-offs are comparable, then a stable route-ID tie-break. A supported `limited` candidate may be selected when it wins an earlier criterion or is the only viable candidate. The MVP must return the reason fields needed for REQ-012 even if alternative-route presentation is not enabled.
6. If no candidate meets the approved evidence and validity rules, return a typed no-route or limited-data outcome with a recoverable explanation. A selected `limited` candidate must retain its limitation in the route result rather than being upgraded to a confirmed access claim.
7. Keep the result deterministic for identical snapshot, input, and scoring configuration.

## Success

An approved golden-case input produces a primary route whose stop order, direction, transfers, walking segments, timing semantics, source status, and recommendation reason agree with the configured route facts. When the primary route is `limited`, that status is preserved and explained. An unsupported or unavailable case produces an explicit non-success outcome instead of a plausible-looking invented route.

## Edge cases

- A service crosses midnight using GTFS times greater than `24:00:00`.
- A frequency-based service has no exact departure to promise.
- Duplicate platforms or loop routes can change the valid boarding/alighting choice.
- Two candidates trade transfer count, walking, and duration; the result must expose the approved tie-break or leave the decision visible.
- The snapshot is aging, stale, invalid, or unavailable.

## Decision references

- REQ-001 discussion OQ-002 and OQ-003 are closed by D-010–D-011; the depart-at timing contract is recorded in D-008, the REQ-003 `no-edge` versus `limited` transfer policy and evidence-completeness preference are recorded in D-005–D-007, and OQ-001 is closed by the one-primary-route product decision.
- REQ-006 is a validation/engine decision gate, not a runtime prerequisite for constructing the requirement contract.
