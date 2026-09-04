# REQ-012 — Route Card and Journey Instructions — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| User outcome is clear | Traveler can read and follow one selected journey without map interpretation. | Pass |
| Scope is vertical | Card content is separated from routing, map rendering, and access maintenance. | Pass |
| Facts and claims are bounded | Traceability and uncertainty invariants prohibit invented detail. | Pass |
| Acceptance is observable | Ten criteria cover summary, reason, ordering, status, terminology, incomplete data, transfer-state boundaries, ambiguity, and mobile card flow. | Pass |
| Upstream contracts are named | REQ-001, REQ-003, and REQ-014 are dependencies; REQ-005/013/015 are related consumers. | Pass with proposal |
| Content decisions are resolved | D-006–D-008 resolve the above-the-fold fact hierarchy, glossary ownership/wording, and mobile card-first behavior; unknown-evidence, limited-primary, and evidence-completeness presentation behavior are resolved by D-004–D-005. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `M` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff; the card contract and mobile baseline are specified.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The card outcome is fully decomposed and testable. Content hierarchy, glossary ownership/wording, unknown pedestrian-data behavior, mobile card-first flow, and formal triage metadata are resolved; the item is ready for handoff.

## Handoff boundary

Engineering may implement the card when the upstream route/evidence contracts are available; content hierarchy, glossary, and mobile behavior are already recorded. User research remains a separate follow-up workstream.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
