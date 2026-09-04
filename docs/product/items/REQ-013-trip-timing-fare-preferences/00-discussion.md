# REQ-013 — Trip Timing, Fare, and Preference Controls — Discussion

## Raw request

Derived from the time-dependent routing and product-planning gaps: a user needs to choose when the journey starts and understand the time, fare, interval, and preference assumptions behind a recommendation.

## Context

The GTFS feed contains calendars, service times, and frequency-based service. The earlier route-planning item referenced these inputs but did not define the first-user-flow controls or what Astara may promise when fare or schedule data is incomplete.

## Actor / consumer

Primary actor: a traveler planning a trip. Consumers: route selection, route card, and planner state.

## Problem

If date/time semantics are implicit, a route may be valid for the wrong service day. If frequency is shown as an exact departure promise or a fare is presented without complete data, the interface creates false certainty.

## Desired outcome

The user can set a journey time and see the assumptions used by route selection, including interval and fare information when supported. The product communicates limited or estimated values with approved status labels and evidence.

## Known constraints

- The MVP timing mode is depart-at with the default set to “sekarang”; arrive-by and arbitrary scoring sliders are outside the first flow.
- `frequencies.txt` with `exact_times=0` represents a service interval/headway, not an exact departure promise.
- Fare is an estimate only when the required data is complete; payment and ticket purchase are out of scope.
- Internal unknown fare/timing states map to the approved user-facing `Data terbatas` or `Perlu dicek` labels.
- Time input must respect the service timezone, active calendar, after-midnight GTFS times, and no-service conditions.
- Preference labels must describe observable trade-offs such as fewer transfers or shorter walking, not an opaque “AI best” claim.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Is depart-at-only approved for MVP, or is arrive-by required? | This changes the routing input and UI state. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-002 | Which user preference, if any, is exposed in the first release? | A preference changes scoring and explanation behavior. | Project owner (proposed) | Closed — resolved by D-004 |
| OQ-003 | What fare sources and confidence threshold permit an estimate? | The static network feed may not contain a complete fare model. | Project owner (proposed) | Closed for contest demo — resolved by D-005–D-006 |
| OQ-004 | How should a past time, invalid date, or no-service period be corrected? | The planner needs a deterministic recovery path. | Project owner (proposed) | Closed — resolved by D-007 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Time, fare, and preference controls are separated from route selection as REQ-013. | 2026-09-03 | Project backlog refinement | REQ-001 consumes a normalized timing input and fixed scoring configuration rather than owning the controls. |
| D-002 | Frequency data must not be presented as an exact departure promise. | 2026-09-01 | Project docs | The card uses interval language unless an exact scheduled departure is available. |
| D-003 | The MVP uses a local depart-at date/time input, defaulting to “sekarang”; arrive-by planning is out of scope for the MVP. | 2026-09-04 | Project owner | REQ-001, REQ-012, REQ-015, and REQ-016 consume one forward-planning timing mode; no arrival deadline or reverse scheduling is implied. |
| D-004 | The MVP exposes no user-selectable preference or scoring slider; the scorer uses a fixed, explainable policy to keep the planning flow simple, especially for older users. | 2026-09-04 | Project owner | REQ-001 receives no preference choice from the UI; REQ-012 explains the fixed-policy result using observable route facts. |
| D-005 | For the contest/demo, show a fare amount only when its source and calculation are complete; otherwise omit the amount and show `Data terbatas` or `Perlu dicek`. | 2026-09-04 | Project owner | The UI does not invent a fare; D-006 sets the contest default to no numeric fare source. |
| D-006 | The contest/demo has no numeric fare source by default. A fare amount may be enabled later only after a complete, manually curated source and calculation are approved; until then the card shows `Data terbatas` or `Perlu dicek` without an amount. | 2026-09-04 | Project owner | Fare uncertainty cannot block a route or create a fabricated number; fare-provider integration remains deferred. |
| D-007 | For invalid or past departure input, preserve origin/destination and show one primary `Pakai waktu sekarang` correction. For a valid time with no supported service, preserve the inputs and show `Pilih waktu lain`; never shift the time silently. | 2026-09-04 | Project owner | Recovery is deterministic and simple while the selected places remain intact. |
| D-008 | Timing controls are mobile-first: one-column date/time inputs, touch-usable actions, visible selected value, and no horizontal scrolling. | 2026-09-04 | Project owner | Depart-at planning remains usable on a phone without adding arrive-by or preference controls. |

## Assumptions (agent-proposed)

- A fixed, explainable scorer is preferred to exposing a user preference control in the first flow.
- An unavailable fare is preferable to an invented number; an estimated fare should carry its basis and approved status label.

## Next step

Fare display/source boundary, invalid/no-service correction, depart-at-only timing, no user-selectable preference, and mobile timing controls are resolved by D-003–D-008. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-03 — Decomposition pass

- Added to isolate time semantics, fare uncertainty, and preference controls from route candidate selection.
- Recorded depart-at/default-now and no-custom-sliders as a working MVP recommendation, not a final product decision.

### 2026-09-04 — Depart-at-only decision

- The project owner approved a local depart-at date/time input for the MVP, with “sekarang” as the default.
- Arrive-by planning and reverse scheduling are explicitly deferred; remaining timing decisions concern validation and recovery of the depart-at input.

### 2026-09-04 — No-preference simplicity decision

- The project owner approved a fixed scoring policy with no user-selectable preference, slider, or preset in the MVP flow.
- The simplified input is intended to reduce cognitive load for older users; explanations still expose the observable route facts behind the fixed policy.

### 2026-09-04 — Incomplete-fare display decision

- The project owner approved hiding a fare amount when the source or calculation is incomplete and showing `Data terbatas` or `Perlu dicek` instead.
- For the contest demo, no numeric fare source is required; enabling an amount later requires a complete manually curated source and calculation.

### 2026-09-04 — Timing recovery and mobile controls

- The project owner approved preserving origin/destination on invalid, past, or no-service input and using `Pakai waktu sekarang` or `Pilih waktu lain` as the corresponding primary correction.
- The project owner approved one-column, touch-usable mobile date/time controls with no horizontal scrolling.
