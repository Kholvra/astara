# Design Contract: Trusted TransJakarta Network Data

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-002`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Manual GTFS Static acquisition, immutable snapshot lineage, normalization, validation, publication, freshness/limitation status, fallback, recovery, and access-evidence association
- Owner: Astara data maintainer/developer; product policy decisions remain owned by the project owner
- Risk: Untrusted, stale, or misinterpreted network data can produce invalid routes, wrong service-day behavior, fabricated schedule/access claims, or an unavailable planner that appears successful.
- Existing behavior: Specification/bootstrap phase; no source tree, package manifest, or executable test suite exists. Human architecture context is in [`docs/architecture/ARCHITECTURE.md`](../../../architecture/ARCHITECTURE.md), with active checks in [`docs/architecture/GUARDRAILS.json`](../../../architecture/GUARDRAILS.json).

## Intent and non-goals

This contract makes the published static network snapshot trustworthy and traceable for downstream route selection, transfer connectivity, search, timing controls, access evidence, maps, and route cards. It defines what the data lifecycle may publish, what consumers may rely on, and how failures remain visible.

The contract does not define route scoring, transfer inference, pedestrian-access curation, generic geocoding, realtime updates, route-card wording, automated refresh, or a private/authenticated TransJakarta integration. It does not assign numeric Fresh/Aging/Stale thresholds; those remain deferred beyond the contest/demo scope.

## Shared status contract

Cross-contract outputs use separate status axes. A consumer MUST NOT collapse one axis into another or infer a stronger state from a missing field.

| Field | Allowed values | Owner | Meaning |
|---|---|---|---|
| `networkAvailability` | `available`, `unavailable` | Snapshot lifecycle owner | Whether a valid network snapshot can serve the request. |
| `freshness` | `current`, `aging`, `stale`, `unknown` | Data/status owner | Configured age state; thresholds remain a separate policy input. |
| `coverage` | `complete`, `limited`, `unknown` | Data publisher | Whether known feed/access fields are complete for the consumer’s claim. |
| `evidenceState` | `Terverifikasi`, `limited`, `Perlu dicek`, `Unknown` | Transfer/access evidence owners | Strength and review state of physical/access evidence. |
| `connectionState` | `routable`, `no-edge`, `review-only` | Transfer-graph owner | Whether an edge may enter route selection; this is not an accessibility claim. |
| `timingSemantics` | `exact`, `interval`, `estimate`, `unavailable` | Schedule/timing owners | What timing information can honestly be promised. |
| `geometryState` | `supported`, `limited`, `unknown`, `unavailable` | Geometry/data owner | Whether supplied route geometry is usable and how complete it is. |

`Perlu dicek` evidence for a transfer maps to `connectionState=review-only`; it is never silently treated as `routable`. Planner states such as `stale-data` and `map-failure` remain orchestration states owned by REQ-015, not data status values.

## Validation gate rule inventory

The contest/demo publication gate uses the following stable classifications. A finding not listed as an accepted warning is a hard blocker until the project owner explicitly classifies it.

| Rule ID | Classification | MUST block or allow | Evidence/oracle |
|---|---|---|---|
| `DATA-HARD-001` | Hard blocker | Block when the minimum route set is incomplete: `agency.txt`, `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`, or both service-date sources are unusable (`calendar.txt` and `calendar_dates.txt` provide no usable service-date basis). | File/schema fixture identifies the missing or unusable file. |
| `DATA-HARD-002` | Hard blocker | Block malformed required columns/rows, identifiers, or GTFS time syntax. Times above `24:00:00` are valid and are not malformed. | Parser/validator fixture records the exact rule and row. |
| `DATA-HARD-003` | Hard blocker | Block duplicate identifiers or dangling references required to build the supported network. | Referential-integrity fixture identifies both the duplicate/reference and consumer impact. |
| `DATA-HARD-004` | Hard blocker | Block invalid stop coordinates or other coordinates required by the supported network. | Coordinate-boundary fixture rejects invalid values and preserves the candidate as rejected. |
| `DATA-HARD-005` | Hard blocker | Block when the configured contest/demo service date has no active supported service. | Date-filtered fixture proves the active-service count is zero. |
| `DATA-HARD-999` | Hard blocker | Block every unclassified validator finding; no new warning is publishable by default. | Gate test fails closed until the finding receives an approved classification. |
| `DATA-WARN-001` | Accepted warning | Allow `missing_timepoint_value` only with a limitation note and without weakening required arrival/departure validation. | Warning fixture shows publication plus the limitation. |
| `DATA-WARN-002` | Accepted warning | Allow absent `calendar_dates.txt` when `calendar.txt` supplies a usable baseline; mark special-date additions/removals as uncovered. | Calendar fixture publishes a limited coverage state. |
| `DATA-WARN-003` | Accepted warning | Allow absent `pathways.txt` with an explicit entrance/pathway limitation; do not synthesize station access. | Access-boundary fixture preserves limited coverage. |
| `DATA-WARN-004` | Accepted warning | Allow absent `feed_info.txt` when other provenance fields are present; leave feed version unavailable rather than inventing it. | Provenance fixture preserves the missing-version status. |

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Official source to snapshot acquisition | Public official TransJakarta GTFS Static download and HTTP response; untrusted external bytes | Confirm the approved source policy, readable archive/file set, acquisition metadata, and content hash | Immutable raw snapshot with source URL, acquisition time, HTTP metadata, hash, feed version when available, and unique snapshot ID | Download or archive failure is a failed candidate; it MUST NOT change the active snapshot and MUST be visible to the maintainer |
| TB-02 | Raw snapshot to normalized data | Raw GTFS files, headers, fields, identifiers, references, coordinates, and times; untrusted parsed input | Parse supported entities, validate required structure, identifiers, references, coordinates, time syntax, and configured semantic rules; do not silently coerce malformed values | Normalized supported entities plus rule-level findings and snapshot lineage | Hard failures reject publication; absent optional files and bounded warnings become explicit limitations rather than fabricated data |
| TB-03 | Schedule fields to service semantics | `calendar.txt`, optional `calendar_dates.txt`, `stop_times.txt`, and `frequencies.txt`; parsed but semantically untrusted | Evaluate the requested service date, preserve GTFS service-day times above `24:00:00`, and distinguish `exact_times=0` intervals from exact departures | Date-filtered schedule facts with explicit calendar coverage and interval semantics | Invalid syntax is a hard validation failure; absent exception coverage remains limited; interval data MUST NOT become an exact departure promise |
| TB-04 | Curated access evidence to active consumers | Versioned pedestrian/access record and its declared transit snapshot association; trusted only after boundary validation | Check the evidence record and compare its declared transit snapshot ID with the active transit snapshot ID | Access status carrying its evidence version, association, and supported confidence/limitation state | Missing or mismatched evidence is `Data terbatas`; it MUST NOT silently become verified or block the transit route |
| TB-05 | Published data to route/search/surface consumers | Active snapshot ID, normalized records, freshness metadata, and known limitations; trusted internal output | Expose the published status without allowing consumers to upgrade unknown, stale, or incomplete facts | Stable consumer response containing network availability, lineage, freshness, and limitation fields | If no valid snapshot exists, return an explicit unavailable state; do not return an empty network as successful data |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before a contest/demo refresh starts | The maintainer uses the approved public official TJ Static source and the manual workflow; no private endpoint, account, SSO, or alternate source is assumed | Data maintainer/developer | Abort the acquisition and report the source/workflow failure; do not substitute another source silently |
| PRE-02 | Before validation or publication of a candidate | The candidate has immutable raw content, a unique snapshot ID, content hash, acquisition metadata, and an explicit validation configuration/service date where date-sensitive checks apply | Ingestion/validation owner | Keep the candidate unpublished and report missing provenance/configuration |
| PRE-03 | Before a candidate can become active | Validation has completed and produced rule-level findings with the approved hard-blocker versus accepted-limitation classification | Publication owner | Fail closed: no active-state mutation; retain the candidate for inspection if it can be safely retained |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Acquisition creates a new immutable raw snapshot record containing source URL, acquisition time, HTTP metadata, content hash, feed version when available, and unique snapshot ID | Raw bytes and their hash remain stable for replay and investigation | A new candidate is stored; an existing snapshot is never overwritten |
| POST-02 | Normalization emits only supported entities needed by downstream consumers and preserves lineage to the source snapshot | Every exposed normalized record remains attributable to one snapshot ID and its source metadata | Normalized output and validation inputs become available to the validator/indexing handoff |
| POST-03 | Validation reports structural and semantic findings by the `DATA-HARD-*`/`DATA-WARN-*` inventory and applies the contest/demo gate: hard blockers reject publication; only listed warnings may publish with their required limitation note | Valid after-midnight service-day values, interval/headway semantics, and known calendar coverage are preserved | A reproducible validation decision is recorded for the candidate |
| POST-04 | Publication promotes only a candidate with no hard blocker and exposes its snapshot ID, source lineage, freshness state, and limitations to consumers | The published snapshot remains immutable and the active pointer identifies exactly one valid snapshot or an explicit unavailable state | Downstream consumers can read the newly active snapshot |
| POST-05 | A rejected candidate remains inspectable with its findings, while the prior valid active snapshot remains active when one exists | The previous active snapshot, its ID, and its status are unchanged by candidate rejection | Maintainer/operator receives a rejection reason; no failed candidate is served |
| POST-06 | A status request returns configured freshness and known limitation information, including missing `calendar_dates.txt`, `pathways.txt`, or other incomplete coverage | Unknown/missing evidence remains unknown; contest/demo stale use retains the static/demo-data schedule-change note | Consumers can render approved limitation language; the UI need not show a numeric freshness label or download date |
| POST-07 | Recovery either activates a valid official/last-valid snapshot after manual re-download/revalidation or returns an explicit unavailable state | No-valid-snapshot state is not represented as an empty successful network | The Astara developer owns manual recovery; no automatic alternate-source switch occurs |
| POST-08 | An access-status request returns the evidence version and transit-snapshot association, treating evidence as verified only on an active-ID match | A mismatch or absent record remains limited and does not invalidate or silently replace the transit snapshot | Downstream route/card/map consumers receive honest access status |
| POST-09 | Every consumer response carries the applicable shared status axes (`networkAvailability`, `freshness`, `coverage`, `evidenceState`, `connectionState`, `timingSemantics`, and `geometryState`) without using one axis as another | Missing or inapplicable axes remain explicit/unknown; `Perlu dicek` transfer evidence carries `connectionState=review-only` | Consumers can apply one stable status mapping without inventing a parallel enum |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Snapshot lifecycle owner | At every publication boundary, the active state is either a previously validated snapshot with no hard blocker or an explicit unavailable state | A rejected, unvalidated, or partially validated candidate becomes active; a failed refresh replaces the active snapshot with an empty network |
| INV-02 | Snapshot/lineage owner | Raw content, snapshot ID, hash, normalized lineage, validation findings, and publication decision remain stable for the same input/configuration; nondeterminism is recorded | Replaying the same snapshot/config silently changes normalized output or the publication decision |
| INV-03 | Schedule semantics owner | GTFS times greater than `24:00:00` remain valid service-day values; `frequencies.txt` with `exact_times=0` remains interval/headway data and is never represented as an exact departure timetable | Rejecting a valid after-midnight time or presenting an interval as a guaranteed exact departure |
| INV-04 | Calendar semantics owner | Service availability is evaluated for the requested date; if `calendar_dates.txt` is absent, `calendar.txt` is only a limited baseline and special-date additions/removals are not claimed covered | Treating all calendar rows as active regardless of date or presenting missing exception coverage as complete |
| INV-05 | Source/status owner | The MVP network source is official TJ Static; stale or incomplete data may be used only under the approved contest/demo policy with status/limitation propagation | Scraped HTML, map images, realtime, or another provider silently replaces the approved source; stale data is presented as current or realtime |
| INV-06 | Access-evidence owner | Access evidence is verified if and only if its declared transit snapshot ID matches the active transit snapshot ID and the record otherwise passes its evidence rules | An absent, stale, or mismatched access record is upgraded to a safety/accessibility guarantee or silently blocks a transit route |
| STATE-01 | Snapshot lifecycle owner | `acquired → validating → published/active` is legal only when the gate has no hard blocker; `validating → rejected` is legal on a hard blocker; `rejected` remains inspectable; `active → superseded` is legal only after successful publication of a newer valid snapshot; `no active → unavailable` is legal when recovery has failed | `rejected → active`, `validating → active` without a completed gate, or `active → unavailable` merely because a newer candidate failed while the prior active snapshot is valid |

## Failure and recovery semantics

- Download, archive, parse, structural, or semantic hard-gate failure is a candidate failure, not a successful empty result. The candidate remains inspectable when possible; the active snapshot is preserved.
- Accepted non-critical warnings may accompany publication only when their classification and limitation note are recorded. “Accepted” does not mean “complete” or “verified.”
- If no valid snapshot is active, the Astara developer manually retries the official download and validation or reinstalls the last valid snapshot before the demo. If recovery fails, the planner receives an explicit unavailable state with an operator-visible reason.
- A stale last-known-good snapshot may serve contest/demo route and search results only when the approved static/demo-data note and schedule-change warning are propagated. The data MUST NOT be described as current or realtime.
- Missing `feed_info.txt`, `calendar_dates.txt`, or `pathways.txt` is retained as a known limitation. The lifecycle MUST NOT invent feed version, calendar exceptions, station pathways, entrances, or accessibility facts.
- Access-evidence mismatch or absence degrades access status to `Data terbatas`; it does not silently alter the transit snapshot or turn an otherwise valid transit route into no route.
- The contract does not promise automatic rollback, scheduled refresh, exactly-once downloads, or atomic multi-system transactions. It requires only that failed candidates cannot become active and that the active state remains the previous valid snapshot or explicit unavailable state.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | Snapshot acquisition, parsing, normalization, validation, and publication belong to the data/core preparation boundary. Route selection, UI, and map layers consume the resulting trusted contract; they MUST NOT own snapshot lifecycle or raw-feed parsing. | Data/core owner | Preserves one-way flow and keeps routing decisions separate from ingestion. Dependency-direction enforcement is deferred until a source graph exists. |
| ARCH-02 | Browser-facing map/UI code receives prepared route legs, status, and GeoJSON only; it MUST NOT import or parse raw GTFS CSV/TXT files, and the map MUST NOT decide route selection. | Map/UI owner | Aligns with `ARCH-MAP-001`, which is an active machine-checkable guardrail for raw GTFS references in browser-facing scopes. |
| ARCH-03 | Shared transit models and status axes have one owner in the core/types/data contract. Consumers MUST use the fields and values in the Shared status contract and MUST NOT create parallel meanings for snapshot ID, freshness, coverage, evidence, connection, timing, geometry, or access association. | Core/data contract owner | Prevents cross-layer drift and preserves traceability; requires type/check/test evidence once implementation exists. |
| ARCH-04 | Curated pedestrian/access evidence remains a separate versioned input owned by REQ-014. The data lifecycle may associate and expose its version, but it MUST NOT fabricate, curate, or silently rebase evidence onto a different transit snapshot. | Access-evidence owner | Preserves the trust boundary established by D-009; no executable checker currently proves semantic association. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01 | A manual fixture records the approved source, HTTP metadata, hash, and immutable raw bytes; invalid download/archive does not publish | Acquisition/lineage test; data owner | AC-01, AC-09; no implementation or fixture exists | Unverified |
| TB-02 | Malformed rows, duplicate IDs, dangling references, invalid coordinates, and invalid times produce named findings and cannot publish | Validator fixture; ingestion owner | AC-02, AC-10; no implementation or fixture exists | Unverified |
| TB-03 | After-midnight and frequency fixtures preserve service-day/interval semantics; missing exception file produces a limitation | Schedule semantic test; core/data owner | AC-03, AC-11; no implementation or fixture exists | Unverified |
| TB-04 | Matching access evidence is verified; missing/mismatched association returns `Data terbatas` | Association test; data/access owner | AC-13; no implementation or fixture exists | Unverified |
| TB-05 | Consumers receive active status or explicit unavailable state and never a successful empty network | Consumer contract test; data/service owner | AC-05, AC-06, AC-08; no implementation or fixture exists | Unverified |
| PRE-01 | Refresh walkthrough rejects non-official/private/alternate source paths | Manual workflow review; maintainer/developer | AC-09; no executable workflow exists | Unverified |
| PRE-02 | Candidate without complete provenance or explicit date/configuration is refused before publication | Validation precondition test; ingestion owner | AC-01, AC-03; no implementation exists | Unverified |
| PRE-03 | Publication cannot run with incomplete or unclassified findings | Publish-gate test; publication owner | AC-04, AC-10; no implementation exists | Unverified |
| POST-01 | Repeated inspection shows raw snapshot bytes and provenance metadata unchanged; a refresh creates a new snapshot ID | Lineage/replay test; data owner | AC-01, AC-07, AC-09; no implementation exists | Unverified |
| POST-02 | Every normalized consumer record includes source snapshot lineage and only supported entities are emitted | Schema/lineage test; core/data owner | AC-03, AC-07; no implementation exists | Unverified |
| POST-03 | Validator report contains rule-level `DATA-HARD-*`/`DATA-WARN-*` findings and applies the closed two-tier gate without false exactness | Golden validator fixtures; data owner | AC-02, AC-03, AC-10, edge-case list; no fixtures exist | Unverified |
| POST-04 | Only a no-hard-blocker candidate becomes active and status/limitation metadata is queryable | Lifecycle integration test; publication owner | AC-04, AC-05; no implementation exists | Unverified |
| POST-05 | Rejected candidate remains inspectable and prior active ID is unchanged | Rejection/fallback test; publication owner | AC-04; no implementation exists | Unverified |
| POST-06 | Freshness and missing-data states are exposed; stale demo use carries the static/demo note without requiring date/freshness UI labels | Consumer contract test/manual surface review; data + product owners | AC-05, AC-08, AC-11; no implementation exists | Unverified |
| POST-07 | Manual recovery activates a valid snapshot or returns explicit unavailable state; no alternate source is used | Recovery walkthrough/test; Astara developer | AC-06, AC-12; no implementation exists | Unverified |
| POST-08 | Access response exposes evidence version and association and degrades mismatches to `Data terbatas` | Association/consumer test; access/data owner | AC-13; no implementation exists | Unverified |
| POST-09 | Consumer fixtures show each status axis is preserved independently and `Perlu dicek` transfer evidence is never exposed as a routable edge | Cross-contract schema/status test; core/data contract owner | AC-03, AC-05, AC-08, AC-13; no implementation exists | Unverified |
| DATA-HARD-001, DATA-HARD-002, DATA-HARD-003, DATA-HARD-004, DATA-HARD-005, DATA-HARD-999, DATA-WARN-001, DATA-WARN-002, DATA-WARN-003, DATA-WARN-004 | Validator fixtures emit the named classification, fail closed for hard/unclassified findings, and publish accepted warnings only with their required limitation | Validator gate checker and golden fixtures; data owner | AC-02, AC-03, AC-04, AC-10, AC-11; no checker or fixtures exist | Unverified |
| INV-01 | State-machine fixtures prove active validity, fallback preservation, and unavailable-first-run behavior | Lifecycle property test; snapshot lifecycle owner | AC-04, AC-06, AC-12; no implementation exists | Unverified |
| INV-02 | Replaying identical raw bytes/config produces identical normalized output/findings/decision, or records nondeterminism | Determinism/replay test; core/data owner | AC-07; no implementation exists | Unverified |
| INV-03 | Boundary fixtures assert `25:10:00`-style values are valid and `exact_times=0` is interval data | Schedule semantics test; core/data owner | AC-03 and edge-case list; no implementation exists | Unverified |
| INV-04 | Date fixtures exclude inactive services and surface absent exception coverage as limited | Calendar test; core/data owner | AC-03, AC-11; no implementation exists | Unverified |
| INV-05 | Source/status fixtures reject silent provider substitution and prevent current/realtime claims for stale static data | Policy/consumer test; data + product owners | AC-08, AC-09; no implementation exists | Unverified |
| INV-06 | Association fixtures verify only matching active snapshot IDs and never turn absent evidence into a route blocker | Access contract test; access/data owner | AC-13; no implementation exists | Unverified |
| STATE-01 | Transition tests accept only legal lifecycle transitions and preserve active state on candidate rejection | State-machine test; snapshot lifecycle owner | AC-04, AC-06, AC-12; no implementation exists | Unverified |
| ARCH-01 | Import/dependency checker shows preparation owns ingestion and consumers do not own raw-feed lifecycle | Architecture/import-graph checker; core/data owner | `ARCHITECTURE.md`; no source graph or adapter exists | Unverified |
| ARCH-02 | Guardrail checker scans browser-facing scopes for raw GTFS references; map/UI contract test proves prepared-data input | Architecture guardrail + integration test; map/UI owner | `ARCH-MAP-001` in `GUARDRAILS.json`; no application source exists | Unverified |
| ARCH-03 | Type/schema and cross-consumer tests show one definition of lineage and the shared status axes/values | Type/schema review and tests; core/data contract owner | Shared status contract, AGENTS.md SSOT rule; no types or tests exist | Unverified |
| ARCH-04 | Association checker/test rejects mismatched evidence verification and preserves separate version identifiers | Data contract test; access/data owner | D-009, AC-13; no implementation or checker exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- The source requirement is `Ready`; its priority is `high` and size is `L`.
- D-001 through D-009 in [`00-discussion.md`](00-discussion.md) are treated as approved source decisions, including official static GTFS, manual refresh, two-tier contest validation, limited calendar coverage, explicit recovery, note-only stale-data presentation, and separate transit/access version IDs.

### Deferred or implementation-facing decisions

- Final numeric Fresh/Aging/Stale thresholds remain deferred beyond the contest. Implementers MUST propagate a configured freshness state without inventing threshold values or UI promises.
- The `DATA-HARD-*`/`DATA-WARN-*` inventory is the explicit contract refinement of D-006/D-007. Changes to the classification require project-owner approval; implementation still needs a validator and fixtures to prove the gate.
- No implementation, test suite, fixture set, or source graph exists yet. Every verification row is therefore `Unverified`; the contract is not evidence that the behavior is implemented.
- A formal loop/termination contract is deliberately omitted. Validator iteration is ordinary finite record processing; replay, boundary, and golden fixtures are the useful correctness oracles.
