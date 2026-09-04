# REQ-006 — Routing Correctness Benchmark — Acceptance Criteria

Observable criteria for the routing decision spike.

## AC-01 — Approved reproducible case set

- Given an approved list of at least 30 golden cases, expandable to 50
- When the benchmark is checked into the validation artifact
- Then the stratified set covers the documented risk categories and each case has origin, destination, local date/time, snapshot ID, expected route facts, any tolerance, and a rationale approved by the fixture owner.

## AC-02 — Repeatable execution

- Given the same fixture set, snapshot, timezone, and configuration
- When the benchmark is run more than once
- Then it produces comparable candidate outputs and assertion results, with any nondeterminism recorded as a failure or limitation.

## AC-03 — Routing fact assertions

- Given a candidate route output
- When the benchmark evaluates it
- Then it checks stop order, service identity/direction, transfers, active calendar/time semantics, walking components, geometry continuity and coordinate order, and no-route behavior against the approved expected facts.

## AC-04 — Evidence and explanation assertions

- Given a candidate recommendation with reason fields
- When the benchmark inspects it
- Then the reason can be reconstructed from route facts/scoring fields, and stale, missing, or unknown data is not represented as verified.

## AC-05 — Candidate comparison and failure report

- Given OTP and an approved alternative candidate
- When both run against the same cases
- Then the report compares pass/fail results, mismatches, categories, and limitations without hiding cases that one candidate cannot answer.

## AC-06 — Explicit decision output

- Given the approved threshold and benchmark results
- When the spike is complete
- Then it applies 100% critical-fact correctness for selected demo cases and at least 90% fact-level correctness across the broader set, records whether the evidence supports OTP, a custom engine, or further investigation, identifies unresolved risks, and does not claim that a small case set certifies the whole network.

## Edge cases

- Verify active/inactive date, after-midnight, frequency, direct, transfer, loop, duplicate-platform, stale-data, barrier/unknown, contradictory-edge, and no-route cases.

## Verifiability

- AC-01–AC-06 → versioned fixtures, deterministic benchmark command/report, and review of the decision record.
- User comprehension → REQ-016; map performance/accessibility → REQ-005.
