# REQ-005 — Map Companion Experience — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| Actor and outcome are clear | Traveler uses a synchronized map companion for a selected route. | Pass |
| Scope is bounded | Map/geometry is separated from route selection, card content, search, access maintenance, and navigation. | Pass |
| Rendering contract is explicit | MapLibre, coordinate order, leg semantics, payload boundary, provider configuration, and attribution are documented. | Pass |
| Failure behavior is observable | AC-06 keeps the card usable through map/provider failure. | Pass |
| Unknown walking-geometry behavior is resolved | D-003 and AC-02/AC-06/AC-08 prohibit speculative paths and keep limited status visible. | Pass |
| Accessibility/performance are measurable | D-005 and D-008 define mobile budgets, one-column behavior, touch/focus expectations, and non-color cues without claiming full certification. | Pass |
| Provider/budget/geometry decisions are resolved | D-004–D-008 define contest provider configuration, budgets, selected-route loading, and ambiguous clipping fallback; public provider procurement remains deferred. | Pass |
| Priority and size are approved | Project owner approved priority `medium` and size `M` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. Public provider procurement remains a later operational decision.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The map outcome is coherent and testable. Contest provider configuration, selected-route loading, geometry fallback, mobile layout, initial budgets, and formal triage metadata are resolved; public provider procurement remains outside the contest handoff.

## Handoff boundary

Engineering may implement the renderer and payload contract using the recorded contest provider configuration, budgets, geometry fallback, and mobile/accessibility scope. Deployment/provider operations and any full navigation are outside this item.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
