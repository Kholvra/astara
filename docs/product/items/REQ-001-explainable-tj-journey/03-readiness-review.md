# REQ-001 — TJ Route Selection — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| Actor and outcome are clear | Requirement summary identifies the traveler and a primary route result. | Pass |
| Scope boundary is explicit | Candidate selection is separated from card, map, access maintenance, planner state, and user research. | Pass |
| Behavior is observable | Ten acceptance criteria cover success, time semantics, unsupported data, determinism, fixed scoring, evidence preference, limited-primary fallback, and downstream consistency. | Pass |
| Limited-primary fallback is resolved | D-006 and AC-08 permit a supported limited candidate only when no stronger/complete candidate is available, while preserving its status. | Pass |
| Evidence-completeness preference is resolved | D-007 and AC-09 prefer complete evidence for comparable trade-offs without inventing a numeric score. | Pass |
| User-selectable preference scope is resolved | D-009 and AC-10 keep preference controls out of the MVP while preserving fixed-policy explanation facts. | Pass |
| Dependencies are traceable | REQ-002, REQ-003, REQ-004, and REQ-013 are named in metadata and the consumer list; REQ-006 remains a validation gate rather than a runtime edge. | Pass |
| Validation path exists | REQ-006 provides the approved golden-case and engine comparison gate. | Pass |
| Human decisions are resolved | D-010–D-011 resolve fixed scoring, explanation facts, and the minimum recommendation evidence; depart-at timing, no-preference scope, one-primary-route behavior, and REQ-003 transfer-state handling are also resolved. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `L` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. REQ-006 validation and REQ-013 recovery are recorded downstream gates, not unresolved decisions.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The route-selection behavior, key product decisions, and formal triage metadata are resolved. The item is ready for engineering handoff, with REQ-006 providing the separate correctness evidence gate.

## Handoff boundary

Engineering may receive the route-selection contract when its listed upstream data, transfer, search, and timing contracts are available; scoring, time, evidence, and explanation decisions are already recorded. Implementation, engine setup, and tests belong to the next domain.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
