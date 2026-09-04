# REQ-013 — Trip Timing, Fare, and Preference Controls — Acceptance Criteria

Observable criteria for planning inputs and timing/fare status.

## AC-01 — Default departure input

- Given a new planning session
- When the timing control initializes
- Then it contains a normalized local depart-at value representing “sekarang” and clearly shows the date/time that route selection will use.

## AC-02 — Editable date and time

- Given a planning session with selected places
- When the user edits the departure date or time
- Then the normalized value is preserved through recalculation and is included in the route-selection input with the service timezone.

## AC-03 — Invalid and no-service recovery

- Given an invalid/past input, inactive calendar date, or period with no supported service
- When the user attempts to plan
- Then Astara identifies the condition, preserves origin/destination, does not present a valid-looking route for another time, and offers `Pakai waktu sekarang` for invalid/past input or `Pilih waktu lain` for no service.

## AC-04 — Frequency and exact-time honesty

- Given exact scheduled times or `exact_times=0` frequency data
- When timing information is shown
- Then exact departures are labeled as scheduled and frequency data is labeled as an interval/headway, with no exact promise derived from an interval.

## AC-05 — Fare status

- Given complete, partial, or missing fare inputs
- When the route result/card is displayed
- Then a complete calculation is labeled as an estimate with its basis and may show the amount, while incomplete data (including the contest/demo default) omits the amount and is shown as `Data terbatas` or `Perlu dicek`.

## AC-06 — Fixed scoring semantics

- Given the fixed route-selection policy and candidates with measurable trade-offs
- When route selection runs
- Then ranking changes only through documented facts, and the facts behind the fixed policy appear in the recommendation reason; no user-selected preference is applied silently.

## AC-07 — Depart-at-only scope

- Given a planning session in the MVP
- When the timing control is shown and submitted
- Then it accepts a local departure date/time, defaults to “sekarang”, passes that value to route selection, and provides no arrive-by or arrival-deadline mode.

## AC-08 — No user-selectable preference

- Given a new or existing MVP planning session
- When the user reviews or submits planning inputs
- Then the flow requires no preference, slider, or preset choice; route selection uses its fixed documented policy and the resulting explanation remains based on observable route facts.

## AC-09 — Mobile timing controls

- Given a mobile viewport
- When the user sets or corrects the departure date/time
- Then the controls, selected value, validation message, and primary correction action appear in one column, remain touch-usable without horizontal scrolling, and do not add an arrive-by or preference mode.

## Edge cases

- Verify depart-at midnight boundary, GTFS times above `24:00:00`, weekend/inactive service, frequency-only route, no fare, invalid date/time, and equal fixed-policy trade-offs.

## Verifiability

- AC-01–AC-04 and AC-06–AC-08 → normalized input fixtures and route-selection contract assertions.
- AC-05 → fare fixture/status review.
- AC-03 and AC-09 → planner recovery behavior and mobile walkthrough in REQ-015.
