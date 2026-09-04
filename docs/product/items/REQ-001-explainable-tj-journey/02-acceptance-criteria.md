# REQ-001 — TJ Route Selection — Acceptance Criteria

Observable criteria for the primary-route selection contract.

## AC-01 — Candidate coverage

- Given an origin and destination that resolve to supported TransJakarta stops or access points
- When route selection runs against an approved snapshot
- Then candidate journeys may use every supported regular TJ service represented by that snapshot, including valid feeder or Mikrotrans connections, rather than a single hand-authored corridor.

## AC-02 — Time-dependent service behavior

- Given a planning date and local time
- When the selected route is evaluated
- Then inactive calendar dates, after-midnight service times, and frequency intervals are interpreted according to the published data contract, and no `exact_times=0` interval is displayed as an exact departure promise.

## AC-03 — Route facts are observable

- Given one or more valid candidates
- When the route result is returned
- Then each candidate used for ranking has an ordered leg list containing, where available, service identity, direction/headsign, boarding stop, alighting stop, transfer count, walking segments, duration components, and source/freshness references.

## AC-04 — Primary choice is explainable

- Given candidates with different measurable trade-offs
- When the primary route is selected
- Then the result applies the fixed order of valid service, fewer transfers/decision points, supported walking, duration, evidence completeness when comparable, and stable route-ID tie-break, and contains the scoring inputs, tie-break outcome, and reason fields; no user preference choice is required.

## AC-05 — Stable downstream contract

- Given a successful selection
- When REQ-005 or REQ-012 consumes the result
- Then the same route identity, leg order, stop references, geometry references, timing facts, and evidence statuses remain consistent across those surfaces.

## AC-06 — No route or unsupported data is explicit

- Given no valid candidate, an unsupported mode, or evidence below the approved recommendation threshold
- When selection completes
- Then Astara returns a typed no-route or limited-data outcome with the reason and a recovery/input action; a candidate is eligible only with routable origin/destination identities, active service for the depart-at input, and approved evidence for every transfer. `no-edge` transfers are excluded, and a retained `limited` candidate exposes its limitation rather than returning a plausible-looking route with missing facts hidden.

## AC-07 — Determinism and lineage

- Given identical snapshot ID, input, and scoring configuration
- When selection is run repeatedly
- Then the primary result and reason fields are reproducible, and the output identifies the snapshot/source lineage used.

## AC-08 — Limited primary fallback

- Given a supported candidate with incomplete walking/access detail and no candidate with stronger/complete evidence
- When primary-route selection completes for the contest/demo
- Then Astara returns the supported candidate as the primary route under the contest/demo fallback policy, preserves its `limited` status and reason fields, and never treats the candidate as a confirmed accessibility claim.

## AC-09 — Evidence-completeness preference

- Given comparable valid candidates where one has complete evidence and another is a supported `limited` candidate
- When contest/demo ranking applies its configured trade-offs
- Then the complete-evidence candidate wins the evidence preference when the earlier fixed-policy trade-offs are comparable; the `limited` candidate is eligible to win only when it wins an earlier criterion or is the only viable candidate, with its status and reason preserved.

## AC-10 — Fixed scoring without user preference

- Given an MVP planning request containing only resolved places and a local depart-at input
- When route selection ranks candidates
- Then it applies the fixed documented scoring policy without asking the user to select a preference or slider, and returns the observable facts used in the explanation.

## Edge cases

- Verify direct service, transfer hub, feeder/Mikrotrans, loop, duplicate-platform, weekend, after-midnight, inactive-service, stale-feed, and no-route fixtures.
- Verify a tie or trade-off does not silently change when candidate iteration order changes.

## Verifiability

- AC-01–AC-10 → automated golden-case oracle and contract assertions from REQ-006.
- Edge cases → named fixtures with expected route facts and statuses.
- User-visible reason/status wording → REQ-012 acceptance criteria.
