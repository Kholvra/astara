# Design Contract: Curated Pedestrian Access Evidence

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-014`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Access-record schema, provenance/review gate, contest lifecycle, contradiction/barrier handling, bounded coverage, and consumer-safe status
- Owner: Astara developer/project owner as contest reviewer/publisher; REQ-003/005/012 consume status but do not maintain records
- Risk: An undated or contradictory entrance, platform, crossing, lift, sidewalk, or barrier claim can create unsafe or misleading route guidance and unsupported accessibility expectations.
- Existing behavior: Specification/bootstrap phase; no access records, lifecycle store, review workflow, or tests exist. The contest/demo baseline has no gathered access records; REQ-002 owns transit snapshot lineage.

## Intent and non-goals

This contract creates a small, provenance-backed evidence layer for approved hubs and demo/golden journey points. It lets consumers distinguish verified, limited, unknown, `Perlu dicek`, retired, and barrier conditions without inferring accessibility from absence.

It does not perform a full Jakarta accessibility audit, determine transfer graph connectivity, accept community reports, continuously track field conditions, or run automatic aging/expiry thresholds for the contest.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Observation/source to draft record | Maintainer observation, field/map source, location/type/status/date/note; source data is untrusted | Validate approved scope, stable identity/type, named source, observed date, evidence note, and record version | Draft access record with provenance and current status | Missing required evidence remains draft/unknown; it cannot publish verified |
| TB-02 | Draft to verified publication | Draft plus manual reviewer decision; reviewer input is a trust boundary | Check required fields, source/date/evidence/manual review, contradictions, barriers, and active contest snapshot pin | Published verified/limited/checked record with review metadata | Missing field or unresolved contradiction demotes/rejects verification; no silent favorable choice |
| TB-03 | Record history to lifecycle state | New observation, contradiction, manual aging/retirement, or barrier; trusted only as a reviewed event | Preserve prior record/version and apply legal transition | Reviewable record history and current status | Illegal transition leaves current state unchanged and reports owner error |
| TB-04 | Access record to route/card/map consumers | Shared `evidenceState`, `coverage`, provenance, snapshot association, limitation, and barrier; internal evidence is not user claim | Expose only supported status and map to approved user-facing labels; do not derive `connectionState` here | Consumer-safe access status | Missing/out-of-scope evidence returns `evidenceState=Unknown`/`limited`; consumers cannot upgrade it |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before creating a publishable record | Location/hub identity and access type belong to the approved demo/golden curation scope | Curator/project owner | Keep record out of published verified set and report out-of-scope status |
| PRE-02 | Before `Terverifikasi` | Stable identity/type, named source, observation date, supporting evidence/note, manual review, and no unresolved contradiction are present | Reviewer/publisher | Keep `Unknown`/limited or `Perlu dicek`; never verify |
| PRE-03 | Before consumer verification | Record declares the active contest transit snapshot association and its own evidence/version identity | Data/access owner | Expose limited/mismatch; do not silently rebase to current snapshot |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | A new observation stores stable location/hub identity, access type, status, source, observed date, review date when reviewed, confidence, and supporting evidence | Original observation/source remains traceable | Draft record is available for review |
| POST-02 | Verified publication records evidence checks and reviewer decision; only records satisfying the gate receive `Terverifikasi` | Version/history and snapshot pin remain attached | Consumers can read a published status |
| POST-03 | Contradiction sets `evidenceState=Perlu dicek`; an explicit barrier is preserved and causes REQ-003 to set `connectionState=no-edge` for the affected edge; retirement emits the non-current lifecycle status | No observation is silently deleted or overwritten | Downstream consumers receive the same evidence state; an alternate path requires a separate evidenced edge |
| POST-04 | No record or out-of-scope point returns `evidenceState=Unknown`/`limited` and `coverage=limited`; missing fields/tags never imply accessibility | Coverage boundary remains visible | Card/map/graph can show `Data terbatas` or `Perlu dicek` |
| POST-05 | Consumer status carries provenance/confidence/limitation and never exceeds the record’s claim | An explicit barrier causes REQ-003 to set `connectionState=no-edge` for the affected edge; absence does not prove accessibility or set `no-edge` | REQ-003/005/012 receive consistent evidence and do not invent `connectionState` |
| POST-06 | Contest records are pinned to the active transit snapshot and manual review/retirement is used instead of automatic expiry | Production aging thresholds remain deferred | Version association is available to downstream surfaces |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Evidence owner | `Terverifikasi` iff required provenance/evidence/manual review exist, no unresolved contradiction exists, and snapshot association is valid | Record missing source/date/note/review is verified |
| INV-02 | Trust owner | `Unknown` means absent/insufficient evidence, not accessible or inaccessible; no barrier is not a positive access claim | Missing tags/proximity/absence of report becomes “accessible” |
| INV-03 | Lifecycle owner | Prior versions/observations remain traceable across contradiction, demotion, retirement, or correction | Favorable observation silently replaces conflicting history |
| INV-04 | Scope owner | Only approved hub/journey points receive curated claims; outside scope remains limited/unknown and is not a full-audit assertion | Demo subset is represented as complete network coverage |
| INV-05 | Contest owner | Automatic aging/expiry is not implied; manual `Perlu dicek`/retired handling is the contest policy | An unconfigured age threshold silently changes a claim |
| INV-06 | Consumer owner | Consumers receive shared `evidenceState`/coverage and cannot upgrade it; route eligibility/no-edge versus limited remains REQ-003’s `connectionState` decision | Access record silently creates/blocks graph connectivity or becomes a safety certificate |
| STATE-01 | Lifecycle owner | `draft → verified` is legal only after review gate; `draft/published → Perlu dicek`; `published → retired`; contradiction may demote before retirement; history remains available | `draft → verified` without review, or retired record returns current without a new reviewed version |

## Failure and recovery semantics

- Missing source/date/evidence/review leaves the record unknown/limited or draft; the publisher reports the missing gate rather than inventing a value.
- Conflicting observations remain recorded and set `evidenceState=Perlu dicek`; explicit barriers remain recorded and cause `connectionState=no-edge` for the affected edge through REQ-003; retirement emits the non-current lifecycle status. No favorable observation is silently chosen.
- The contest baseline with no records returns limited coverage and never `Terverifikasi`. REQ-003 decides whether a transfer is `no-edge` or `limited`; this item does not override it.
- Production aging/expiry is deferred. A record does not become current merely because it is present; manual review/retirement controls contest non-current claims.
- Attribution/license obligations for source data remain with the record/publisher; consumers may not omit required provenance where a claim is shown.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-014 owns record creation/review/publication/history; REQ-003 owns transfer-edge eligibility and REQ-005/012 own presentation. | Access/graph/card owners | Prevents access curation from becoming hidden routing logic. |
| ARCH-02 | Access records are versioned separately from transit snapshots but must declare the associated transit snapshot for verification and use the shared status axes when consumed. | Data/access owner | Preserves D-009 lineage, prevents stale rebasing, and keeps evidence/connection status separate; no semantic checker exists. |
| ARCH-03 | Consumer/UI code reads prepared status/evidence; it does not infer accessibility from map proximity, missing tags, or absence of a record. | Access/UI owners | Enforces trust boundary and honest claims. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Record/schema/lifecycle fixtures validate fields, review gate, history, snapshot association, and consumer status | Schema/lifecycle tests; access owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07; no records/tests exist | Unverified |
| PRE-01, PRE-02, PRE-03 | Out-of-scope, incomplete, unreviewed, and mismatched records cannot be verified | Negative record fixtures; access owner | AC-02, AC-05, AC-07; no fixtures exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06 | Published records, demotions, no-data baseline, shared evidence/coverage status, consumer status, and contest pin match expected outputs | Lifecycle/consumer review; access + downstream owners | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07; no implementation exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Missing provenance, contradiction, barrier, expired/manual status, no-record, and out-of-boundary cases preserve claims | Property/consumer fixtures; access owner | AC-02, AC-03, AC-04, AC-05, AC-06, AC-07; no evidence exists | Unverified |
| STATE-01 | Legal lifecycle transitions and history preservation are enforced | State-machine test; access owner | AC-02, AC-03, AC-04; no lifecycle exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Source/type review proves access records do not decide transfer graph or create UI claims | Architecture/data review; architecture owner | REQ-003/005/012 boundaries, `ARCHITECTURE.md`; no source exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-014 is `Ready`, priority `medium`, size `M`.
- D-003 through D-007 in [`00-discussion.md`](00-discussion.md) are treated as approved, including no-data baseline, bounded hub scope, verification gate, manual contest lifecycle, and ownership.

### Deferred or implementation-facing decisions

- Production aging/expiry thresholds and full-network audit scope remain deferred. The contest contract must not invent them.
- No access records, lifecycle store, or consumer tests exist; all verification statuses are `Unverified`.
