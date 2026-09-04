# Design Contract: Planner State and Recovery

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-015`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Canonical planner states, legal transitions, active-session context, bounded retry, reset/edit/back behavior, stale/map-failure presentation, and mobile recovery
- Owner: Planner orchestration owner; search, timing, route, data, and map domains own their typed outcomes
- Risk: Silent or duplicated failures can lose a rider’s inputs, present stale data as current, or leave a blank screen with no safe next action.
- Existing behavior: Specification/bootstrap phase; no planner state implementation, persistence adapter, or integration tests exist. Current-location privacy remains owned by REQ-004.

## Intent and non-goals

The planner gives every important planning condition an explicit visible state and safe recovery path. It preserves useful active-session context while preventing duplicate retries, hidden input changes, and persistent personal trip history.

It does not implement route/search/map/data algorithms, login, saved trips, persistent history, continuous location, production analytics, backend observability, or provider procurement.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Domain outcomes to planner state | Typed search, timing, data, route, walking, and map outcomes carrying the shared status axes; trusted only through declared outcome contract | Map each outcome to one canonical planner state and required recovery action without collapsing data/evidence/geometry status into planner state | Planner state with active inputs, route/status context, shared status, and state identity | Unknown/untyped outcome enters visible generic error; never blank success |
| TB-02 | User action to state transition | Submit, retry, edit, swap, back, reset, map dismiss/recover; untrusted/replayable events | Validate current state, action eligibility, active-session identity, plan revision, operation identity, attempt number, and retry budget | Accepted state command with transition, preserved context, and operation identity | Illegal, duplicate, or stale event is ignored or reports action unavailable; no unintended transition |
| TB-03 | Session context to persistence boundary | Origin, destination, depart-at, route/status, current-location-derived selection; personal/session data | Preserve only approved logical active-session context; browser refresh starts new session; raw coordinates/history excluded | Session-scoped planner context | Persistence outside policy is rejected; REQ-004 owns raw location retention |
| TB-04 | Map failure to card state | Map/style/tile/geometry failure and recovery signal; provider data is untrusted | Isolate map failure from route/card facts | `map-failure` state retaining result/detail context | Map failure never becomes no-route or removes card instructions |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before applying a state action | Current state, event, and context identity are known and belong to the active session | Planner owner | Reject/ignore illegal event and retain current state; expose action availability if user-facing |
| PRE-02 | Before planning | Origin, destination, and valid local depart-at input are selected; no arrive-by/preference state is required | Search/timing/planner owners | Remain in `select` with correction; do not call route selection |
| PRE-03 | Before retry | A typed retryable failure identifies one failed operation, unchanged inputs/snapshot/configuration, and no retry already consumed for this user action | Planner owner | Do not retry; keep failure visible with edit/reset |

## Command identity and duplicate prevention

- Each planning operation carries a session identity, a monotonically increasing plan revision, a failed-operation identity, and an attempt number. These fields are internal correlation data, not user-facing copy.
- The first accepted submit creates one operation for the current session/revision. Replayed or concurrent submits for that same session/revision while the operation is in flight are ignored and do not invoke the failed operation again.
- An explicit `Retry` is a new user action on the same session/revision and may create exactly one additional attempt. It reuses the same origin, destination, depart-at, snapshot, and configuration. A second failure closes the retry budget.
- `Edit`, `Swap`, and `Reset` advance or invalidate the plan revision. A completion from an older revision or attempt MUST be discarded and MUST NOT overwrite current state or route content.
- The observable duplicate oracle is the number of downstream operation invocations per session/revision: at most one initial attempt plus one explicit retry. State tests also assert that stale completions leave the current revision unchanged.

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Each documented condition renders exactly one canonical planner state with a plain-language reason and next action | Active context/status remains queryable | User can identify what happened and what to do |
| POST-02 | Valid planning transitions `ready → loading → result/detail` occur only after typed route outcome; no-route/data/provider outcomes select their documented branches | Origin, destination, depart-at remain during active session | Route/result request is associated with current inputs |
| POST-03 | Retry runs only the failed operation once per user action using identical inputs/snapshot/configuration; duplicate submits do not create another invocation; second failure stays visible | No duplicate or contradictory route operation/result is accepted | User gets edit/reset after bounded retry |
| POST-04 | Back/edit/swap/reset follow the approved table: back preserves valid context, edit/swap returns to `select`, reset intentionally clears to `idle` | Revised plan is distinguishable from prior result | No stale result is presented as the new plan |
| POST-05 | Stale last-known-good route is usable only under REQ-002 policy with static/demo schedule-change note; unavailable data is explicit | Route/card facts and limitation are retained | Planner does not imply current/realtime data |
| POST-06 | Map failure exposes map-specific status/recovery while route card and known ordered instructions remain available | Result/detail route identity is preserved | Planner may restore result/detail after map recovery/dismissal |
| POST-07 | Active-session failure/retry/back/edit preserves origin, destination, and depart-at; browser refresh starts a new session without raw location/history persistence | Current-location boundary remains REQ-004’s | No persistent trip history is created |
| POST-08 | Mobile state/status/action/card flow stays one-column, touch-usable, and free of horizontal scrolling | Map failure does not remove card | Recovery is usable in primary phone context |
| POST-09 | Each session/revision accepts at most one initial planning attempt and one explicit retry, and stale completions cannot mutate a newer revision | Current state, inputs, and route identity remain tied to the current operation identity | Invocation counts and stale-event outcomes are auditable |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Planner owner | Every state has a visible meaning and actionable next step; canonical states are `idle`, `select`, `ready`, `loading`, `result`, `detail`, `no-route`, `error`, `stale-data`, `map-failure` | Spinner/blank screen represents a failure without state/action |
| INV-02 | Context owner | During an active session, origin, destination, and normalized depart-at survive failure, retry, back, and edit; reset clears intentionally | Retry or error silently loses/changes inputs |
| INV-03 | Retry owner | One retry re-runs only the failed operation once with unchanged inputs/configuration; rendering/double-submit cannot duplicate the invocation | Automatic retry loop, provider/time switch, duplicate operation, or stale completion overwrites current state |
| INV-04 | Navigation owner | `detail → result → select`/edit/swap/reset transitions preserve or clear context exactly as specified; old result is superseded when inputs change | Back or edit silently shows stale result as current |
| INV-05 | Data-trust owner | Shared `freshness`, `coverage`, and `networkAvailability` remain intact when mapped to planner states; stale/demo route shows approved static note; no active snapshot shows unavailable/stale state; no planner state implies current/realtime | Stale route looks current or no-data appears as empty successful network |
| INV-06 | Map owner | `map-failure` isolates map issue and retains route-card facts/instructions | Map failure removes route result or changes route validity |
| INV-07 | Privacy owner | Browser refresh starts a new session and planner does not add raw coordinate/history persistence or preference state | Planner silently creates persistent personal history |
| INV-08 | Command owner | Operation identity, plan revision, and attempt number are checked before accepting action or completion; duplicate in-flight submits are ignored and older completions are discarded | Two attempts mutate one revision, a replay consumes retry budget twice, or an old result replaces an edited plan |
| STATE-01 | Planner owner | `idle → select → ready → loading → result → detail` is the main path; `loading → no-route/error/stale-data`; `result/detail → map-failure`; recovery/edit/back/reset transitions follow the table in REQ-015 | Illegal event advances state, or a failed branch bypasses visible recovery |

## Failure and recovery semantics

- Missing/invalid inputs remain in `select` with a correction path; route selection is not called.
- No-route, no-data, stale, provider, walking, and map failures use distinct visible states where specified, with plain-language reason and edit/retry/recovery action.
- Retry is bounded and proof-by-state: only an explicit user retry for the identified failed operation consumes the one retry. A second failure offers edit/reset without silent alternatives.
- A stale last-known-good result may be shown under REQ-002 contest policy with the static/demo schedule-change note; it is not presented as current/realtime.
- Reset is a deliberate destructive context action within the session; it is not a browser-refresh persistence mechanism. Browser refresh starts fresh and does not store raw location/history.
- Provider-specific diagnostics remain internal; user copy explains the failure and next step without stack traces or GTFS IDs.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-015 owns orchestration/state transitions; REQ-004/013/001/002/005 produce domain outcomes and shared status axes but do not mutate planner state implicitly. | Planner/domain owners | Prevents distributed state machines and hidden recovery. |
| ARCH-02 | Planner stores/propagates logical input/status context only; raw current-location retention remains REQ-004, and no persistent history/login is introduced. | Planner/privacy owners | Preserves explicit privacy boundary. |
| ARCH-03 | Map failure is isolated from route/card data; map renderer does not become the route-state owner. | Map/planner owners | Preserves card-first fallback and map/routing separation. |
| ARCH-04 | Planner/card receives prepared status and route data; browser-facing code does not parse raw GTFS or implement route selection. | UI/core owners | Aligns with architecture guardrails and one-way layers. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Outcome/action fixtures map typed failures, command identity, retry/context, privacy, and map failure without blank success | State/integration tests; planner owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Illegal events, invalid inputs, and duplicate retries are rejected safely | State/property tests; planner owner | AC-02, AC-03, AC-04, AC-05; no tests exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, POST-07, POST-08, POST-09 | State table, recovery actions, command counts, stale-completion handling, stale/map behavior, preservation, reset, and mobile flow match expected scenarios | Component/integration/manual walkthrough; planner + product owners | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no implementation exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08 | Double-submit, timeout, duplicate/replay, stale completion, no-route, no-data, stale, back/edit, refresh/privacy, map outage, and reset cases preserve invariants | State-machine/property suite; planner owner | Constraints, edge cases, AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no fixtures exist | Unverified |
| STATE-01 | Legal/forbidden transitions are exhaustively represented in state tests | State-machine test; planner owner | REQ-015 transition table; no state machine exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03, ARCH-04 | Source/import review separates orchestration, domain providers, privacy, map, and raw data | Architecture/import review; architecture owner | `ARCHITECTURE.md`, AGENTS.md; no source graph exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-015 is `Ready`, priority `high`, size `M`.
- D-003 through D-009 in [`00-discussion.md`](00-discussion.md) are treated as approved, including stale route use, active-session preservation, retry scope, back/edit/reset, browser-refresh privacy, and mobile recovery.

### Deferred or implementation-facing decisions

- Observability/infrastructure recovery and persistent account features remain outside this contract.
- No planner implementation or state tests exist; all verification statuses are `Unverified`.
