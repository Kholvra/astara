# REQ-013 — Trip Timing, Fare, and Preference Controls — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| User outcome is clear | Traveler controls departure intent and sees honest timing/fare status. | Pass |
| Scope is bounded | Controls are separated from route scoring, payment, realtime, and large preference matrices. | Pass |
| Boundary semantics are explicit | Calendar, timezone, after-midnight, frequency, and fare uncertainty are documented. | Pass |
| Acceptance is observable | Nine criteria cover input, recovery, interval honesty, fare, fixed-policy behavior, depart-at-only scope, and mobile controls. | Pass |
| Dependency is traceable | REQ-002 supplies schedule semantics; REQ-001 consumes the normalized input and fixed scoring policy. | Pass with proposal |
| MVP timing/preference/fare decisions are resolved | D-003–D-008 resolve depart-at-only, no user-selectable preference, contest fare boundary, invalid/no-service correction, and mobile controls. | Pass |
| Incomplete-fare claims are bounded | D-005 and AC-05 omit unsupported amounts and expose the approved limitation label. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `M` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. Future numeric fare enablement remains outside the contest demo.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The control outcome is specified. Depart-at-only, no-preference simplicity, contest fare boundary, correction policy, mobile controls, and formal triage metadata are resolved; the item is ready for handoff.

## Handoff boundary

Engineering may implement normalization and controls using the recorded timing recovery and contest fare boundary. Fare-provider integration and payment remain outside the item.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
