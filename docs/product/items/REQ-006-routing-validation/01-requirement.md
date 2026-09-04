# REQ-006 — Routing Correctness Benchmark — Requirement

## Metadata

```yaml
id: REQ-006
slug: routing-validation
type: spike
status: ready
priority: high
size: M
depends_on: [REQ-002]
related_to: [REQ-001, REQ-003, REQ-005, REQ-016]
profile: product-app
links: {}
```

## Summary

Astara needs a reproducible routing benchmark over approved golden origin/destination/time cases to decide whether the candidate routing approach produces correct, traceable route facts before the team commits to an engine or claims explainability.

## Actors / consumers

- Primary actor: product/engineering team making the route-engine decision.
- Consumers: REQ-001 route selection, architecture decision record, and later engineering handoff.
- Candidate systems: OTP and a bounded custom candidate engine only if the benchmark requires comparison.

## Scope

### In scope

- Define a reproducible fixture format for golden origin/destination/time inputs and expected route facts.
- Build a minimum of 30 approved cases (expandable to 50) covering direct service, transfers, feeder/Mikrotrans, similar-duration trade-offs, long walking, frequency, after-midnight, weekend, inactive service, loops, duplicate platforms, barriers, no route, and stale data.
- Run OTP first as an oracle/benchmark and compare a custom candidate engine only if approved.
- Assert stop order, direction/headsign, transfer count, timing/calendar behavior, geometry continuity/coordinate order, walking-distance labeling, explanation source fields, and stale/unknown status facts.
- Record reproducible failures, mismatches, limitations, and a recommendation for the engine/contract decision.
- Keep the benchmark independent from human comprehension and map performance release gates.
- Treat the selected demo cases as a critical-fact gate: stop order, service/direction, service-day/time, transfer/no-route, and limitation status must match exactly; the broader set uses the approved fact-level threshold.

### Explicitly out of scope

- Building or productionizing a custom routing engine.
- User sessions, comprehension threshold, accessibility cohort, or usability conclusions; see REQ-016.
- Browser map rendering, tile/payload performance, and device benchmarks; see REQ-005.
- Final route-card copy or production analytics.

## Constraints & invariants

- Expected answers must be approved and traceable; “looks plausible” is not an oracle.
- Cases must include both happy paths and known data limitations.
- The same snapshot ID, time zone, rule configuration, and input should produce comparable output across runs.
- Coordinate order is `[longitude, latitude]`; after-midnight and frequency semantics follow REQ-002.
- A passing benchmark does not certify every route or accessibility condition.
- The spike ends in a decision record and evidence report, not an unbounded engine implementation.

## Behavior / rules

1. Store each fixture with input, snapshot reference, expected facts, tolerance where needed, and case rationale.
2. Execute the benchmark deterministically and capture candidate output plus assertion results.
3. Classify failures by data, transfer inference, time semantics, geometry, scoring/explanation facts, or engine limitation.
4. Compare OTP and any approved alternative on the same fixture set.
5. Apply the approved two-tier threshold (100% critical facts for selected demo cases and at least 90% fact-level correctness for the broader set) and document whether the result supports OTP, a custom approach, or further investigation.
6. Link every conclusion to cases and observed evidence; do not turn a small sample into a universal guarantee.

## Success

The team can replay the approved cases, see exact mismatches and limitations, and make an explicit engine/route-contract decision grounded in evidence. The report clearly separates routing correctness from human comprehension and visual performance.

## Edge cases

- After-midnight service, frequency intervals, stale snapshot, inactive service, no route, loop geometry, duplicate platform, barrier/unknown access, and conflicting transfer evidence.
- Candidate engine returns a route with correct stops but incorrect direction, timing, geometry, or explanation lineage.

## Decision references

- REQ-006 discussion OQ-001 and OQ-002 are closed by D-003–D-004; OQ-003 is owned by REQ-016 and OQ-004 by REQ-005. D-005 defines the benchmark threshold and D-006 defines ownership/boundaries.
