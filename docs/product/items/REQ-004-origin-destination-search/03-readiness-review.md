# REQ-004 — Origin and Destination Search — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| Actor and outcome are clear | Traveler selects two source locations for planning. | Pass |
| Scope is bounded | Search/resolution and current-location privacy are separated from routing and persistence. | Pass |
| Result and failure behavior are observable | Eight criteria cover local-first search, ambiguity, fallback, permission, provider failure, and mobile flow. | Pass |
| Privacy boundary is explicit | Current location is opt-in and session-only; no raw coordinate history is in scope. | Pass |
| Dependency is traceable | REQ-002 supplies the local stop index; REQ-001 consumes the result. | Pass with proposal |
| Alias/provider/ambiguity decisions are resolved | D-002–D-005 define the bounded alias set, confirmation rule, local-only contest fallback, and recoverable no-result behavior. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `M` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. External geocoder selection is intentionally deferred beyond the contest demo.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The search contract is specified and testable. Alias coverage, ambiguity handling, local-only contest behavior, recovery, mobile flow, and formal triage metadata are resolved; the item is ready for handoff.

## Handoff boundary

Engineering may implement the local-first search contract using the recorded local-first, ambiguity, recovery, and mobile behavior. External provider procurement and privacy governance remain separate later approvals.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
