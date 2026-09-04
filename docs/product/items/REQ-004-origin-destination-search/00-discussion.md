# REQ-004 — Origin and Destination Search — Discussion

## Raw request

Derived from the research recommendation: resolve local TJ stops and aliases first, then use generic place or address search as a fallback.

## Context

Stop names and platform IDs are the most important inputs for the route engine. A generic geocoder alone can be slow, ambiguous, rate-limited, or unable to preserve the platform identity needed for routing.

## Actor / consumer

Primary actor: a user choosing where a trip starts and ends. Consumer: the route engine.

## Problem

Users may search by a stop name, route label, place, address, or current location. Duplicate platforms and similarly named places can cause the route engine to start or end at the wrong physical point.

## Desired outcome

Astara returns understandable, ranked origin and destination choices with stop/platform identity, coordinates, source, and confidence; it groups duplicates when useful and asks for confirmation when the platform choice changes routing.

## Known constraints

- Local GTFS stop index is the primary search source for stop and route queries.
- Search results distinguish `Halte/rute` from `Tempat/alamat` and support `Lokasiku` where available.
- Straight-line distance may prefilter candidates, but walking distance should choose the nearest usable stop when walking data exists.
- Public geocoder policy, attribution, rate limits, and contingency requirements apply to any fallback provider.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Which aliases and typo forms are required for the first network snapshot? | Search quality depends on local naming coverage. | Project owner (proposed) | Closed — resolved by D-002 |
| OQ-002 | When must the UI force a platform or entrance confirmation? | Ambiguity can alter the route and transfer behavior. | Project owner (proposed) | Closed — resolved by D-003 |
| OQ-003 | Which generic geocoder, if any, is approved for production fallback? | Provider choice affects quota, privacy, latency, and terms. | Project owner (proposed) | Closed for contest demo — resolved by D-004 |
| OQ-004 | What is the observable no-result and low-confidence behavior? | Users need a recoverable path when a place cannot be resolved. | Project owner (proposed) | Closed — resolved by D-005 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Local GTFS stop index is the primary search source. | 2026-09-01 | Project docs | Generic geocoding is a fallback, not the first request for every query. |
| D-002 | The contest/demo alias corpus uses official GTFS names plus a finite manually curated set for approved demo/golden journeys; broad typo learning is deferred. | 2026-09-04 | Project owner | Search coverage stays auditable and bounded. |
| D-003 | Confirmation is mandatory when duplicate platforms/entrances or a low-confidence match can change route behavior; otherwise Astara may use the canonical local result. | 2026-09-04 | Project owner | Users are not silently placed on a materially different platform or stop. |
| D-004 | The contest/demo does not require an external generic geocoder. Local GTFS search and curated aliases are the active sources; a provider adapter may be added later only after provider, privacy, rate-limit, and attribution approval. | 2026-09-04 | Project owner | The demo remains static/offline-resilient and does not depend on an unapproved external service. |
| D-005 | No-result or low-confidence resolution preserves the entered query, blocks arbitrary routing, and offers a plain-language correction such as selecting a suggested halte, editing the query, or retrying a failed local index. | 2026-09-04 | Project owner | Search failure is recoverable without silently substituting a place. |

## Assumptions (agent-proposed)

- Initial user testing can focus on a finite alias set from real journeys before broad geocoder coverage is needed.

## Next step

The search result contract, ambiguity rules, demo alias set, local-only fallback, and recovery behavior are resolved by D-002–D-005. Formal priority/size metadata remains a backlog gate.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- Search was framed around the user outcome of choosing a routable origin and destination, not around a particular geocoder implementation.
- Local GTFS stop search remains primary; generic place/address lookup remains fallback.
- The result contract and acceptance criteria were drafted; alias coverage, ambiguity, fallback provider, and no-result behavior remain open.

### 2026-09-03 — Decomposition pass

- The item remains the single outcome of resolving a user’s origin/destination into a routable location.
- Current-location permission and minimal location-retention/privacy behavior are included here because they are part of location selection, not a separate account feature.

### 2026-09-04 — Demo search boundary and mobile flow

- The project owner approved a finite official-name/curated-alias corpus for demo and golden journeys.
- The project owner approved mandatory confirmation only when platform, entrance, or low-confidence ambiguity can change routing.
- The project owner approved local-only search for the contest demo; no generic geocoder is required until a provider is separately approved.
- No-result and low-confidence states preserve the query and provide a clear correction path. The search flow is mobile-first with one-column results and touch-friendly controls.
