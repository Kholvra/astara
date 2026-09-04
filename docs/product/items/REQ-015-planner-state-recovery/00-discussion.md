# REQ-015 — Planner State and Recovery — Discussion

## Raw request

Derived from the app-level gap review: the planner needs explicit states and recoverable behavior for empty input, route calculation, no route, stale data, map/provider failure, retry, reset, and editing.

## Context

The product brief describes a planning flow, but the requirement set previously concentrated on data and routing outcomes. Without an explicit state model, loading and failure behavior can become inconsistent and users can lose their selected places or receive silent errors.

## Actor / consumer

Primary actor: a traveler interacting with the Astara planner. Consumers: search, timing controls, route selection, route card, map companion, and runtime error surfaces.

## Problem

External feeds, geocoders, walking providers, and map tiles can fail independently. The app needs to say what happened and let the user recover without guessing whether a route is current or complete.

## Desired outcome

The planner has a documented state machine covering `idle`, `select`, `ready`, `loading`, `result`, `detail`, `no-route`, `error`, `stale-data`, and `map-failure` states. Reset, swap, edit, and one safe retry behave predictably and preserve useful context where possible.

## Known constraints

- The MVP state flow is `idle → select → ready → loading → result → detail`, with explicit `no-route`, `error`, `stale-data`, and `map-failure` branches.
- A failure must be visible and actionable; no dependency may fail silently.
- Retry must be bounded and safe to repeat; the planner must not duplicate a trip or silently change the selected inputs.
- A route card should remain usable when only the map provider fails; stale data must be labeled.
- The planner preserves a selected local depart-at date/time from REQ-013; arrive-by is not a separate MVP state or recovery branch.
- The MVP planner has no user-selectable preference state to preserve; route scoring remains a fixed policy owned by REQ-001.
- Login, saved trips, live navigation, and production analytics implementation are outside this item.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which form values survive a failed calculation or a browser refresh? | Preservation affects recovery effort and privacy expectations. | Project owner (proposed) | Closed — resolved by D-007 |
| OQ-002 | When is stale data still allowed to produce a route? | The data policy must align with the user-visible warning. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-003 | Does retry re-run all providers or only the failed dependency? | This affects latency, rate limits, and consistency. | Project owner (proposed) | Closed — resolved by D-008 |
| OQ-004 | What is the back-button behavior between result, detail, and edited inputs? | Users need a predictable way to revise a plan. | Project owner (proposed) | Closed — resolved by D-006 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Planner state and recovery are separated from route calculation as REQ-015. | 2026-09-03 | Project backlog refinement | Route selection owns route behavior; this item owns user-visible orchestration and recovery. |
| D-002 | One safe retry and a visible last-known-good/stale status are required behaviors to validate. | 2026-09-03 | Project backlog refinement | A transient failure must not erase context or create silent uncertainty. |
| D-003 | For the contest/demo scope, a stale last-known-good snapshot may produce a route when its stale status, snapshot date, and schedule-change note are visible. | 2026-09-03 | User; see REQ-002 D-003 | The planner shows the route with an explicit freshness limitation instead of refusing solely because the snapshot is stale. |
| D-004 | The contest/demo UI needs only a static/demo-data schedule-change note; it does not need to display the snapshot/download date or a separate Fresh/Aging/Stale label. | 2026-09-03 | User; see REQ-002 D-005 | This refines D-003’s presentation detail; the planner still communicates the limitation without claiming current or realtime data. |
| D-005 | Planner recovery preserves the selected local depart-at date/time from REQ-013; arrive-by is out of scope for the MVP state model. | 2026-09-04 | Project owner; see REQ-013 D-003 | Retry, edit, and back behavior operate on one forward-planning timing input. |
| D-006 | Back navigation mirrors the planner flow: `detail → result → select`; editing or swapping inputs returns to `select` while preserving valid origin, destination, and depart-at values, and reset explicitly clears the session. | 2026-09-04 | Project owner | Users can revise a plan without losing context or confusing an old result with a new one. |
| D-007 | During the active session, failures, retry, back, and edit preserve origin, destination, and depart-at input. A browser refresh starts a new session and does not persist raw location or trip history. | 2026-09-04 | Project owner | Recovery is useful without creating persistent personal data. |
| D-008 | Retry re-runs only the failed operation once per user action with the same input and snapshot/configuration. A second failure remains visible and offers edit/reset; no provider or time is switched silently. | 2026-09-04 | Project owner | Retry is bounded, deterministic, and safe for static/demo dependencies. |
| D-009 | The planner is mobile-first: one-column inputs, status, recovery actions, and route-card transitions remain touch-usable without horizontal scrolling; the map-failure branch never removes card access. | 2026-09-04 | Project owner; see REQ-005 D-008 | Users can recover while on a phone or in transit without relying on desktop navigation. |

## Assumptions (agent-proposed)

- State can be represented without login or a persistent trip history.
- Reset clears the active plan intentionally; edit and swap preserve as much valid input as the revised plan allows.
- Provider-specific diagnostics can remain internal while the user receives a plain-language recovery action.

## Next step

State transitions, session persistence, retry scope, browser/back behavior, and mobile recovery are resolved by D-006–D-009; the contest/demo stale-route policy is recorded. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-03 — Decomposition pass

- Added because loading, no-route, stale, provider failure, and recovery behavior were previously implicit across several requirements.
- Kept this item at the app workflow level; it does not define routing algorithms or observability infrastructure.

### 2026-09-03 — State-contract correction

- Canonicalized the stale state as `stale-data` and added the explicit transition contract to the requirement artifact.
- Browser-refresh persistence, stale-route policy, retry scope, and back behavior remain human decisions rather than hidden assumptions.

### 2026-09-03 — Contest/demo stale-data decision

- Closed OQ-002 using the REQ-002 policy: a stale last-known-good snapshot may produce a demo route when the stale status, snapshot date, and schedule-change note are visible.

### 2026-09-03 — Demo-note display clarification

- Clarified that the planner shows only a static/demo-data schedule-change note for the pinned demo result; the snapshot/download date and a separate freshness label are not required in the UI.

### 2026-09-04 — Depart-at-only timing decision

- The planner state model preserves a local depart-at input and does not add an arrive-by branch for the MVP.

### 2026-09-04 — No-preference simplicity decision

- The planner does not persist or recover a user-selected preference because the MVP exposes no preference control.

### 2026-09-04 — Recovery and mobile flow

- The project owner approved preserving origin, destination, and depart-at input during the active session while starting fresh on browser refresh.
- The project owner approved `detail → result → select` back behavior, explicit reset, and one retry of only the failed operation with unchanged inputs.
- The project owner approved a mobile-first one-column recovery flow with touch-usable actions and route-card access during map failure.
