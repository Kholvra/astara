# Design Contract: Routing Correctness Benchmark

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-006`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `data/ML` (benchmark artifact within the product-app)
- Scope: Versioned golden fixtures, OTP-first comparison, route-fact assertions, deterministic replay, failure classification, threshold application, and engine decision report
- Owner: Astara developer/project owner for fixture/report maintenance; route-engine decision owner consumes the evidence
- Risk: A benchmark without an approved oracle can certify plausible but wrong routes, hide critical mismatches, or turn a small sample into an unsupported network-wide claim.
- Existing behavior: Specification/bootstrap phase; no fixture runner, approved golden cases, candidate engine, report, or tests exist. REQ-002 supplies the snapshot contract; REQ-005 and REQ-016 own separate map and human evidence gates.

## Intent and non-goals

This spike produces reproducible evidence for route correctness and an explicit engine/route-contract decision. It is a decision gate, not a promise to build or productionize a custom engine.

It does not define human comprehension, map performance/accessibility, final card copy, production analytics, or universal certification of the full network.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Fixture authoring to benchmark oracle | Origin/destination/time, snapshot ID, expected facts, tolerances, rationale, and risk category; author input is untrusted until approved | Validate schema, required fields, snapshot/timezone/config references, case category, and owner approval | Versioned approved fixture with traceable expected facts | Missing approval/fields makes fixture ineligible; it cannot silently become an oracle |
| TB-02 | Candidate engine to assertion runner | OTP or approved alternative output; candidate output is untrusted evidence | Normalize comparable route output and assert stop/order/direction/time/geometry/walking/status/explanation facts | Candidate result plus assertion outcomes and mismatch details | Missing/unanswerable output is recorded as failure/limitation, not dropped |
| TB-03 | Assertion results to decision report | Pass/fail/mismatch categories, thresholds, limitations, and candidate comparison; report input is derived but reviewable | Reconcile counts to the complete fixture set, distinguish critical cases, and preserve exact mismatches | Reviewed evidence report and engine recommendation | Incomplete/contradictory report cannot support an engine claim |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before benchmark execution | At least 30 approved stratified cases exist, each with expected facts, rationale, snapshot ID, local date/time, tolerance, and owner | Fixture owner | Stop execution and report missing oracle coverage |
| PRE-02 | Before comparing runs | Snapshot ID, timezone, route rules, fixture version, and candidate configuration are fixed and recorded | Benchmark owner | Mark run incomparable; do not merge results as one benchmark |
| PRE-03 | Before alternative comparison | OTP runs first as offline oracle/benchmark; a custom alternative is explicitly approved for the same fixture set | Decision owner | Do not compare or infer a custom-engine requirement |

## Benchmark scoring and decision rule

- Each fixture declares five observable fact assertions: service/direction, boarding/alighting, transfer, timing/interval, and limitation, plus any additional route facts needed by the case. It marks which facts are mandatory and which facts are critical for the demo gate.
- An assertion passes only when the candidate matches the approved expected value, or the fixture’s explicit tolerance. A missing, unanswerable, or nondeterministic assertion is a failure for threshold purposes and remains separately labeled in the report.
- `criticalCorrectness` is 100% only when every critical assertion in every selected demo case passes. One failed or unanswerable critical assertion fails that demo case and blocks its claim.
- `factLevelCorrectness` is the micro-average `passed applicable assertions / total applicable assertions` across the complete broader fixture set. Failed and unanswerable assertions remain in the denominator; no case may be dropped or silently reweighted.
- A candidate can receive a `proceed for tested scope` recommendation only when critical correctness is 100%, fact-level correctness is at least 90%, and no nondeterminism remains unexplained. A critical miss produces `iterate` and blocks/removes/narrows the affected demo claim. A broader miss produces `investigate/iterate` and cannot be reported as sufficient evidence for that candidate.
- OTP is evaluated first. If OTP meets the gate, the report may recommend OTP for the tested scope. A custom candidate may be recommended only when OTP has a recorded required gap and the custom candidate meets the same gate; otherwise the report recommends further investigation. None of these outcomes certifies the full network.

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | The fixture artifact contains the approved minimum case count and all required risk strata, with expected route facts and rationale | Fixture version, snapshot, timezone, and tolerances remain immutable for the run | A replayable benchmark input is checked into the validation artifact |
| POST-02 | A run evaluates every fixture against the candidate(s), captures output and assertion results, and records nondeterminism | Cases a candidate cannot answer remain visible | A complete run report is produced |
| POST-03 | Assertions cover stop order, service/direction, transfers, calendar/time, walking, geometry continuity/order, no-route, explanation lineage, and stale/unknown status | `[longitude, latitude]`, after-midnight, interval, and limitation semantics are preserved | Mismatches are categorized by data, transfer, time, geometry, explanation, or engine limitation |
| POST-04 | Candidate comparison uses the same fixtures/configuration and reports pass/fail, mismatch, limitation, and unanswerable cases without hiding failures | OTP and approved alternatives remain distinguishable | Comparison evidence feeds the decision report |
| POST-05 | The report applies the declared scoring formula: 100% critical-fact correctness for selected demo cases and ≥90% fact-level correctness for the broader set | A critical miss blocks/fixes/removes or narrows the related demo claim; a broader miss cannot receive a proceed recommendation; no universal guarantee follows | Report recommends OTP, a custom approach, or further investigation using the declared decision rule and names unresolved risks |
| POST-06 | Every candidate’s denominator, passed/failed/unanswerable counts, critical-case result, nondeterminism, and final recommendation reconcile to the complete fixture set | No failed or unanswerable case is omitted or reweighted after execution | The decision report is independently recomputable from fixture and assertion records |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Fixture owner | Expected answers are manually approved, traceable, versioned, and distinct from candidate output | “Looks plausible” or candidate output becomes its own oracle |
| INV-02 | Benchmark owner | Same fixture/snapshot/timezone/config produces comparable output/assertions; nondeterminism is a recorded failure/limitation | Run metadata changes silently or flaky results are averaged away |
| INV-03 | Assertion owner | Critical demo facts are exact; broader cases use the declared micro-average; failed and unanswerable facts remain in the denominator; no hidden critical mismatch is masked by aggregate score | A high aggregate score passes with a critical demo mismatch, omitted failure, or silent reweighting |
| INV-04 | Report owner | Every mismatch and unanswerable case remains visible with category, limitation, and case identity | Failed cases are omitted from comparison/report |
| INV-05 | Decision owner | Benchmark evidence is bounded to the approved cases and cannot certify the entire network, accessibility, map performance, or human comprehension | Small sample is presented as universal route correctness |
| INV-06 | Scoring owner | The same fixture-set scoring formula and decision consequences are applied to OTP and every approved alternative; critical failure always blocks a proceed recommendation | Candidate-specific denominator, threshold, or failure consequence changes after seeing results |
| STATE-01 | Benchmark owner | `draft fixture → approved fixture → executed run → reviewed report → decision` is legal; fixture/config changes create a new version/run; a report may conclude proceed, iterate, or investigate | Unapproved fixture or partial run produces an engine decision |

## Failure and recovery semantics

- Missing/invalid fixture or expected fact stops the affected benchmark artifact before scoring; it is not counted as a passing case.
- Candidate timeout, unsupported output, wrong direction, geometry mismatch, stale-status mismatch, or no-route disagreement is retained as a categorized result.
- Nondeterminism is a failure/limitation that blocks a confident decision until explained or bounded.
- A missed critical fact blocks the related demo claim until fixed or removed/narrowed. A broader threshold miss produces `investigate/iterate` and cannot receive a `proceed for tested scope` recommendation under the scoring rule.
- Benchmark failure does not automatically build or change a route engine. REQ-001/REQ-005/REQ-016 retain their separate contracts.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | The benchmark is a validation/decision tool. It consumes the same route/data contract but does not become a runtime dependency of route selection or the demo planner. | Benchmark/route owners | Keeps evidence independent from production execution; no source graph exists. |
| ARCH-02 | Fixture expected facts and decision reports are versioned validation artifacts; production route code MUST NOT mutate them during a run. | Fixture owner | Preserves oracle integrity and reproducibility. |
| ARCH-03 | Human comprehension and map performance/accessibility results remain owned by REQ-016 and REQ-005; this spike may link them but MUST NOT claim their evidence. | Decision owner | Prevents mixed release gates and unsupported conclusions. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03 | Schema/review rejects unapproved fixtures, preserves all candidate failures, and reconciles report counts | Fixture/schema/review checks; benchmark owner | AC-01, AC-05, AC-06; no artifacts exist | Unverified |
| PRE-01, PRE-02, PRE-03 | Runner refuses insufficient case set, mismatched run metadata, or unapproved alternative | Benchmark preflight; benchmark owner | AC-01, AC-02, AC-05; no runner exists | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06 | Versioned fixture, complete assertions, declared counts/formula, same-config comparison, and deterministic threshold decision appear in report | Benchmark integration run; decision owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06; no fixtures/runner/report exist | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Negative/replay cases prove oracle integrity, critical gating, denominator preservation, failure visibility, candidate-consistent consequences, and bounded claims | Replay/property/report review; benchmark owner | Constraints, AC-02, AC-04, AC-05, AC-06; no evidence exists | Unverified |
| STATE-01 | Artifact lifecycle and new-version behavior are reviewable | Process/state checklist; fixture/report owner | AC-01, AC-06; no artifact exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Source/dependency review shows benchmark is separate from runtime engine, fixtures are immutable during run, and other gates stay separate | Architecture/repository review; architecture owner | REQ-006 scope, `ARCHITECTURE.md`; no source exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-006 is `Ready`, priority `high`, size `M` (spike).
- D-003 through D-006 in [`00-discussion.md`](00-discussion.md) are treated as approved, including 30-case stratification, OTP-first comparison, thresholds, ownership, and separate map/user gates.

### Deferred or implementation-facing decisions

- The actual 30–50 case inventory, expected answers, and candidate configuration remain execution artifacts to be approved by the fixture owner; this contract does not invent cases.
- The five-fact assertion set, micro-average denominator, unanswerable-case treatment, and OTP/custom decision consequences are now explicit contract rules; fixture-specific mandatory/critical flags remain execution artifacts.
- No runner, fixture, report, or engine comparison evidence exists; all verification statuses are `Unverified`.
- A formal loop proof is deliberately omitted: the runner’s finite case set is adequately verified by complete iteration, case-count reconciliation, and replay evidence.
