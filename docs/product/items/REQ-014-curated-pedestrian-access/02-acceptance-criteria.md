# REQ-014 — Curated Pedestrian Access Evidence — Acceptance Criteria

Observable criteria for curated access evidence and its lifecycle.

## AC-01 — Evidence record contract

- Given a new access observation for an approved hub or journey point
- When a record is created
- Then it contains stable location/hub identity, access type, status, source, observed date, review date when reviewed, confidence, and supporting note/evidence fields.

## AC-02 — Review before verified publication

- Given a draft access record
- When it is submitted for publication
- Then the approved evidence checks and reviewer decision are recorded, and a record missing stable identity, named source, observation date, supporting evidence, or manual review cannot be labeled `Terverifikasi`.

## AC-03 — Contest lifecycle and retirement

- Given a published record in the contest snapshot
- When it is contradicted or no longer supports a claim
- Then the maintainer manually marks it `Perlu dicek` or retired, the prior observation remains traceable, and downstream consumers receive the non-current status; automatic aging thresholds are not implied.

## AC-04 — Contradiction and barrier handling

- Given two conflicting observations or an explicit physical barrier
- When the records are reviewed
- Then the contradiction/barrier is retained and exposed according to policy, the review demotes or excludes the affected claim as applicable, and the product does not silently choose a positive claim or label the point accessible by default.

## AC-05 — Unknown and limited coverage

- Given no evidence for a point or a point outside the curated set
- When a consumer requests access status
- Then Astara returns a typed unknown/limited status with the coverage limitation, and user-facing surfaces display `Data terbatas` or `Perlu dicek`; it does not infer accessibility from proximity, missing tags, or absence of a reported barrier.

## AC-06 — Consumer-safe status

- Given verified, aging, stale, retired, barrier, or unknown evidence
- When REQ-003, REQ-005, or REQ-012 consumes it
- Then the status, confidence, provenance reference, and applicable limitation remain consistent and user-visible claims do not exceed the record.

## AC-07 — Current contest/demo no-data baseline

- Given an access point for which no pedestrian/access record has been gathered
- When a consumer requests its status
- Then Astara returns `Unknown`/limited coverage, never `Terverifikasi`; REQ-003, REQ-005, and REQ-012 preserve that limitation and do not infer a path or accessibility outcome.

## Edge cases

- Verify missing provenance, conflicting observations, expired evidence, temporary barrier, inaccessible lift, no record, and out-of-boundary point.

## Verifiability

- AC-01–AC-04 → schema, lifecycle, review, and contradiction fixtures.
- AC-05–AC-07 → consumer contract and content/status review.
