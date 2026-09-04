# REQ-015 — Planner State and Recovery — Requirement

## Metadata

```yaml
id: REQ-015
slug: planner-state-recovery
type: feature
status: ready
priority: high
size: M
depends_on: [REQ-001, REQ-002, REQ-004, REQ-005, REQ-013]
related_to: [REQ-012, REQ-016]
profile: product-app
links: {}
```

## Summary

As a traveler planning a journey, I want Astara to show an explicit planner state and give me safe recovery actions when search, routing, data, map, or provider work fails, so that I never have to guess whether my route is current or what to do next.

## Actors / consumers

- Primary actor: traveler interacting with the planner.
- State producers: REQ-004 search, REQ-013 controls, REQ-001 route selection, REQ-005 map, and REQ-002 data status.
- Secondary consumer: REQ-016 user validation.

## Scope

### In scope

- Define the planner states `idle`, `select`, `ready`, `loading`, `result`, `detail`, `no-route`, `error`, `stale-data`, and `map-failure`.
- Define visible transitions for selecting/editing/swapping places, planning, viewing details, returning, resetting, retrying, and recovering from no route.
- Preserve useful input/context through safe failures according to the approved privacy/persistence policy.
- Provide a bounded retry that does not duplicate actions or silently alter selected input.
- Keep route-card content available when the map provider fails and label stale/limited data.
- Provide plain-language, actionable errors for local index, fallback provider, routing, data, walking, and map failures.
- Keep the planner mobile-first: one-column inputs and recovery actions, touch-usable controls, no horizontal scrolling, and route-card access even when the map fails.

### Explicitly out of scope

- Route algorithm, feed validation, search ranking, or map rendering implementation.
- Login, saved trips, persistent trip history, continuous location, or production analytics.
- Backend observability, incident response, and provider procurement.

## Constraints & invariants

- Every non-success state is visible and has an actionable next step; dependency failures are never silent.
- Retry is safe to repeat and must not create duplicate route requests with contradictory active inputs.
- Reset is intentional and distinguishable from retry/edit; edit and swap preserve valid context where policy allows.
- Under the REQ-002 contest/demo policy, a pinned last-known-good snapshot may produce a route with a static/demo-data schedule-change note; the snapshot/download date and a separate freshness label are not required in the UI.
- Map failure does not remove the route card’s known facts and instructions.
- Timing state is the normalized local depart-at input from REQ-013; arrive-by planning is not represented in the MVP state machine.
- No user-selectable preference state is represented in the MVP; recovery preserves the fixed scoring configuration without adding a preference input.
- Current-location retention remains governed by REQ-004; this item does not add storage.
- During an active session, origin, destination, and depart-at input survive failure, retry, back, and edit; browser refresh starts a new session without raw location/history persistence.

## Behavior / rules

### State transitions

| Current state | Trigger | Next state | Observable behavior |
|---|---|---|---|
| `idle` | Planner session opens | `select` | Input selection is available and no route is shown. |
| `select` | Required origin, destination, and timing inputs become valid | `ready` | The plan action is enabled and the selected inputs remain visible. |
| `select` | Input is missing or edited to invalid | `select` | The missing/invalid input and correction path are visible. |
| `ready` | User starts planning | `loading` | Active inputs are preserved and work-in-progress is visible. |
| `loading` | Typed route success | `result` | The primary result is available; details can be opened. |
| `loading` | No valid journey | `no-route` | The reason and edit/retry path are visible. |
| `loading` | Typed route result uses the pinned last-known-good snapshot allowed by the REQ-002 contest/demo policy | `result` | The primary route is available with a static/demo-data schedule-change note; the download date and a separate freshness label are not required in the UI. |
| `loading` | No usable snapshot is available under policy | `stale-data` | The data limitation and allowed recovery path are visible. |
| `loading` | Dependency failure | `error` | A plain-language reason and safe recovery action are visible. |
| `result` | User opens journey details | `detail` | Ordered route instructions are available. |
| `detail` | User returns to the result | `result` | The same route facts remain selected. |
| `result` or `detail` | User edits or swaps inputs | `select` | The prior result is marked as superseded; valid inputs and depart-at value remain visible and can return to `ready`. |
| `result` or `detail` | Map/style/tile/geometry failure | `map-failure` | The route card remains available with the known route facts. |
| `map-failure` | Map recovers or user dismisses the map error | `result` or `detail` | The prior route view is restored without discarding the card. |
| Any active state | User resets the planner | `idle` | Active route and inputs are cleared intentionally. |
| `no-route`, `error`, or `stale-data` | User edits valid inputs | `ready` | The revised plan is distinguishable from the previous outcome. |
| `no-route`, `error`, or `stale-data` | User uses the approved retry action | `loading` | Only the failed operation is retried once for that user action with the same active inputs and snapshot/configuration. |

1. Start a new session in `idle`; move to `select` while inputs are incomplete and `ready` when required inputs are valid.
2. Move to `loading` on a plan request and show which work is in progress without exposing provider internals as user requirements.
3. On success, expose `result` and `detail`; on no valid journey, expose `no-route` with input/retry alternatives.
4. When the pinned last-known-good snapshot is allowed for the contest/demo, expose the route in `result` with a static/demo-data schedule-change note; when no usable snapshot exists, expose `stale-data` with a reason, retained context, and safe action.
5. Treat map-provider failure as `map-failure` while keeping route-card content usable.
6. `Retry` re-executes only the failed operation once per user action with the same active inputs and snapshot/configuration; a second failure remains visible with edit/reset options. `Edit`, `Swap`, and `Reset` produce deterministic transitions and do not silently discard context.
7. Record enough state to make the active route’s snapshot/status and input assumptions visible, without creating persistent personal history.
8. Render inputs, statuses, recovery actions, and card/map transitions in a one-column mobile flow with touch-usable controls and no horizontal scrolling; collapsing or losing the map never removes card instructions.

## Success

For every documented happy path and failure path, the user can identify the current planner state, keep or revise their inputs, retry safely, or return to selection. No error leaves a blank result with no explanation, and map failure does not erase the route card.

## Edge cases

- Double submit, back navigation, stale snapshot during result view, retry after provider timeout, local index unavailable, no route, partial geometry, map outage, invalid timing, and reset after a completed plan.

## Decision references

- REQ-015 discussion OQ-001, OQ-003, and OQ-004 are closed by D-006–D-008; OQ-002 is closed by the REQ-002 contest/demo stale-data policy; mobile recovery follows D-009.
- REQ-004 remains the authority for current-location privacy/permission behavior.
