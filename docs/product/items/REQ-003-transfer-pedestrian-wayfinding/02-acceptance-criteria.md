# REQ-003 — Transfer Connectivity and Confidence — Acceptance Criteria

Observable criteria for transfer-edge calculation and confidence.

## AC-01 — Evidence precedence

- Given two service endpoints that may be connected
- When Astara evaluates a transfer
- Then it checks and records evidence in the approved order of explicit transfer rule, shared station/platform relationship, and verified walking-graph evidence; a weaker source cannot silently overwrite a stronger contradiction, and proximity-only matches are retained only as non-routable review candidates.

## AC-02 — Valid connection versus proximity

- Given nearby stops or platforms without a supported connection
- When transfer evaluation runs
- Then proximity alone does not create a transfer edge; the result is excluded from routing and may be marked for review.

## AC-03 — Transfer duration components

- Given a usable walking path between endpoints
- When transfer cost is calculated
- Then the result exposes walking distance/time, any safety buffer, and cognitive decision cost as separate values rather than one unexplained duration.

## AC-04 — Confidence and limitation visibility

- Given verified, shared-station, missing, stale, or contradictory transfer evidence
- When the edge is returned
- Then an edge with a named source, source/snapshot or observation/review date, and no unresolved contradiction is `Terverifikasi`; a stale or contradictory edge is `Perlu dicek`; and each state/limitation is available to route selection and downstream explanation.

## AC-05 — Missing path or provider failure

- Given no usable walking path or a walking-provider failure
- When evaluation completes
- Then Astara returns a typed `limited` result when approved connection evidence exists, or `no-edge` when minimum connection evidence is absent; neither result is presented as a confirmed accessible path.

## AC-06 — Deterministic graph output

- Given identical snapshot, evidence, and rule configuration
- When the same endpoint pair is evaluated repeatedly
- Then the edge identity, confidence, duration components, and inclusion decision are reproducible.

## AC-07 — No-edge versus limited

- Given a candidate pair with either approved connection evidence but missing walking detail, or no connection evidence beyond coordinate proximity
- When transfer evaluation runs
- Then the first case remains a limited edge that exposes its limitation and may be consumed as a primary demo connection when no stronger/complete candidate exists or its configured trade-offs are materially better, while the second case is `no-edge`, excluded from routing, and retained only as a non-routable review candidate.

## AC-08 — Bounded initial verification scope

- Given a transfer hub or platform relationship outside the approved demo/golden journey set
- When its connection status is requested
- Then Astara does not claim it was manually verified; absent evidence remains limited/unknown and follows the same `no-edge` versus `limited` rules.

## AC-09 — No selectable accessibility profile

- Given the MVP transfer flow
- When a user plans a journey or a connection contains an explicit barrier
- Then no accessibility profile selector is shown, and the affected path is excluded or marked limited according to the barrier evidence; missing barrier data is never treated as accessible.

## Edge cases

- Verify explicit-rule conflict, same-station/different-platform, loop service, barrier, stale evidence, supported-but-incomplete path, proximity-only candidate, and provider-timeout fixtures.

## Verifiability

- AC-01–AC-09 → graph fixtures and route-engine assertions.
- Human-readable transfer language → REQ-012 acceptance criteria.
- Curated evidence lifecycle → REQ-014 acceptance criteria.
