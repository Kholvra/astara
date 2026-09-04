# REQ-015 — Planner State and Recovery — Acceptance Criteria

Observable criteria for planner states and recovery behavior.

## AC-01 — Explicit state model

- Given an `idle`, `select`, `ready`, `loading`, `result`, `detail`, `no-route`, `stale-data`, `error`, or `map-failure` condition
- When the planner renders
- Then it exposes exactly the corresponding documented state and a user-visible next action; no condition is represented only by a spinner or blank screen.

## AC-02 — Valid planning transition

- Given the user has selected valid origin, destination, and a valid local depart-at date/time
- When the user starts planning
- Then the planner transitions from `ready` to `loading`, preserves the active inputs, and transitions to `result`/`detail` only after a typed route outcome is available.

## AC-03 — No-route and dependency failure

- Given route selection returns no route, no usable data snapshot is available under policy, or a search/walking provider fails
- When the operation completes
- Then the planner shows the relevant `no-route`, `stale-data`, or `error` state with a plain-language reason and actionable edit/retry/recovery path.

## AC-04 — Safe retry and duplicate prevention

- Given a transient calculation or provider failure
- When the user selects retry once
- Then only the failed operation is re-run once with the same active inputs and snapshot/configuration, the request is not duplicated by repeated rendering/double-submit, and the result status is updated visibly.

## AC-05 — Edit, swap, reset, and back behavior

- Given a result or detail view
- When the user edits an input, swaps origin/destination, presses back, or resets
- Then the planner follows the approved transition table, preserves valid context where allowed, and clearly distinguishes a revised plan from the previous result.

## AC-06 — Map failure does not erase route instructions

- Given a valid route card and a map/style/tile/geometry failure
- When the map fails
- Then the planner enters `map-failure`, shows a recovery action, and keeps the route card’s known facts and ordered instructions available.

## AC-07 — Stale and privacy-aware session behavior

- Given an active route whose snapshot becomes stale or a session containing current-location input
- When the planner renders or recovers
- Then the applicable static/demo-data or stale limitation note is visible, and the state machine does not create persistent raw location/history data beyond the approved REQ-004 session boundary.

## AC-08 — Allowed stale demo result

- Given a last-known-good snapshot is beyond the configured stale threshold and the contest/demo policy allows its use
- When planning returns a route
- Then the planner shows the route in `result` with a static/demo-data schedule-change note, without implying current or realtime data; the download date and a separate freshness label are not required in the UI.

## AC-09 — Mobile recovery flow

- Given a mobile viewport and any planner state, including map failure
- When the user edits, retries, goes back, or resets
- Then the state, status, primary recovery action, and route-card content remain available in one column without horizontal scrolling, and map failure does not remove the ordered instructions.

## Edge cases

- Verify double submit, browser/back behavior, retry after timeout, no-service input, first-run no-data, stale result, partial geometry, map outage, and reset.

## Verifiability

- AC-01–AC-09 → state-transition table, component/integration scenarios, and manual recovery walkthroughs.
- Current-location privacy → REQ-004 session review.
- Human recovery comprehension → REQ-016.
