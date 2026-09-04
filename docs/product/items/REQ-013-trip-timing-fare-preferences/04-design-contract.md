# Design Contract: Trip Timing, Fare, and Preference Controls

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-013`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Local depart-at input normalization, service-time semantics, fare status, fixed scoring input, correction behavior, and mobile controls
- Owner: Timing/control owner; route ranking remains owned by REQ-001 and network semantics by REQ-002
- Risk: An implicit or silently shifted time, exact-looking interval, or unsupported fare can produce the wrong route and false confidence about cost or arrival.
- Existing behavior: Specification/bootstrap phase; no timing controls, fare source, clock adapter, or tests exist. REQ-002 owns calendar/frequency semantics; REQ-015 owns recovery orchestration.

## Intent and non-goals

The timing contract gives route selection one explicit local depart-at input and honest timing/fare status. It keeps the first planning flow simple by excluding arrive-by and user-selected preference controls.

It does not rank candidates, process payment/booking, provide realtime guarantees, enable a numeric fare without an approved complete source, or implement a large preference matrix.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | User/date-time control to normalized input | User-entered date/time and default “sekarang”; untrusted | Parse valid local date/time in service timezone, reject invalid/past values per policy, and preserve selected value | Normalized depart-at input with timezone and origin/destination context | Return correction state; do not silently shift the requested time |
| TB-02 | GTFS schedule to timing display | Active calendar, after-midnight times, scheduled departures, frequency rows; trusted only through REQ-002 | Apply active-date/service-day semantics and distinguish exact scheduled time from `exact_times=0` interval/headway | Timing fact carrying shared `timingSemantics` (`exact`, `interval`, `estimate`, or `unavailable`) | Invalid/no-service semantics become explicit status/recovery; interval cannot become exact |
| TB-03 | Fare source/calculation to card | Complete/partial/missing fare data; external/curated source is untrusted | Check source completeness and calculation basis before amount display | Fare status with optional amount only when complete and approved | Omit numeric amount and return `Data terbatas`/`Perlu dicek` |
| TB-04 | Timing controls to route/scoring consumers | Normalized depart-at and fixed scoring configuration; trusted internal output | Ensure no arrive-by or user preference field is introduced in MVP | Stable route-selection input and explainable policy reference | Reject unsupported input shape; do not apply hidden preference |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before initializing/submitting timing | Service timezone and a clock/default-now source are available; user input is parsed into one local depart-at mode | Timing owner | Show input error/recovery; do not submit an implicit or malformed time |
| PRE-02 | Before route selection consumes timing | Active calendar/schedule semantics from REQ-002 and selected origin/destination context are available | Data/timing boundary | Return unavailable/limited status while preserving inputs |
| PRE-03 | Before fare amount display | Fare source and calculation are complete and approved for the contest/product context | Fare owner | Suppress amount and show limitation; fare uncertainty does not block route selection |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | New session initializes a visible normalized local depart-at value representing “sekarang” | Origin/destination context remains available | REQ-001 receives the exact normalized input used |
| POST-02 | Editing date/time preserves the normalized value through recalculation and includes service timezone | Selected places are not discarded | A new route request uses the selected value, not hidden current time |
| POST-03 | Invalid/past input returns `Pakai waktu sekarang`; valid input with no supported service returns `Pilih waktu lain` | Origin/destination and entered timing remain visible | Planner/card gets a recoverable correction state |
| POST-04 | Exact schedule, interval/headway, duration estimate, and unavailable timing use the shared `timingSemantics` values and are labeled according to their source semantics | After-midnight and calendar limitations remain visible | No exact promise is generated from frequency data |
| POST-05 | Complete fare may show a source-based estimate; incomplete/default contest fare omits the amount and shows approved limitation | Fare uncertainty does not alter route validity | Card receives honest fare status |
| POST-06 | Route selection receives fixed-policy facts but no user preference/slider/preset or arrive-by deadline | Policy remains explainable through route facts | REQ-001 can rank deterministically |
| POST-07 | Mobile controls show selected value/status/action in one touch-usable column without horizontal scrolling | Correction does not clear places | UI remains usable on the primary device context |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Timing owner | All submitted planning times are local depart-at values in the service timezone; arrive-by is not an MVP mode | Hidden timezone conversion or arrival-deadline behavior |
| INV-02 | Schedule owner | GTFS times above `24:00:00` retain service-day meaning and active-calendar filtering; `exact_times=0` remains `timingSemantics=interval`/headway | After-midnight value rejected or interval presented as exact departure |
| INV-03 | Fare owner | Numeric fare is shown iff source/calculation is complete and approved; otherwise only limitation status appears | Partial/missing fare becomes a number or route-blocking error |
| INV-04 | Recovery owner | Invalid/past/no-service correction preserves origin/destination and does not silently change the requested time | Input silently shifts to another departure or loses selected places |
| INV-05 | Policy owner | MVP has no user-selectable preference; ranking facts are observable and owned by REQ-001 | A hidden slider/preset changes route ranking |
| INV-06 | Control owner | Displayed selected value is the value passed to route selection and remains stable through recalculation | UI shows one time while engine uses another |
| STATE-01 | Timing/planner owner | `default-now → edited-valid → submitted`; `edited-invalid/past → correction`; `valid-no-service → choose-other-time`; recovery returns to a valid input without changing places | Invalid/no-service state presents a valid-looking route for a different time |

## Failure and recovery semantics

- Invalid syntax, past input, or unavailable timezone produces a plain-language correction; no raw parser error is shown.
- No supported service for a valid time preserves inputs and requests another time; the control does not shift to the next service automatically.
- Fare source failure/incompleteness produces a limited status and cannot block an otherwise valid route.
- Frequency services may provide interval/headway and duration estimates, but never an exact departure or realtime guarantee.
- REQ-015 owns retries/back/reset; timing owns preservation of normalized input and correction labels.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-013 owns input normalization/display semantics; REQ-001 owns ranking and consumes a normalized depart-at input, not UI strings. | Timing/route owners | Keeps control behavior separate from route algorithm. |
| ARCH-02 | REQ-002 owns calendar/frequency truth and the shared `timingSemantics` values; timing controls do not reinterpret GTFS or invent service availability. | Data/timing owners | Preserves one source of schedule semantics; implementation tests required. |
| ARCH-03 | Fare handling is a status/basis boundary, not payment or ticketing; numeric fare source is replaceable and independently approved. | Fare/product owner | Prevents incomplete fare data from becoming a product claim. |
| ARCH-04 | Timing controls and recovery remain UI/service inputs; no browser-facing module parses raw GTFS files. | UI/data owners | Aligns with the repository’s one-way data boundary and raw-feed guardrail. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Input/fare/schedule fixtures show normalized timezone, source semantics, and no unsupported fields | Timing/fare contract tests; timing owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Invalid input, missing schedule, and incomplete fare fail safely without losing context | Boundary/recovery tests; timing + planner owners | AC-03, AC-05, AC-07; no tests exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, POST-07 | Default/edit/correction, timing labels, fare state, fixed policy, and mobile layout match expected outcomes | Component/integration/manual mobile checks; timing owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no implementation exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Midnight, after-midnight, inactive service, interval-only, no fare, equal trade-off, and hidden-preference cases preserve semantics | Fixture/property suite; timing + route owners | Constraints, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08; no fixtures exist | Unverified |
| STATE-01 | Timing states transition visibly and retain places/selected value | Planner/control state test; REQ-015 owner | AC-03, AC-07, AC-09; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03, ARCH-04 | Source review proves timing does not rank routes, duplicate schedule truth, process payment, or parse browser raw GTFS | Architecture/import review; architecture owner | `ARCHITECTURE.md`, REQ-002; no source graph exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-013 is `Ready`, priority `high`, size `M`.
- D-003 through D-008 in [`00-discussion.md`](00-discussion.md) are treated as approved, including depart-at-only, default-now, no preference, fare limitation, corrections, and mobile controls.

### Deferred or implementation-facing decisions

- Numeric fare enablement and its complete curated source remain deferred beyond the contest. No amount may be shown until separately approved.
- Exact validator/clock adapters and UI copy implementation remain to be chosen; no timing/fare tests exist, so all verification statuses are `Unverified`.
