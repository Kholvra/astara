# REQ-006 — Routing Correctness Benchmark — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| Decision outcome is clear | The spike ends in an engine/route-contract recommendation with evidence. | Pass |
| Scope is bounded | Correctness is separated from human comprehension, map performance, and implementation. | Pass |
| Case and assertion shape are observable | Six criteria define fixtures, repeatability, facts, explanations, comparison, and decision output. | Pass |
| Known data risks are covered | The required case categories include calendar, frequency, transfer, geometry, stale, and no-route behavior. | Pass |
| Dependency is traceable | REQ-002 supplies the snapshot; REQ-001/003/005/016 consume related outcomes. | Pass with proposal |
| Oracle, threshold, and case ownership are resolved | D-003–D-006 define the stratified case set, OTP-first comparison, two-tier threshold, owner, and boundaries with REQ-005/REQ-016. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `M` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. Running the benchmark is the execution step defined by this ready spike.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The benchmark design, oracle, threshold, ownership, downstream boundaries, and formal triage metadata are resolved. The spike is ready for execution handoff.

## Handoff boundary

Engineering may build the fixture runner and comparison report once the approved snapshot is available. Engine implementation and production data operations remain later work.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
