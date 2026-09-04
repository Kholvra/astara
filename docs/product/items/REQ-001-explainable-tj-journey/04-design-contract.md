# Design Contract: TJ Route Selection

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-001`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Candidate journey generation, eligibility, fixed lexicographic ranking, route-fact output, explanation fields, and no-route/limited outcomes
- Owner: Route-engine owner; product policy decisions remain owned by the project owner
- Risk: A plausible but invalid route can send a traveler to the wrong service, direction, stop, transfer, or walking decision while hiding uncertainty.
- Existing behavior: Specification/bootstrap phase; no route-engine source, types, fixtures, or tests exist. Upstream data semantics are defined by the REQ-002 contract; transfer evidence is owned by REQ-003.

## Intent and non-goals

The route engine returns one primary journey over the approved regular TransJakarta network. Its result must expose enough factual material for downstream card, map, and planner surfaces to explain the selection and its limitations.

This contract does not define route-card wording, map rendering, access-evidence curation, search ranking, timing-control UI, realtime, payment, booking, live navigation, or a user-selected preference model. Alternative-route presentation is deferred.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Search/timing/data providers to route engine | Resolved locations, normalized depart-at input, active snapshot, transfer graph, and scoring configuration; trusted only after upstream contracts | Check stable routable identities, snapshot availability/lineage, timing shape, and transfer statuses before candidate generation | Validated planning request with explicit source/configuration references | Reject the request as typed invalid/unavailable input; do not infer a place, time, snapshot, or transfer |
| TB-02 | Network graph to candidate/scorer | Supported regular TJ services, schedule semantics, route legs, transfer edges, walking facts, and shared status axes | Generate only supported candidates; admit a transfer only when `connectionState=routable`; exclude `no-edge` and `review-only`; preserve `limited`, stale, unknown, and interval states | Candidate route facts with ordered legs, measurable components, lineage, and eligibility status | Drop an ineligible candidate from ranking or return a limited/no-route outcome; never upgrade missing facts |
| TB-03 | Route result to card/map/planner | Primary route identity, leg facts, reasons, timing, geometry references, evidence, and status | Expose a stable consumer contract without consumer-side re-ranking or claim upgrades | One primary route result or typed no-route/limited result | Consumers receive an explicit non-success state when no trustworthy route exists; no plausible placeholder route |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before candidate generation | Origin and destination are resolved to supported routable identities, and the request contains a normalized local depart-at input | Search/timing boundary | Return a typed input error and preserve the caller’s inputs; do not route arbitrary coordinates or an implicit time |
| PRE-02 | Before service evaluation | An approved active snapshot and transfer graph are available, with source/lineage and calendar/frequency semantics accessible | Data/route boundary | Return explicit unavailable or limited data; do not switch to an untracked provider |
| PRE-03 | Before ranking | The fixed scoring policy and stable route-ID tie-break are explicit, and no user preference is present in the MVP request | Route-engine owner | Refuse to rank under an incomplete/ambiguous policy; do not invent weights or use iteration order as a tie-break |

## Candidate eligibility and total ranking key

A candidate is eligible only when its origin/destination identities, service, timing, and every transfer satisfy the upstream contracts. A transfer with `connectionState=no-edge` or `connectionState=review-only` is excluded. In particular, `evidenceState=Perlu dicek` maps to `connectionState=review-only` and cannot enter route selection. A supported `limited` transfer may remain eligible when its required route facts are present and its limitation is retained.

Every eligible candidate receives a total, deterministic key in this order:

1. `transferCount` ascending.
2. `decisionPointCount` ascending.
3. `walkingDistanceKey`: finite total validated walking meters ascending; if any required walking distance is unavailable, use the explicit `unknown` sentinel, which sorts after every finite value and never acts as zero.
4. `expectedDurationKey`: finite expected seconds ascending when the timing semantics support an estimate; otherwise use the explicit `unknown` sentinel, which sorts after every finite value and never becomes an exact departure promise.
5. `evidenceRank` descending: `complete` before `limited` before `unknown`.
6. `routeId` in stable ordinal byte order as the final tie-break.

The eligibility gate is the first validity criterion; the remaining keys are compared only among eligible candidates. The source phrase “materially better” is therefore operationalized as a supported `limited` candidate winning the first differing key before `evidenceRank`, or being the only eligible candidate. There is no separate subjective or numeric threshold.

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Every candidate considered for ranking has an ordered leg list with available service, direction/headsign, boarding/alighting, transfer, walking, duration, timing, evidence, and lineage facts | Snapshot ID, source status, interval semantics, and limitations remain attached | Candidate facts are available to the scorer and downstream validation |
| POST-02 | Service eligibility uses the requested local date/time, active calendar, after-midnight service-day values, and frequency interval semantics | A frequency interval is never converted to an exact departure promise | No route is returned for inactive or unsupported service |
| POST-03 | Exactly one primary route is selected from eligible candidates using the total ranking key and stable tie-break; reason fields identify the first deciding key and outcome | `limited` status and evidence trade-offs remain in the selected result | Card/map/planner consumers receive a stable primary identity |
| POST-04 | A no-route, unsupported, or ineligible-candidate case returns a typed recoverable no-route or limited-data outcome with reason and input action | Original request and known source/status facts remain available to recovery | No fabricated route or silently substituted provider is emitted |
| POST-05 | Repeated selection with identical snapshot, input, and scoring configuration returns the same route identity, leg order, facts, statuses, and reason fields | Downstream consumers see the same geometry/timing/evidence references | Deterministic output is available for golden validation |
| POST-06 | The comparator produces one total order for every eligible candidate, including missing walking/duration values, and the final route-ID tie-break resolves equal keys | Unknown values remain explicitly unknown and do not become zero or an accessibility claim | Candidate iteration order cannot change the selected route |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Candidate builder | Only the approved regular TJ network is eligible; every transfer has `connectionState=routable` from REQ-003, and a selected `limited` connection retains its limitation | MRT/KRL/LRT, proximity-only, `no-edge`, or `review-only` connections silently enter the route; missing access becomes a positive claim |
| INV-02 | Scoring owner | Every eligible candidate is ordered by `transferCount`, `decisionPointCount`, `walkingDistanceKey`, `expectedDurationKey`, `evidenceRank`, then stable ordinal `routeId`, with explicit unknown sentinels | A hidden numeric penalty, subjective “materially better” judgment, user preference, candidate iteration order, or unexplained criterion changes the result |
| INV-03 | Explanation owner | Every reason field is reconstructable from returned route facts and approved scoring fields; facts, estimates, and limitations remain distinguishable | A hardcoded “AI chose this” explanation or a claim absent from the route result |
| INV-04 | Route-result owner | A successful result is either a supported complete route or a supported limited route; it is never an accessibility/safety guarantee | Missing, stale, or unknown evidence is upgraded by the scorer |
| INV-05 | Lineage owner | The route result identifies the snapshot/source and preserves the same status fields used by downstream card/map surfaces | Consumer surfaces receive contradictory route identity, timing, geometry, or evidence status |
| STATE-01 | Route-result owner | `request → candidate evaluation → primary result`, `request → no-route`, and `request → limited result` are legal outcomes; a limited primary is legal only when it wins the first differing pre-evidence key or is the only eligible candidate | A partial candidate is presented as successful without status, or a no-route is represented as an empty successful route |
| LOOP-01 | Candidate scorer | Before each finite candidate iteration, the accumulator is the best eligible candidate seen so far under the total ranking key; each iteration consumes one candidate; on exhaustion the accumulator is the primary result or empty means no-route | Non-terminating candidate generation, empty-input dereference, or a result dependent on candidate input order after the stable tie-break |

## Failure and recovery semantics

- Invalid or unresolved origin/destination, missing timing, unavailable snapshot, or invalid transfer input fails at the boundary with a typed outcome; the engine does not guess.
- An inactive service, `no-edge`/`review-only` transfer, unsupported mode, or candidate that fails the eligibility gate is excluded or returned as an explicit limited/no-route outcome.
- A supported `limited` candidate may be primary only when it wins the first differing pre-evidence ranking key or is the only eligible candidate; its status and reason remain visible. Unknown walking/duration values never become zero or a positive claim.
- Stale static data may be used only under REQ-002/REQ-015 policy and must retain the static/demo-data schedule-change note; it is not current or realtime data.
- A ranking or candidate failure must not partially publish a route. The caller owns correction/retry orchestration; route selection remains deterministic for the same inputs.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | Route selection consumes normalized data, resolved locations, transfer edges, and timing input; it does not download/parse raw GTFS, curate access evidence, or render UI/map output. | Route-engine owner | Preserves the one-way UI → service/engine → data/core flow; dependency checking is deferred until source modules exist. |
| ARCH-02 | REQ-001 owns ranking and primary-route identity. REQ-012, REQ-005, and REQ-015 consume the result and MUST NOT re-rank or reinterpret its route facts. | Route-engine/downstream owners | Prevents divergent route identity and explanation behavior; requires cross-surface contract tests. |
| ARCH-03 | Transfer eligibility comes from REQ-003’s `connectionState`, shared status meanings come from REQ-002, and data lineage comes from REQ-002; route selection cannot create proximity-only/review-only edges or silently replace the active snapshot. | Core/data owners | Enforces the approved trust boundaries; semantic checker does not yet exist. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01 | Invalid/unresolved inputs cannot enter candidate generation | Route-input contract test; route owner | AC-06, AC-10; no implementation exists | Unverified |
| TB-02 | Candidate fixtures include supported services, transfer states, timing semantics, and preserved statuses | Golden route fixture; core owner | AC-01, AC-02, AC-03, AC-08, AC-09; no fixtures exist | Unverified |
| TB-03 | Card/map/planner receive identical route identity, legs, references, and status | Cross-surface contract test; route + consumers | AC-05; no consumers exist | Unverified |
| PRE-01, PRE-02, PRE-03 | Preconditions reject missing identity/data/policy without guessing | Boundary/property tests; route owner | AC-06, AC-10; no implementation exists | Unverified |
| POST-01, POST-02 | Golden cases assert leg facts, calendar, after-midnight, frequency, and no exact interval promise | Golden-case oracle; REQ-006 owner | AC-01, AC-02, AC-03; no fixtures exist | Unverified |
| POST-03, POST-04, POST-05, POST-06 | Ranking key, result identity, reasons, lineage, total-order behavior, and deterministic tie-break match expected output | Route/scoring/property tests; route + REQ-006 owners | AC-04, AC-05, AC-06, AC-07, AC-09; no tests exist | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05 | Negative fixtures reject unsupported modes, proximity-only/review-only edges, hidden limitations, unknown-value coercion, and contradictory downstream status | Route contract/security-style fixture review; core owner | Constraints, AC-06, AC-08, AC-09; no checker exists | Unverified |
| STATE-01 | Success, limited, and no-route outcomes are typed and mutually distinguishable | Outcome/state tests; route owner | AC-06, AC-08; no implementation exists | Unverified |
| LOOP-01 | Candidate order permutations produce the same result; empty and one-candidate sets terminate correctly | Scoring property test; route owner | AC-04, edge cases; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Import/source review proves route engine does not own UI/map/raw ingestion and consumers do not re-rank | Architecture/import checker; architecture owner | `ARCHITECTURE.md`; no source graph/adapter exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-001 is `Ready`, priority `high`, size `L`.
- D-004 through D-011 in [`00-discussion.md`](00-discussion.md) are treated as approved, including one primary route, fixed ranking order, `no-edge` versus `limited`, depart-at-only timing, no user preference, and minimum recommendation evidence.
- The phrase “materially better” is interpreted from AC-09 as winning the first differing pre-evidence ranking key; no separate numeric threshold is required.

### Deferred or implementation-facing decisions

- REQ-006 supplies correctness evidence but is not a runtime dependency; no contract here claims a benchmark proves the entire network.
- No route-engine implementation, golden fixtures, or cross-surface tests exist; all verification statuses are `Unverified`.
