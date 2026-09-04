# REQ-013 — Trip Timing, Fare, and Preference Controls — Requirement

## Metadata

```yaml
id: REQ-013
slug: trip-timing-fare-preferences
type: feature
status: ready
priority: high
size: M
depends_on: [REQ-002]
related_to: [REQ-001, REQ-012, REQ-015]
profile: product-app
links: {}
```

## Summary

As a traveler planning a journey, I want to choose when I depart and understand timing, fare, interval, and preference assumptions, so that the selected route matches my intent without false precision.

## Actors / consumers

- Primary actor: traveler setting planning inputs.
- Consumers: REQ-001 route selection, REQ-012 route card, and REQ-015 planner state.
- Data providers: REQ-002 snapshot plus any approved fare source.

## Scope

### In scope

- Normalize a local date/time and a departure-time planning mode for route selection.
- Provide a default “sekarang”/depart-now input and editable date/time in the proposed MVP baseline.
- Show service interval/headway, exact scheduled departure, estimated duration, and fare state according to available data.
- Keep user-selectable preference controls, sliders, and presets out of the MVP; route selection uses a fixed policy documented by REQ-001.
- Return invalid-time, past-time, no-service, incomplete-fare, and unknown states for planner/card recovery.

### Explicitly out of scope

- Route candidate ranking itself; see REQ-001.
- Ticket purchase, payment, booking, discounts, or fare collection.
- Realtime departure guarantees.
- Arrive-by planning, arbitrary scoring sliders, and a large preference matrix are out of scope for the MVP.

## Constraints & invariants

- Planning uses the service timezone and active calendar from REQ-002.
- GTFS times above `24:00:00` retain their originating service-day meaning.
- `exact_times=0` is shown as an interval/headway, never as a specific departure promise.
- Fare is displayed as an estimate only when the source and calculation are complete; otherwise the amount is omitted and the user-facing status is `Data terbatas` or `Perlu dicek`.
- For the contest demo, no numeric fare source is required; a numeric amount is enabled only after a complete manually curated source and calculation are approved.
- The fixed scoring policy affects route ranking only through documented measurable trade-offs and must be visible in the reason fields.
- No control implies realtime accuracy.
- Date/time controls remain mobile-first, one-column, touch-usable, and free of horizontal scrolling.

## Behavior / rules

1. Initialize the planner with a normalized local depart-at-now value and do not expose an arrive-by mode in the MVP.
2. Allow the user to edit date and time within valid input bounds and preserve the chosen value while recalculating.
3. Validate invalid, past, or no-service inputs and return an actionable correction state: `Pakai waktu sekarang` for invalid/past input or `Pilih waktu lain` when no supported service exists; never shift the requested time silently.
4. Pass the normalized depart-at time to REQ-001; do not pass a user-selected preference in the MVP.
5. Present exact schedule, interval/headway, duration estimate, and a fare amount only when its source and calculation are complete; for the contest demo omit numeric fare by default and show the limited status with its source/status.
6. Keep the fixed scoring policy free of user controls while exposing its observable facts in the explanation; do not expose a preference as active input behavior.

## Success

The route result is calculated for the user’s explicit local departure input without requiring a preference choice, and the card can state whether timing/fare information is exact, estimated, interval-based, or limited. A user can recover from invalid/no-service inputs without losing the selected places.

## Edge cases

- Current time near midnight, after-midnight GTFS service, inactive weekend, past date/time, no service, frequency-only service, incomplete fare data, and equal fixed-policy trade-offs.

## Decision references

- REQ-013 discussion OQ-001 and OQ-002 are closed by D-003/D-004; OQ-003 is closed for the contest demo by D-005–D-006; OQ-004 is closed by D-007; mobile timing controls follow D-008.
