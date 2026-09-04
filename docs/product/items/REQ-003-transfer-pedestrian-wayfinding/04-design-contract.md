# Design Contract: Transfer Connectivity and Confidence

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-003`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Transfer-edge evidence precedence, walking cost components, confidence/limitation states, deterministic inclusion, and graph handoff
- Owner: Transfer-graph owner; physical evidence lifecycle remains owned by REQ-014
- Risk: Proximity-only or stale transfer assumptions can route a traveler across an unusable station/platform connection or imply accessibility that was never verified.
- Existing behavior: Specification/bootstrap phase; no graph implementation, walking-provider adapter, or fixtures exist. REQ-002 owns snapshot lineage and REQ-014 owns curated access records.

## Intent and non-goals

The transfer contract determines whether two service endpoints are connected, what evidence supports the connection, and whether route selection may use it. It keeps network connectivity separate from physical instruction maintenance and from route ranking.

It does not define full Jakarta pedestrian auditing, route-card wording, map rendering, realtime platform changes, ticketing, accessibility certification, or a user-selectable accessibility profile.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Candidate endpoints to graph evaluator | Service, stop, station, and platform identities from the active snapshot; trusted only after identity validation | Confirm endpoint IDs belong to the same supported snapshot and represent a possible transfer boundary | Endpoint pair with snapshot lineage | Unknown/dangling endpoints are not routable and return a typed evaluation failure |
| TB-02 | Evidence sources to transfer edge | Explicit GTFS transfer, shared station/platform relation, verified walking graph, and proximity review candidate; evidence is untrusted until assessed | Apply precedence, source/date requirements, contradiction/barrier checks, and minimum-evidence policy | Edge record with shared `evidenceState`, `connectionState`, source, confidence, limitation, inclusion decision, and evidence references | Proximity-only/unsupported candidate becomes `no-edge`; stale/contradictory evidence becomes `Perlu dicek` with `connectionState=review-only` |
| TB-03 | Walking provider/geometry to cost fields | Walking path, distance, time, safety buffer, and provider result; external/provider data is untrusted | Validate usable path and coordinates; keep walking time, safety buffer, and cognitive decision cost separate | Transfer cost components tied to the edge | Provider failure or missing path yields `limited` for supported evidence, otherwise `no-edge`; no speculative path |
| TB-04 | Edge result to route/card/map consumers | Shared evidence/connection status, confidence, limitation, duration, and identifiers | Expose status without consumer-side upgrades or hidden ranking penalty | Stable graph-edge response | Consumers admit only `connectionState=routable`; `no-edge` and `review-only` remain non-routable while their limitation/status is preserved |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before evaluating an endpoint pair | Both endpoints are stable supported identities under the active snapshot | Graph owner | Return typed unsupported/invalid edge; do not use coordinates as identity |
| PRE-02 | Before declaring a routable edge | At least one approved evidence source supports the connection; proximity alone is insufficient | Graph/evidence owner | Return `no-edge` and retain proximity only as a non-routable review candidate |
| PRE-03 | Before assigning `Terverifikasi` | Evidence has a named source, source/snapshot or observation/review date, and no unresolved contradiction | Evidence owner | Use `Perlu dicek` or `limited`; never label verified |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | The edge response records the strongest applicable evidence source, endpoint identities, confidence, limitation, and inclusion decision | Weaker evidence cannot erase a stronger contradiction | Route selection can explain why the edge exists or is excluded |
| POST-02 | A usable walking path returns separate walking distance/time, safety buffer, and cognitive decision cost | Components remain independently inspectable | Route cost consumers receive structured duration facts |
| POST-03 | Approved evidence without a usable physical path returns a supported `limited` edge; absent minimum evidence returns `no-edge` | No missing geometry/instruction is fabricated | REQ-001 may apply its separate limited-primary policy |
| POST-04 | Stale or contradictory supported evidence is visibly `Perlu dicek` with `connectionState=review-only`; an explicit barrier on the evaluated path sets `connectionState=no-edge`; missing barriers remain unknown | Confidence does not become an accessibility guarantee; an alternate path requires a separate evidenced edge | Card/map receive the status and limitation |
| POST-05 | Identical snapshot, evidence, and configuration produce identical edge identity, components, status, and inclusion | Review candidates remain distinguishable from routable edges | Results can be replayed in graph fixtures |
| POST-06 | The edge status mapping is explicit: `Terverifikasi` or supported `limited` with no explicit barrier → `routable`; `Perlu dicek` → `review-only`; `Unknown` → `review-only`; unsupported or explicitly barred → `no-edge` | Evidence state and connection state remain separate; an explicit barrier on the evaluated path overrides evidence strength, while missing barrier data stays unknown | Route selection and surfaces consume the same eligibility decision |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Graph owner | An edge is routable only when `connectionState=routable` and its evidence is supported by explicit GTFS transfer, shared station/platform identity, or verified walking evidence | A short coordinate distance alone creates a route edge |
| INV-02 | Evidence owner | `Terverifikasi` requires named and dated evidence with no unresolved contradiction; stale/contradictory is `Perlu dicek` and non-routable; supported incomplete is `limited` and may be routable; unsupported is `no-edge` | Confidence labels are assigned from proximity, missing tags, or optimism |
| INV-03 | Cost owner | Walking route/time, safety buffer, and cognitive decision cost are separate facts | One unexplained duration hides decision burden or safety buffer |
| INV-04 | Access owner | Missing barrier/access data is unknown; an explicit barrier on the evaluated path sets that edge to `connectionState=no-edge`; an alternate path is evaluated as a separate evidenced edge and neither state is a general accessibility certification | Absence of a barrier becomes “accessible”, or a barrier is ignored by retaining the affected edge as routable |
| INV-05 | Scope owner | Manual verification claims are limited to approved demo/golden hubs; outside scope remains limited/unknown under the same evidence rules | Limited curation is presented as a full-network audit |
| STATE-01 | Graph owner | `candidate → Terverifikasi/routable`, `candidate → limited/routable`, `candidate → Perlu dicek/review-only`, `candidate → Unknown/review-only`, or `candidate → no-edge/no-edge` are legal according to evidence; only `connectionState=routable` may be consumed by route selection | `no-edge` or `review-only` becomes routable, or a supported incomplete path skips its limitation |

## Failure and recovery semantics

- Invalid endpoints, conflicting identity, or missing active snapshot fail before graph mutation and remain visible to the caller.
- Walking-provider failure or missing geometry does not invent a line. Supported connection evidence degrades to `limited`; without minimum evidence the result is `no-edge`.
- Evidence contradiction or staleness is retained and labeled `Perlu dicek`; the graph owner does not silently select the favorable observation.
- REQ-001 owns ranking and the limited-primary fallback. REQ-003 exposes edge status and does not apply an undocumented numeric penalty.
- OSM or another walking source carries its attribution/license obligations; this contract does not make provider availability a guarantee.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-003 owns graph connectivity and edge confidence; REQ-014 owns record curation; REQ-002 owns the shared status axes; REQ-012/REQ-005 render the supplied status and do not infer connectivity. | Graph/evidence owners | Prevents route selection from creating physical claims; semantic dependency checker is deferred. |
| ARCH-02 | The graph may consume prepared snapshot/evidence data but MUST NOT parse browser-side raw GTFS or make map/UI decisions. | Core/data owner | Aligns with the one-way architecture and active raw-feed browser guardrail. |
| ARCH-03 | Proximity review candidates are stored separately from routable edges and cannot cross the boundary without approved evidence. | Graph owner | Makes the most harmful false-positive edge mechanically distinguishable once types/tests exist. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Endpoint/evidence fixtures produce stable edge records and typed failures without hidden upgrades | Graph fixture tests; graph owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-07; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Invalid endpoints, proximity-only evidence, and undated/contradictory evidence cannot become verified/routable | Negative graph fixtures; graph/evidence owner | AC-01, AC-02, AC-04; no fixtures exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06 | Evidence source, costs, status mapping, barrier behavior, eligibility, and deterministic output match expected facts | Graph contract/property tests; graph owner | AC-03, AC-04, AC-05, AC-06, AC-07; no tests exist | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05 | Explicit-rule conflict, same-station/different-platform, barrier, stale, and outside-scope cases preserve boundaries | Golden graph cases; graph + REQ-014 owners | AC-01, AC-02, AC-04, AC-08, AC-09; no fixtures exist | Unverified |
| STATE-01 | State table accepts only evidence-supported outcomes and excludes `no-edge`/`review-only` from route candidates | State/property test; graph owner | AC-05, AC-07; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Source/import review separates graph, evidence, UI/map, and review candidates | Architecture/import/type checker; architecture owner | `ARCHITECTURE.md`, AGENTS.md; no source graph/adapter exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-003 is `Ready`, priority `high`, size `M`.
- D-003 through D-008 in [`00-discussion.md`](00-discussion.md) are treated as approved, including evidence precedence, limited/no-edge behavior, hub scope, confidence vocabulary, and no profile selector.

### Deferred or implementation-facing decisions

- The exact walking-provider implementation and full-network audit order remain outside this contract; the evidence predicates must remain provider-neutral.
- No graph implementation, walking fixture, or consumer test exists; all verification statuses are `Unverified`.
