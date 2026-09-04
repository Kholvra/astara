# REQ-014 — Curated Pedestrian Access Evidence — Requirement

## Metadata

```yaml
id: REQ-014
slug: curated-pedestrian-access
type: feature
status: ready
priority: medium
size: M
depends_on: [REQ-002]
related_to: [REQ-003, REQ-005, REQ-012, REQ-016]
profile: product-app
links: {}
```

## Summary

Astara maintainers need a curated, provenance-backed record of priority pedestrian-access conditions so that route instructions can state what is verified, aging, stale, blocked, or limited without making unsupported accessibility claims.

## Actors / consumers

- Primary actor: maintainer/reviewer who observes and publishes access evidence.
- Consumers: REQ-003 transfer confidence, REQ-005 map markers, REQ-012 route card, and travelers with relevant mobility needs.
- Upstream identity source: REQ-002 network snapshot.

## Scope

### In scope

- Define access records for priority hubs and journey scenarios covering entrances, platforms, JPOs, crossings, lifts, sidewalks, exits, barriers, and unknown conditions as applicable.
- Store stable location/hub identity, access type, status, source, observed date, review date, confidence, and supporting note/evidence.
- Manage the contest lifecycle `draft → verified` plus manual `Perlu dicek`/retired transitions; automatic aging/expiry thresholds are deferred beyond the contest.
- Detect or record contradictions, expired observations, explicit barriers, and missing evidence.
- Expose user-visible status and limitations without promising safety or accessibility beyond the record.
- Keep the curated subset and audit boundary explicit.

### Explicitly out of scope

- Full network accessibility audit or certification.
- Transfer-edge algorithm and proximity inference; see REQ-003.
- Community submissions/moderation; see REQ-008.
- Continuous field tracking, navigation, or automatic claims from absent tags.

## Constraints & invariants

- Every published record has provenance and an observation/review date; records without those fields cannot be labeled verified.
- `Unknown` means evidence is absent or insufficient; it is not equivalent to accessible or inaccessible.
- The current contest/demo baseline has no gathered pedestrian/access records, so absent points remain `Unknown`/limited until a sourced observation is recorded.
- An explicit barrier may exclude a route for an approved profile, but a missing barrier record cannot prove the route is accessible.
- Stale or contradictory evidence is visible and cannot be silently used as current verification.
- The MVP covers only the approved priority hubs/scenarios; absence outside that set is stated as limited coverage.
- Changes are reviewable and retain the prior state/history needed to explain a claim.
- For the contest, the curated set is limited to hubs/access points in approved demo/golden journeys and is pinned to the active transit snapshot.

## Behavior / rules

1. Create an access record in draft with required identity, access type, source, observation date, and evidence fields.
2. Review the record against the approved evidence standard before transitioning it to verified.
3. For the contest, keep records pinned to the active snapshot and manually mark them `Perlu dicek` or retired when contradicted; defer automatic aging/expiry thresholds to a later maintenance policy.
4. Record contradictions and explicit barriers rather than selecting the most favorable observation silently.
5. Publish only records that satisfy the approved review gate and expose their status/confidence to consumers; the Astara developer/project owner owns contest review and publication.
6. When no record exists, including for the current contest/demo baseline, return unknown/limited status; do not synthesize a positive accessibility statement from map proximity or missing tags.
7. Leave route eligibility and the `no-edge` versus `limited` connection decision to REQ-003; consumers must receive the limitation and cannot upgrade it to verified access.

## Success

For every approved priority access point, maintainers can answer what was observed, when, by whom/source, with what confidence, and whether the evidence is still current. Until that work is done, users see an explicit limited-coverage status that accurately bounds the route instruction.

## Edge cases

- Missing source/date, conflicting observations, expired record, explicit barrier, no record/current no-data baseline, inaccessible lift, temporary closure, and an access point outside the curated boundary.

## Decision references

- REQ-014 discussion OQ-001 through OQ-004 are closed by D-004–D-007 for the contest demo; production expiry thresholds remain deferred.
