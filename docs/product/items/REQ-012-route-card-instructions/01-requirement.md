# REQ-012 — Route Card and Journey Instructions — Requirement

## Metadata

```yaml
id: REQ-012
slug: route-card-instructions
type: feature
status: ready
priority: high
size: M
depends_on: [REQ-001, REQ-003, REQ-014]
related_to: [REQ-005, REQ-013, REQ-015, REQ-016]
profile: product-app
links: {}
```

## Summary

As a traveler who may not know TransJakarta, I want a Bahasa Indonesia route card with a concise summary, an explanation, ordered actions, and visible data status, so that I can follow the selected journey without decoding a map or trusting unsupported claims.

## Actors / consumers

- Primary actor: traveler reading a selected journey.
- Producer: REQ-001 route result, including timing/fare fields derived from REQ-013; REQ-003 transfer confidence and REQ-014 curated access evidence supply related status fields.
- Companion/owner: REQ-005 map and REQ-015 planner state.

## Scope

### In scope

- Present one primary route result as a concise summary with duration/time assumptions, transfer count, walking components, and fare/interval status when available.
- Present the reason for the recommendation using traceable facts and explicit preference effects.
- Render ordered instructions for origin walk, boarding stop and direction, transit legs, transfers, alighting, exit/access decisions, and final walk when the source supports them.
- Map internal `Unknown` evidence to the approved user-facing `Data terbatas` or `Perlu dicek` label; show `Terverifikasi` and explicit barrier states only when supported by the evidence contract.
- Use an approved Bahasa Indonesia glossary and distinguish facts from recommendations or estimates.
- Keep the card usable when map geometry is missing or the map provider fails.

### Explicitly out of scope

- Selecting/ranking routes; see REQ-001.
- Maintaining access evidence; see REQ-014.
- Map rendering; see REQ-005.
- Live turn-by-turn navigation, realtime disruption copy, ticket purchase, payment, and saved trips.

## Constraints & invariants

- The card is the authoritative instruction surface for the MVP; map interpretation is never required to discover the basic journey sequence.
- Every displayed route fact, estimate, status, and recommendation reason must map to a source field or an approved calculation.
- Interval/headway data is described as an interval, not as an exact departure promise.
- The MVP card reflects the selected local depart-at date/time from REQ-013; it does not present an arrive-by deadline.
- The MVP card does not present user-selectable preference controls; it explains the fixed route-selection policy through returned facts and trade-offs.
- The card shows a fare amount only when REQ-013 marks the source and calculation complete; otherwise it shows `Data terbatas` or `Perlu dicek` without a numeric fare.
- On mobile, the card is the first and authoritative surface in a one-column flow; its steps, status, and actions remain touch-usable without horizontal scrolling, while the map is a collapsible companion.
- Unknown or missing access evidence remains internally unknown and user-facing as an approved limitation label; absence of a recorded barrier does not become an accessibility guarantee.
- Bahasa Indonesia terms must be consistent across card, map labels, errors, and status messages.
- The card must not state more certainty than the snapshot, transfer evidence, or access record supports.

## Behavior / rules

1. Consume a successful route result and render a primary summary before detailed steps.
2. Show the recommendation reason as facts/trade-offs that can be traced back to REQ-001 output; never use an unexplained “AI chose this” label.
3. Order instructions by journey sequence and include only details supported by the route/evidence contract.
4. Mark estimates, intervals, stale data, missing evidence, and barriers with the approved status language.
5. When a direct route has unknown origin/final-walk detail, keep the supported route and step but mark the limitation with `Data terbatas` or `Perlu dicek`; do not invent a path or accessibility outcome.
6. When a supported transfer has missing physical detail, keep the transfer step with a limited status and no fabricated geometry or wayfinding instruction, including when REQ-001 selects it as the primary demo route under its evidence-completeness policy. When REQ-003 returns `no-edge`, do not render that connection as a route step.
7. On no-route, stale, or incomplete results, show the appropriate recovery/status state from REQ-015 while preserving known facts.
8. Use the approved glossary (`Halte`, `Arah`, `Pindah`, `Jalan kaki`, `Perkiraan`, `Data terbatas`, `Perlu dicek`, `Tidak ada rute`) consistently across the card and related surfaces.

## Success

A traveler can read the primary card and state the route’s service/direction, boarding and alighting points, transfers, timing assumptions, and key uncertainty without relying on map interpretation. The card does not contain a claim that cannot be traced to route or evidence data.

## Edge cases

- Direct trip with unknown origin/final walk versus a multi-transfer journey.
- Frequency interval, estimated fare, stale snapshot, unknown access evidence, explicit barrier, missing geometry, and no route.
- Supported transfer with missing walking detail versus a `no-edge` proximity-only transfer.
- Duplicate or ambiguous platform requiring confirmation.
- A long route whose steps must remain ordered and scannable on a small screen.

## Decision references

- REQ-012 discussion OQ-002 and OQ-003 are closed by D-006–D-008; OQ-004 is closed by D-004/D-005, the timing mode follows REQ-013 D-003, the no-preference scope follows REQ-013 D-004, the incomplete-fare display follows REQ-013 D-005, and OQ-001 is closed by the one-primary-card product decision.
