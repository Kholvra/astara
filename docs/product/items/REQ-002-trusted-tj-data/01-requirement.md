# REQ-002 — Trusted TransJakarta Network Data — Requirement

## Metadata

```yaml
id: REQ-002
slug: trusted-tj-data
type: chore
status: ready
priority: high
size: L
depends_on: []
related_to: [REQ-001, REQ-003, REQ-004, REQ-006, REQ-013, REQ-014]
profile: product-app
links: {}
```

## Summary

Astara maintainers need a traceable, validated, and freshness-aware TransJakarta static network snapshot so route selection and user-facing claims are based on known data rather than silent guesses.

## Actors / consumers

- Primary actor: Astara data maintainer or operator.
- Consumers: route selection, transfer connectivity, origin/destination search, timing controls, access evidence, and validation fixtures.
- Secondary consumer: traveler who sees source, freshness, or limited-data status.

## Scope

### In scope

- Acquire the approved official TransJakarta GTFS Static source and retain immutable raw snapshots.
- Normalize the supported network entities needed by downstream consumers: routes, stops, trips, stop times, shapes, calendars, frequencies, and explicit transfers where present.
- Run structural and semantic validation before publication.
- Classify validation findings using the contest/demo two-tier gate and review the pinned snapshot manually before the demo.
- Preserve source URL, download time, HTTP metadata, content hash, feed version when available, validation result, and snapshot ID.
- Associate curated pedestrian/access evidence through its own version ID and declared transit snapshot ID.
- Provide a maintainer-controlled manual download/import workflow for the official TJ Static GTFS file.
- Assign the Astara developer as the contest/demo owner for manual snapshot recovery and installation.
- Assign freshness state and retain the last valid snapshot when a newer snapshot fails publication gates.
- Make snapshot lineage and data-status information available to downstream product surfaces.

### Explicitly out of scope

- Route candidate scoring or route-engine implementation; see REQ-001 and REQ-006.
- Curation of physical pedestrian-access evidence; see REQ-014.
- Generic geocoder behavior; see REQ-004.
- Realtime vehicle or disruption updates; see REQ-007.
- Automated scheduled refresh, TransJakarta partnership/SSO, private endpoint access, or authenticated integration.
- User-facing route-card copy beyond the source/freshness fields consumed by REQ-012.

## Constraints & invariants

- Official TJ GTFS Static is the MVP network source unless a decision explicitly changes it.
- `calendar.txt` is evaluated for the requested service date. GTFS times above `24:00:00` are valid service-day values.
- When `calendar_dates.txt` is absent, calendar-exception coverage is unknown and must remain visibly limited.
- `frequencies.txt` with `exact_times=0` denotes intervals/headways, not exact scheduled departures.
- A failed validation cannot silently replace the last valid published snapshot.
- Every normalized record exposed to a route consumer must be traceable to a snapshot ID and source metadata.
- Access evidence may be treated as verified only when its declared transit snapshot ID matches the active snapshot; a mismatch or absent record remains limited and does not silently block the transit route.
- Missing `feed_info.txt`, `calendar_dates.txt`, or `pathways.txt` is a known limitation, not evidence that those concepts are complete.
- For the contest/demo scope, a pinned last-known-good snapshot may drive route and search results when a clear static/demo-data note says schedules may change; it must not be presented as current or realtime. The snapshot/download date and internal freshness state remain provenance metadata and are not required as UI labels.
- For the contest/demo validation gate, missing core files, malformed rows, invalid references or identifiers, invalid coordinates or time, and no active service for a demo date are hard blockers; bounded non-critical warnings and absent optional files may be accepted only with a limitation note.

## Behavior / rules

1. Manually download the official source file and store it as a snapshot with acquisition metadata.
2. Parse and normalize only supported entities while retaining enough raw lineage to investigate a validation failure.
3. Apply structural checks for required files, references, identifiers, time formats, and coordinate validity.
4. Apply semantic checks for active calendars, available calendar exceptions, frequency semantics, route/stop/trip relationships, and known warning classes.
5. Classify findings into hard blockers and accepted limitations using the contest/demo policy; record the decision for the pinned snapshot.
6. Publish a snapshot only when it has no hard blocker; otherwise retain the previous valid snapshot and record the rejection.
7. Expose freshness and limitation states to consumers so the product can label stale or incomplete data.
8. When the active snapshot is the pinned last-known-good snapshot allowed by the contest/demo policy, let consumers use it while propagating internal freshness metadata and the static/demo-data schedule-change note; the snapshot/download date is not required as a UI label.
9. If no valid snapshot exists, the Astara developer manually retries the official download and validation or reinstalls the last valid snapshot; if recovery still fails, return an explicit unavailable state to the consuming planner rather than an empty, fabricated, or silently substituted network.
10. If calendar exceptions are unavailable, use `calendar.txt` only as a limited baseline for the contest demo, expose the limitation to consumers, and do not claim that additions or removals outside `calendar.txt` are covered.
11. When consumers request pedestrian/access status, expose the access-evidence version and its transit-snapshot association; mismatched or missing evidence is returned as limited rather than silently treated as current.

## Success

For an approved source snapshot, maintainers can manually reproduce what was downloaded, why it was accepted or rejected, which snapshot is active, and how fresh it is. The contest demo can run from a pinned snapshot with bounded validator warnings, limited calendar coverage, and a clear static/demo-data schedule-change note; internal provenance remains available even though the download date need not be shown to users.

## Edge cases

- Valid service times after midnight.
- Frequency rows with no exact departure list.
- Active-calendar gaps, stale calendar ranges, duplicate IDs, dangling references, invalid coordinates, or a source download failure.
- A new snapshot has warnings but fails a configured hard gate.
- A new snapshot has accepted non-critical warnings but no hard blocker.
- `calendar_dates.txt` is absent for the contest snapshot.
- No prior valid snapshot exists.

## Decision references

- REQ-002 discussion OQ-001 remains deferred beyond the contest, while OQ-004 is closed by D-009. OQ-002, OQ-003, and OQ-005 are closed for the contest demo by D-006 through D-008, while pinned demo use, manual refresh, and UI note behavior are resolved by D-003 through D-005.
- REQ-007 is intentionally not a dependency for the static MVP snapshot.
