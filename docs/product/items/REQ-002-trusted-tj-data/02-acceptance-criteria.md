# REQ-002 — Trusted TransJakarta Network Data — Acceptance Criteria

Observable criteria for the static network data lifecycle.

## AC-01 — Manual snapshot provenance

- Given an official GTFS Static file manually downloaded by an Astara maintainer
- When the maintainer stores the snapshot
- Then the raw input is immutable and the record includes source URL, acquisition time, HTTP metadata, content hash, feed version when available, and a unique snapshot ID.

## AC-02 — Structural validation

- Given a downloaded snapshot with missing required files, malformed rows, invalid references, duplicate identifiers, invalid coordinates, or invalid time syntax
- When validation runs
- Then each failure is reported by rule and the snapshot cannot be published as the active valid snapshot.

## AC-03 — Semantic service validation

- Given calendars, stop times, trips, shapes, transfers, or frequency rows
- When normalization and semantic validation run
- Then active-date behavior, available calendar exceptions, after-midnight times, route relationships, and `exact_times=0` interval semantics are represented without converting warnings, missing exception coverage, or intervals into false exactness.

## AC-04 — Publish gate and fallback

- Given a new snapshot that fails an approved hard gate
- When the publication process completes
- Then the failed snapshot remains inspectable as rejected, the last valid snapshot remains active if one exists, and downstream consumers receive the active snapshot ID and freshness state.

## AC-05 — Freshness and limitation state

- Given an active snapshot with a known age or missing optional/exception data such as `calendar_dates.txt` or `pathways.txt`
- When a consumer requests its status
- Then Astara returns the configured freshness state and known limitations, without implying that missing access or exception data is complete.

## AC-06 — No-valid-snapshot behavior

- Given no snapshot has passed the publication gates
- When a route or search consumer requests network data
- Then the consumer receives an explicit unavailable/error state with an operator-visible reason; it does not receive an empty network presented as a successful result.

## AC-07 — Reproducible lineage

- Given the same raw snapshot and validation configuration
- When the lifecycle is replayed
- Then the normalized output, validation findings, publication decision, and lineage identifiers are reproducible or any nondeterminism is recorded.

## AC-08 — Tolerated stale demo data

- Given the active snapshot is last-known-good but beyond the configured stale threshold
- When the contest/demo policy permits route or search use
- Then consumers receive the result with a clear static/demo-data note that schedules may change; Astara does not present the data as current or realtime, and neither a freshness label nor the download date is required in the UI.

## AC-09 — Manual refresh without private integration

- Given a maintainer has the official public TJ Static GTFS file
- When the MVP refresh workflow is performed
- Then it creates a new immutable snapshot without requiring a TransJakarta account, SSO, private endpoint, partnership, or authenticated integration.

## AC-10 — Two-tier contest validation gate

- Given validator findings for the pinned contest snapshot
- When an Astara maintainer reviews the findings
- Then missing core files, malformed rows, invalid references or identifiers, invalid coordinates or time, and no active service for a demo date reject the snapshot, while bounded non-critical warnings and absent optional files may be accepted only with a recorded limitation note.

## AC-11 — Limited calendar-exception coverage

- Given the contest snapshot does not contain `calendar_dates.txt`
- When calendar availability is evaluated
- Then `calendar.txt` may provide the limited baseline for routing, and Astara exposes that special-date additions/removals are not covered rather than treating the snapshot as complete.

## AC-12 — Manual recovery ownership

- Given no active snapshot has passed validation before the contest demo, or the active snapshot is rejected during refresh
- When an Astara developer performs recovery
- Then the developer manually re-downloads or reinstalls the official/last-valid snapshot, reruns validation, and either activates a valid snapshot or leaves the planner in an explicit unavailable state; no alternate data source is substituted silently.

## AC-13 — Access-evidence version association

- Given a curated pedestrian/access record or version consumed with a transit snapshot
- When a downstream route or surface requests its status
- Then the record exposes its declared transit snapshot association, is treated as verified only when it matches the active snapshot, and otherwise remains `Data terbatas` without silently blocking the transit route.

## Edge cases

- Verify valid `25:10:00`-style service times, frequency intervals, inactive dates, hard-blocking versus accepted warnings, missing `calendar_dates.txt`, tolerated stale demo data, manual download failure, and first-run/no-fallback behavior.

## Verifiability

- AC-01–AC-13 → data-contract checks, validator fixtures, lifecycle replay, manual refresh/recovery walkthrough, and operator review.
- Downstream source/freshness display → REQ-012 and REQ-015 acceptance criteria.
