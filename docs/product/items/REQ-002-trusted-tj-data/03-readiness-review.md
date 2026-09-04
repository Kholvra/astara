# REQ-002 — Trusted TransJakarta Network Data — Readiness Review

## Verdict

`Ready`

## Definition of Ready — evidence

| Check | Evidence | Status |
|---|---|---|
| Consumer and outcome are clear | Maintainer/operator outcome and downstream consumers are named. | Pass |
| Scope boundary is explicit | Static lifecycle is separated from routing, access curation, search, and realtime. | Pass |
| Data behavior is observable | Thirteen criteria cover provenance, validation, publication, fallback, freshness, limitation handling, recovery, access-evidence association, and no-valid-data behavior. | Pass |
| Source constraints are documented | Official GTFS Static and known feed limitations are recorded. | Pass |
| Failure/recovery behavior is defined | Rejected snapshots preserve the last valid snapshot; the Astara developer owns manual recovery and first-run failure remains explicit. | Pass |
| Freshness and warning policy are approved | Contest/demo pinned-snapshot use, two-tier warning gate, limited calendar handling, manual refresh scope, note-only UI treatment, manual recovery ownership, and access-evidence version association are resolved; long-term thresholds remain deferred. | Pass |
| Priority and size are approved | Project owner approved priority `high` and size `L` in the 2026-09-04 triage; item metadata matches the backlog. | Pass |

## Blockers / decisions needed

None identified for the Domain 1 handoff. Long-term freshness thresholds remain intentionally deferred beyond the contest.

## Agent suggestions awaiting approval

None identified; the priority, size, and execution-sequence proposal is approved.

## Readiness status

The lifecycle and data contract are specified, and the contest/demo publish gate, calendar limitation, pinned data, manual refresh, note-only UI behavior, manual recovery ownership, and access-data versioning are resolved. The item is ready for engineering handoff; long-term freshness thresholds remain deferred beyond the contest.

## Handoff boundary

Engineering may implement ingestion/validation using the recorded source, gate, freshness, fallback, and access-version decisions. Provider operations and infrastructure changes belong to later domains.

## Links

- [Discussion](00-discussion.md)
- [Acceptance criteria](02-acceptance-criteria.md)
- [Master backlog](../../backlog.md)
