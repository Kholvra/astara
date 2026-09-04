# REQ-002 — Trusted TransJakarta Network Data — Discussion

## Raw request

Derived from the research recommendation: use official TransJakarta GTFS Static, preserve immutable snapshots, validate them before publication, and expose freshness honestly.

## Context

The audited feed snapshot contains routes, stops, trips, stop times, shapes, calendars, frequencies, and limited explicit transfers. It has no `feed_info.txt`, `calendar_dates.txt`, or `pathways.txt`; it also contains warnings and stale-calendar patterns that affect routing and trust.

## Actor / consumer

Primary actor: the Astara data maintainer or operator. Consumers: the route engine, route card, map, and end user.

## Problem

Unvalidated or stale transit data can produce invalid routes, wrong service-day behavior, misleading schedules, or a false impression that transfer and accessibility data are complete.

## Desired outcome

Astara publishes only a snapshot that passes the configured structural and semantic gates, retains the last valid snapshot when a new feed fails, and shows the source and freshness state to users or operators where relevant.

## Known constraints

- Official TJ GTFS Static is the network source for the MVP.
- `calendar.txt` must be filtered by active date; GTFS times above `24:00:00` represent the service day and are not parsing errors.
- `frequencies.txt` with `exact_times=0` represents intervals, not exact departure promises.
- At minimum, retain source URL, download time, HTTP metadata, hash, feed version when available, validation result, and snapshot ID.
- Realtime is not an MVP dependency.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | What are Astara’s final Fresh, Aging, and Stale thresholds? | The threshold changes user messaging and the long-term freshness policy. | Project owner (proposed) | Deferred beyond contest demo; no freshness label is required in the demo UI |
| OQ-002 | Which validator warnings are publishable with a fallback and which are hard blockers? | The audited feed has notices even though it has no validator errors. | Project owner (proposed) | Closed — resolved by D-006 |
| OQ-003 | What is the operational owner and recovery action when no valid snapshot exists? | The user-facing failure and operator response must be explicit. | Project owner (proposed) | Closed — resolved by D-008 |
| OQ-004 | How will non-GTFS pedestrian and access metadata be versioned with the transit snapshot? | Route truth spans transit data and curated walking evidence. | Project owner (proposed) | Closed — resolved by D-009 |
| OQ-005 | How does the absence of `calendar_dates.txt` affect route availability and user-facing data status? | Calendar exceptions cannot be claimed complete when the source omits the file. | Project owner (proposed) | Closed for contest demo — resolved by D-007 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Use official TJ GTFS Static as the MVP network source. | 2026-09-01 | Project docs | Scraped HTML or map images are not the primary network source. |
| D-002 | Publish freshness and missing-data status rather than making unsupported claims. | 2026-09-01 | Project docs | Missing or stale conditions remain visible through approved `Data terbatas` or `Perlu dicek` labels. |
| D-003 | For the contest/demo scope, a stale last-known-good snapshot may drive route and search results when its status, snapshot date, and a schedule-change note are visible. | 2026-09-03 | User | The demo tolerates stale static data; it must not present that data as current or realtime. |
| D-004 | Astara updates the MVP dataset through a maintainer-controlled manual download of the official TJ Static GTFS file; no TransJakarta partnership, SSO, private endpoint, or authenticated integration is required. | 2026-09-03 | User | Data refresh is an explicit manual release step for the contest demo. |
| D-005 | The contest/demo UI does not need to display the snapshot/download date or a separate Fresh/Aging/Stale label; it shows a clear static/demo-data note that schedules may change. | 2026-09-03 | User | This refines D-003’s presentation detail; acquisition date and internal freshness state remain provenance metadata. |
| D-006 | Contest/demo validation uses two tiers: missing core files, malformed rows, invalid references/IDs, invalid coordinates or time, and no active service for a demo date are hard blockers; non-critical warnings such as `missing_timepoint_value` and absent optional files may be accepted with a limitation note. | 2026-09-03 | User | A snapshot with a core-data failure is rejected; a usable snapshot with bounded warnings can support the demo without implying complete data. |
| D-007 | The absence of `calendar_dates.txt` does not block the contest snapshot; `calendar.txt` may be used as a limited baseline and exception coverage must remain visibly limited. | 2026-09-03 | User | The demo can route against the available calendar while not claiming special-date additions or removals are covered. |
| D-008 | The Astara developer owns manual recovery when no valid snapshot is active: download the official TJ Static GTFS again, validate it, and install the last valid snapshot before the demo; if recovery fails, the planner remains explicitly unavailable. | 2026-09-03 | User | Recovery is a manual developer step; no silent alternate data source or automatic provider switch is allowed. |
| D-009 | Transit snapshots and curated access evidence use separate immutable version identifiers. A consumer may treat access evidence as verified only when its declared `transit_snapshot_id` matches the active transit snapshot; a mismatch or absent record remains `Data terbatas` and does not silently block the transit route. | 2026-09-04 | Project owner | The contest demo pins the manually selected transit snapshot and access-evidence version together when available, while unknown access remains honest when no record exists. |

## Assumptions (agent-proposed)

- Feed quality gates should be implemented only after the target service date and freshness policy are approved.

## Next step

Access-data versioning is resolved by D-009. The contest/demo publish gate, calendar limitation, stale-data, manual-refresh, UI-note, and no-valid-snapshot recovery decisions are recorded. Freshness thresholds remain deferred beyond the contest.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- The data outcome was narrowed to the official static TJ feed, immutable snapshots, validation gates, freshness states, and last-known-good fallback.
- Realtime remains separate in REQ-007 and is not an implicit dependency of this item.
- The data contract and acceptance criteria were drafted; threshold and operational ownership decisions remain open.

### 2026-09-03 — Decomposition pass

- The item remains the single data-lifecycle outcome: ingest, validate, publish, retain fallback, and expose source/freshness lineage.
- Route-specific copy moves to REQ-012; user location behavior remains in REQ-004; access evidence maintenance is REQ-014.

### 2026-09-03 — Calendar-exception clarification

- Added an explicit decision point for the missing `calendar_dates.txt` file so active-calendar behavior cannot imply unverified exception coverage.

### 2026-09-03 — Contest/demo data policy

- Recorded the user decision that a stale last-known-good snapshot is acceptable for the contest demo when the stale state, snapshot date, and schedule-change note are visible.
- Recorded that dataset refresh is a manual download/import of the official TJ Static GTFS source; no partnership, SSO, private endpoint, or authenticated integration is a prerequisite.

### 2026-09-03 — Demo-note display clarification

- Clarified that the UI needs only a static/demo-data note and schedule-change warning, not the snapshot/download date or a separate freshness label; metadata remains available internally for provenance.

### 2026-09-03 — Validator gate decision

- Recorded the user-approved two-tier validation policy: core-data failures reject a snapshot; bounded non-critical warnings may be accepted with a limitation note for the contest demo.
- Recorded that missing `calendar_dates.txt` is a visible calendar-coverage limitation, not a contest-demo publish blocker.

### 2026-09-03 — Manual recovery ownership

- Recorded that an Astara developer owns manual re-download, validation, and installation of a valid snapshot before the demo; if recovery fails, the planner reports an explicit unavailable state.

### 2026-09-04 — Access-evidence version association

- The project owner approved separate immutable transit and access-evidence version IDs.
- Access evidence is treated as verified only when it declares the active transit snapshot; mismatches stay limited and do not silently replace or invalidate the transit snapshot.
