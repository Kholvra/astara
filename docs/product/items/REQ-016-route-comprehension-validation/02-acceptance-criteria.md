# REQ-016 — Route Comprehension User Validation — Acceptance Criteria

Observable criteria for the manual comprehension-validation spike.

## AC-01 — Approved study plan

- Given an intended MVP validation study
- When the plan is approved before sessions
- Then it names the participant cohort/consent boundary, direct and transfer/uncertainty cases, tasks, environment, moderator script, scoring rubric, and measurement method.

## AC-02 — Actual vertical slice

- Given a participant running an approved scenario
- When they use Astara
- Then the session exercises the real origin/destination selection, timing input, route card, map companion, status language, and at least one recovery path rather than a disconnected mock of one surface.

## AC-03 — Key-fact comprehension measure

- Given a participant who completes an approved route task
- When they are asked to reproduce the defined key facts without leading prompts
- Then the report records correctness for service/direction, boarding/alighting, transfers, timing/interval, and relevant data limitations separately from confidence or completion time, and applies the approved four-of-five fact rubric with mandatory scenario facts.

## AC-04 — Working success baseline

- Given the approved five-participant baseline and under-one-minute measure
- When the sessions are analyzed
- Then the report states whether at least 4 of 5 participants reproduced at least four of five facts within 60 seconds for each approved scenario; a miss triggers fix or scope narrowing for that demo scenario and is not generalized beyond the tested cohort/cases.

## AC-05 — Failure and accessibility evidence

- Given a participant confusion, wrong route fact, missed status, map difficulty, recovery failure, or assistive-technology barrier
- When the session is documented
- Then the issue is categorized by contributing surface/data state and the report states whether it is a comprehension, technical, content, or evidence limitation.

## AC-06 — Decision report

- Given all approved sessions and observations
- When the spike closes
- Then Astara publishes a bounded report with findings, unresolved risks, recommended changes, and an explicit proceed/iterate/stop decision; no production analytics or unsupported accessibility certification is implied.

## Edge cases

- Verify direct, transfer, interval/fare uncertainty, stale/unknown status, no-route/error recovery, map-unavailable, and assistive-technology scenarios when included in the approved plan.

## Verifiability

- AC-01–AC-06 → approved plan, anonymized session notes, scoring sheet, and reviewed decision report.
- Technical route correctness → REQ-006; map budgets/technical accessibility → REQ-005.
