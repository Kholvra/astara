# Design Contract: Route Comprehension User Validation

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-016`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `data/ML` (manual research evidence within the product-app)
- Scope: Approved study plan, bounded participant/case set, actual vertical slice, key-fact scoring, failure/accessibility observations, privacy, and proceed/iterate/stop report
- Owner: Astara developer/project owner as study-report owner; product/design team runs the approved sessions
- Risk: A technically correct route can still be misunderstood, while a small or leading study can produce an overbroad accessibility or product-readiness claim.
- Existing behavior: Specification/bootstrap phase; no study plan, participant records, session notes, scoring sheet, or report exists. REQ-006 owns route correctness and REQ-005 owns technical map performance/accessibility evidence.

## Intent and non-goals

This spike produces bounded manual evidence about whether representative participants can plan, understand, and recover from the assembled Astara journey flow. It converts observations into an explicit decision for the tested contest/demo scenarios.

It does not select/build the route engine, fix product defects, certify full accessibility/network correctness, implement analytics, profile users, or generalize a five-person result to all riders.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | Study plan to session | Cohort/consent boundary, scenarios, tasks, script, environment, rubric, timing method, viewport, and network condition; plan is untrusted until approved | Review completeness, privacy, participant scope, required risk scenarios, and the `360–412px` low-end mobile setup under ordinary mobile network conditions | Approved versioned study plan | Missing approval/consent/risk/environment coverage blocks sessions |
| TB-02 | Participant interaction to observations | Actual vertical-slice behavior, participant answers, completion time, recovery actions, confusion, and accessibility observations; raw human evidence | Record without leading prompts, separate correctness/confidence/time, anonymize as approved, and tie to case | Case-scoped anonymized session record | Unapproved/personal data is excluded/redacted; a missed observation remains unknown, not inferred |
| TB-03 | Observation to fact score | Answers against service/direction, boarding/alighting, transfer, timing/interval, and limitation rubric; analyst judgment is reviewable | Score mandatory facts and ≥4/5 within 60 seconds per scenario; classify contributing surface/data state | Reviewed scoring sheet with per-participant/case outcomes | Ambiguous/missing scoring is flagged; no favorable reinterpretation |
| TB-04 | Study results to release decision | Complete approved sessions, scores, failure categories, accessibility notes, and unresolved risks; report is evidence not universal truth | Reconcile cohort/cases, bound conclusions, and publish proceed/iterate/stop consequence | Reviewed bounded evidence report | Incomplete/overgeneralized report cannot support a release claim |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before recruiting/running sessions | Approved five-participant cohort/consent boundary, representative cases, tasks, moderator script, rubric, timing method, and a low-end mobile environment with a `360–412px` viewport and ordinary mobile network conditions exist; cohort planning prioritizes older/novice TJ users and includes relevant mobility/accessibility perspectives when available | Study owner/project owner | Do not run the study; report missing plan, consent, cohort, or environment decision |
| PRE-02 | Before a session is counted | Actual vertical slice includes origin/destination, timing, route card, map companion, status language, and at least one recovery path | Study + engineering owners | Mark session invalid for the gate; do not substitute a disconnected mock silently |
| PRE-03 | Before scoring a participant | Prompts are non-leading, scenario mandatory facts are defined, and notes are anonymized/within consent | Moderator/report owner | Exclude/review contaminated observation; do not count inferred correctness |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | The approved study plan identifies cohort/consent, direct/transfer/uncertainty cases, tasks, the `360–412px` viewport, ordinary mobile network condition, environment, script, rubric, and measurement | Plan version is tied to the sessions/report | Reproducible manual study setup exists |
| POST-02 | Sessions exercise the actual vertical slice and record per-case task completion, answers, timing, recovery, confusion, accessibility observations, device, viewport, and network condition | Raw/personal data remains within consent boundary; notes are anonymized as approved | Evidence is attached to participant/case without production analytics |
| POST-03 | Each participant/scenario score separately records five facts and applies mandatory-fact rule plus ≥4 of 5 within 60 seconds | Confidence is not substituted for correctness; timing is not conflated with fact score | Scoring sheet can be audited |
| POST-04 | Report classifies failures by input, timing, route choice, transfer, card, map, status language, recovery, technical/content/evidence cause | Defect ownership remains separated from comprehension result | Product/engineering receives actionable evidence |
| POST-05 | Report states per-scenario whether ≥4 of 5 participants meet the baseline; a miss requires fix or remove/narrow that demo claim | Result is bounded to tested participants/cases | Explicit proceed/iterate/stop recommendation is published |
| POST-06 | Report separates this human evidence from routing correctness, map performance/accessibility, production analytics, and full accessibility certification | Linked upstream evidence remains attributed to REQ-006/REQ-005 | Handoff receives a bounded decision artifact |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Study owner | Conclusions are bounded to the approved participants, cases, `360–412px` device/viewport, ordinary mobile network condition, and other conditions actually tested | Five participants certify the full network or all accessibility needs |
| INV-02 | Scoring owner | Correct understanding is scored against explicit facts: service/direction, boarding/alighting, transfer, timing/interval, and limitation; mandatory facts apply | Participant confidence or moderator interpretation replaces fact evidence |
| INV-03 | Moderator owner | Sessions use the actual vertical slice and non-leading prompts; missing/mock surfaces are recorded as study limitation | Leading participants or using a disconnected mock while claiming product comprehension |
| INV-04 | Privacy owner | Research notes/anonymized outcomes stay within approved consent; no production analytics, profile, login, or persistent raw research data is added | Unapproved identity/location data enters the report |
| INV-05 | Decision owner | 4-of-5 participant baseline is a gate only for tested contest/demo scenarios; a miss triggers fix or narrower claim, not reinterpretation | Aggregate success hides a failing tested scenario |
| INV-06 | Analysis owner | Comprehension failures are distinguishable from route/data/map/content/evidence defects and are not silently assigned to participants | Technical defect is reported as user inability without diagnosis |
| STATE-01 | Study owner | `draft plan → approved plan → sessions → scored analysis → reviewed report → proceed/iterate/stop`; plan/case/rubric change creates a new study version | Unapproved/partial session set produces a final decision |

## Failure and recovery semantics

- Missing consent/plan/environment or a disconnected vertical slice blocks or invalidates the affected session; it is not counted as evidence for the baseline.
- Wrong direction, missed transfer, exact-interval misunderstanding, missed limitation, map difficulty, recovery failure, or assistive-technology barrier is recorded by case and contributing surface.
- A scenario that misses the 4-of-5 gate requires a product/engineering fix or removal/narrowing of that demo claim. The study does not silently lower the threshold.
- No full accessibility, route correctness, network coverage, or production analytics claim is made from this spike; those domains retain their own owners/contracts.
- If participant data is incomplete or contaminated by leading prompts, the report marks the gap and does not infer a pass.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | REQ-016 observes the assembled route/card/map/planner flow; it does not select/build routes or modify implementation during the study. | Study + engineering owners | Keeps evidence separate from the system under observation. |
| ARCH-02 | Human comprehension, route correctness, and technical map/accessibility performance are separate evidence streams owned by REQ-016, REQ-006, and REQ-005. | Product/validation owners | Prevents one small study from substituting for other gates. |
| ARCH-03 | Research records remain a bounded manual/anonymized artifact and are not production analytics or persistent user profile data. | Study/privacy owner | Preserves consent and privacy boundary. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Plan, consent, exact mobile environment, session notes, scoring, and report review reconcile all approved cases/participants and claim boundaries | Research artifact review; study owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06; no artifacts exist | Unverified |
| PRE-01, PRE-02, PRE-03 | Study cannot count missing plan/vertical-slice/consent or leading-prompt sessions as valid evidence | Study checklist/review; project owner | AC-01, AC-02, AC-03; no study exists | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06 | Approved plan, exact mobile conditions, actual slice, five-fact score, failure taxonomy, gate consequence, and bounded report are present | Manual session/report review; study owner | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06; no evidence exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Analysis audit shows no generalization, confidence substitution, mock substitution, privacy breach, hidden failing scenario, or defect misclassification | Research quality review; project owner | Constraints, AC-03, AC-04, AC-05, AC-06; no report exists | Unverified |
| STATE-01 | Study artifact versions and proceed/iterate/stop lifecycle are reviewable | Process/state checklist; study owner | AC-01, AC-06; no artifacts exist | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Handoff review proves study does not change route/map code or replace technical/route gates/analytics | Domain-boundary review; architecture/product owner | REQ-006, REQ-005 scope; no implementation exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-016 is `Ready`, priority `high`, size `M` (spike).
- D-003 through D-007 in [`00-discussion.md`](00-discussion.md) are treated as approved, including five bounded participants, representative scenarios, five-fact rubric, 4-of-5 gate, low-end mobile context, and report ownership.

### Deferred or implementation-facing decisions

- Participant recruitment details, consent wording, moderator script, and case IDs must be recorded in the approved study plan; this contract does not invent them.
- No study artifacts or manual evidence exist; all verification statuses are `Unverified`.
- A formal loop/termination proof is deliberately omitted; finite session/case reconciliation and report completeness are the appropriate oracles.
