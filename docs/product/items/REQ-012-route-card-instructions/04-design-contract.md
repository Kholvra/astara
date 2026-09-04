# Design Contract: Route Card and Journey Instructions

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-012`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: One primary route-card summary, traceable explanation, ordered instructions, uncertainty/status language, incomplete-data behavior, and mobile card-first presentation
- Owner: Route-card/content owner; upstream route/evidence truth remains owned by REQ-001, REQ-003, REQ-013, and REQ-014
- Risk: An attractive card can still instruct a traveler to take an unsupported transfer, treat an interval/fare as exact, or lose the usable route when the map fails.
- Existing behavior: Specification/bootstrap phase; no UI source, content snapshots, glossary checker, or tests exist. REQ-002 contract provides data-status semantics; REQ-015 owns planner recovery state.

## Intent and non-goals

The route card is the authoritative, Bahasa Indonesia instruction surface for one selected journey. It makes route facts, recommendation reasons, ordered actions, and limitations understandable without map interpretation.

It does not select/rank routes, maintain access evidence, render map geometry, implement live navigation/realtime, process fares/payments, save trips, or invent instructions when upstream evidence is missing. Visible alternative cards are deferred.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Route result/evidence to card model | Primary route facts, scorer fields, shared status axes, timing/fare, transfer/access status, geometry references, and lineage; trusted only from upstream contracts | Validate route outcome, field provenance, status axes, leg identity/order, and conditional fare/timing semantics | Presentation model containing only supported facts and approved calculations | Missing/contradictory fields render a limitation or recovery state; card does not fill gaps |
| TB-02 | Internal evidence state to user copy | Shared `evidenceState`, `connectionState`, `freshness`, `coverage`, `timingSemantics`, and `geometryState`; internal labels are not user-facing truth | Apply one approved mapping to `Data terbatas`, `Perlu dicek`, `Terverifikasi`, and related glossary terms | Bahasa Indonesia status/copy with claim strength bounded by evidence | `review-only`/`no-edge` is never rendered as a route step; unknown/missing evidence cannot render as verified, safe, or accessible |
| TB-03 | Route facts to ordered actions | Ordered origin walk, boarding, transit, transfer, alighting, exit, and final walk facts; untrusted if order/identity is incomplete | Preserve sequence, service/direction, decision point, and supported detail; reject duplicate/contradictory steps | Ordered instruction list keyed to route-leg identity | Omit unsupported detail with a visible limitation; `no-edge` is not an instruction |
| TB-04 | Card to map/planner surfaces | Card selection, map availability, stale/no-route state, and recovery actions | Keep card as authority; consume map/planner status without changing route facts | Card view that remains usable independently | Map failure cannot hide known card facts/instructions |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before rendering a successful card | A typed primary route result exists with route identity, ordered facts, statuses, and source references | Route/card boundary | Render typed no-route/limited/recovery state; never fabricate a successful card |
| PRE-02 | Before showing a claim | The claim maps to a returned route/evidence field or approved calculation, and its status mapping is known | Content/card owner | Omit or label the claim as limited; do not improvise copy |
| PRE-03 | Before showing fare/timing language | Fare source/calculation and schedule semantics identify whether the value is exact, interval, estimated, or limited | Timing/fare/card owners | Omit numeric fare or exact promise and show approved limitation/interval wording |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Above the fold shows endpoints, service/direction, depart-at assumption, duration/interval, transfers, walking/data status, and a short factual reason | Route identity and source/status remain available in details | Traveler can understand the primary choice before opening the map |
| POST-02 | Recommendation reasons are reconstructable from route facts/scoring fields and distinguish facts from preference trade-offs | No hidden “AI best” claim is added; MVP has no preference control | Card explanation remains auditable |
| POST-03 | Instructions appear once and in journey order, identifying service/direction and supported decision points | Unsupported geometry/detail stays limited rather than disappearing silently | Traveler receives actionable steps for known portions |
| POST-04 | Shared status axes map to approved Bahasa Indonesia status language: `coverage/freshness/geometryState=limited|unknown` use limitation wording; `evidenceState=Perlu dicek` or an unresolved barrier uses `Perlu dicek`; `Terverifikasi` appears only when its evidence gate passes | Missing evidence never becomes safety/accessibility certainty | Status is visible on the relevant summary/step |
| POST-05 | Incomplete fare omits numeric amount; interval data is described as interval/headway; arrive-by is not shown | Selected local depart-at input remains the displayed assumption | No false precision is emitted |
| POST-06 | No-route shows `Tidak ada rute` with edit/retry; ambiguity shows confirmation; `no-edge`/`review-only` is omitted as a transfer step; stale/incomplete data shows its limitation; map failure shows map recovery while retaining the card | Card remains usable without map and known facts remain visible | Planner/card receives a recoverable outcome for the specific condition |
| POST-07 | Mobile card is first, one-column, touch-usable, no-horizontal-scroll, and understandable without opening the map | Map remains a collapsible companion | Focus/order/status are available to related surfaces |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Content owner | Every displayed fact, estimate, status, and reason maps to a source field or approved calculation | Hardcoded route claim or unexplained recommendation |
| INV-02 | Instruction owner | Step order and leg identity exactly follow the selected route result; valid cards contain no duplicate/contradictory journey step | Card silently reorders, duplicates, or invents a leg |
| INV-03 | Trust-copy owner | `Unknown`/missing/limited maps only to approved limitation language; `Terverifikasi`/barrier appears only when evidence supports it; absent barrier is not accessibility | Missing evidence is presented as safe, accessible, or confirmed |
| INV-04 | Timing/fare owner | Depart-at assumption, interval/exact/estimate labels, and fare amount conditions remain consistent with REQ-013 | Interval becomes exact departure, incomplete fare becomes a number, or arrive-by appears |
| INV-05 | Transfer owner | A transfer is a route step only when `connectionState=routable`; a supported `limited` transfer remains visible with limitation, while `no-edge`/`review-only` (including `Perlu dicek`) is not a route step or walking instruction | Card turns an unsupported or review-only connection into a path |
| INV-06 | Surface owner | Card remains authoritative and usable when map geometry/provider fails; map state cannot alter route facts | Map availability gates basic instructions |
| INV-07 | Glossary owner | Approved terms `Halte`, `Arah`, `Pindah`, `Jalan kaki`, `Perkiraan`, `Data terbatas`, `Perlu dicek`, and `Tidak ada rute` retain one meaning across related surfaces | Technical field names or inconsistent synonyms confuse the user |
| STATE-01 | Card/planner owner | `route result → summary → ordered detail`; `result → no-route/confirmation/limited`; `result → card-only map failure` are legal presentation outcomes | A failure produces a blank card or an unsupported successful instruction sequence |

## Failure and recovery semantics

- Missing route fields, stale/limited data, unknown walking detail, missing geometry, or incomplete fare produce bounded copy while preserving known facts.
- A `no-edge` transfer is omitted as a route step and follows the no-route/recovery state; a supported limited transfer remains visible but without fabricated path detail.
- Map/provider failure leaves the card and ordered instructions available; REQ-015 owns retry/reset/back orchestration.
- Duplicate or ambiguous platform instructions require confirmation rather than a silent selection.
- The card does not expose raw internal IDs, stack traces, or unsupported accessibility claims; user-facing errors explain what happened and the next action.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-012 consumes route/evidence/timing contracts; it MUST NOT rank routes, infer transfers, parse raw GTFS, or maintain evidence. | Card + upstream owners | Keeps presentation separate from routing/data truth; no source graph exists. |
| ARCH-02 | The card is the authoritative instruction surface; REQ-005 map output is a companion and REQ-015 owns state/recovery transitions. | Card/map/planner owners | Prevents map or UI duplication from changing the route contract. |
| ARCH-03 | REQ-002 owns the shared status axes/values and lineage fields; REQ-012 owns only their user-facing language mapping. Card, map, search, and recovery surfaces MUST consume the same meanings. | Core/content owners | Enforces SSOT and plain-language status behavior; no content checker exists. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Route/content fixtures reject unsupported fields and preserve evidence/status/step identity through map failure | Content snapshot/component tests; card owner | AC-01, AC-02, AC-03, AC-04, AC-06, AC-08, AC-09; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Missing result/provenance/semantic status cannot render successful unsupported copy | Presentation contract tests; card owner | AC-01, AC-02, AC-03, AC-04, AC-06, AC-07, AC-08; no tests exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, POST-07 | Summary, reasons, ordered steps, statuses, fare/timing, recovery, and mobile flow match approved snapshots | Component/content/mobile walkthrough; card + content owners | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10; no UI exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07 | Direct, transfer, no-edge/review-only, limited, stale, barrier, fare, interval, map-failure, ambiguous, and glossary cases preserve claims and shared status meanings | Content/route fixture suite; card + upstream owners | AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09; no fixtures exist | Unverified |
| STATE-01 | Card outcomes remain distinguishable and usable across result, limited, no-route, confirmation, and map-failure states | Component/integration test; card + REQ-015 owners | AC-06, AC-07, AC-08, AC-09, AC-10; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Import/source review proves card does not own routing/raw data, shared status fields are consumed from REQ-002, and language mappings are not duplicated | Architecture/content review; architecture owner | `ARCHITECTURE.md`, AGENTS.md, REQ-002 shared status contract; no source exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-012 is `Ready`, priority `high`, size `M`.
- D-003 through D-008 in [`00-discussion.md`](00-discussion.md) are treated as approved, including one primary card, evidence-bound copy, above-the-fold facts, glossary, fare limitation, and mobile card-first behavior.

### Deferred or implementation-facing decisions

- Final content snapshot/localization review and exact component structure remain implementation work; the approved glossary and claim mappings are the contract.
- No UI, content checker, or route fixture exists; all verification statuses are `Unverified`.
