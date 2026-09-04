# REQ-004 — Origin and Destination Search — Requirement

## Metadata

```yaml
id: REQ-004
slug: origin-destination-search
type: feature
status: ready
priority: high
size: M
depends_on: [REQ-002]
related_to: [REQ-001, REQ-013, REQ-015]
profile: product-app
links: {}
```

## Summary

As a traveler, I want to search for and confirm my origin and destination using stop names, places, addresses, or an explicit current-location action, so that route selection receives the correct routable location instead of an ambiguous guess.

## Actors / consumers

- Primary actor: traveler choosing an origin or destination.
- Consumer: REQ-001 route selection and REQ-015 planner state.
- Providers: local GTFS stop index and curated aliases for the contest demo; a generic place/address provider is a deferred adapter pending separate approval.

## Scope

### In scope

- Search the local stop/route index for stop names, aliases, route labels, and common typo forms.
- Return distinct result types for `Halte/rute`, `Tempat/alamat`, and explicit `Lokasiku`.
- Include stable stop/platform identity, coordinates, display label, source, and confidence in a result.
- Group or explain duplicate platforms and require confirmation when the choice changes route behavior.
- Use generic place/address search only as an approved fallback, with provider attribution and policy constraints.
- Offer current location only after an explicit user action and permission result.
- Provide no-result, low-confidence, denied-permission, and provider-failure recovery paths.
- Keep the mobile flow in one column with touch-friendly fields/results and no horizontal scrolling.

### Explicitly out of scope

- Route ranking and journey selection; see REQ-001.
- Persistent location history, login, saved places, or raw coordinate analytics.
- Turn-by-turn navigation or continuous location tracking.
- Selecting or booking other transport modes.
- Activating an external generic geocoder for the contest/demo; provider integration is deferred until its privacy, quota, attribution, and outage policy is approved.

## Constraints & invariants

- Local stop data is the primary source for stop and route queries; a generic geocoder is not called unnecessarily when a local result is sufficient.
- A result cannot be treated as routable without a stable identity or an explicit conversion step.
- Straight-line distance may prefilter; walking distance determines nearest usable stop only when supported walking data exists.
- Current-location use is opt-in, session-only, and does not retain raw coordinates, location history, or analytics events by default.
- Permission denial must leave manual search usable.
- Any future fallback provider must respect its rate limits, privacy policy, attribution, and outage behavior; the contest demo does not depend on one.
- Mobile is the primary layout baseline: search fields, suggestions, confirmations, and recovery actions remain usable in a single-column touch flow without requiring the map.

## Behavior / rules

1. Accept a query and context (`origin` or `destination`) and search the local index first.
2. Rank results using exact/alias match, type, identity, and usable proximity signals; expose enough information for confirmation.
3. If local search cannot resolve the query in the contest demo, return a recoverable no-result/low-confidence state; do not call an external geocoder. If a future provider is approved, query it only as a labeled fallback and preserve its source/attribution.
4. When a user explicitly chooses current location, request permission only as required, convert the result to a routable nearby point/stop, and retain it for the active planning session only.
5. Require a user choice when duplicate platforms or low confidence can alter the route.
6. Return an explicit recoverable no-result or provider-failure outcome; never substitute a silent arbitrary place. Preserve the query and offer a suggested local result, edit, or retry action.

## Success

The user can select a named stop or place and see what it represents before planning. Route selection receives a stable, source-labeled location with confidence; denied location permission or unavailable search providers do not trap the planner.

## Edge cases

- Alias/typo matches and duplicate stop names.
- Same station with multiple platforms whose direction or walking path differs.
- A place result far from any usable stop.
- Current location denied, unavailable, imprecise, or outside the supported network.
- Local index unavailable, fallback quota exceeded, or provider result missing coordinates.

## Decision references

- REQ-004 discussion OQ-001 through OQ-004 are closed by D-002–D-005; external geocoder activation remains deferred beyond the contest demo.
- Privacy boundary is intentionally part of location selection rather than a separate account requirement.
