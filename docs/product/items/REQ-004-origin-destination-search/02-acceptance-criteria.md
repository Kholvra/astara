# REQ-004 — Origin and Destination Search — Acceptance Criteria

Observable criteria for origin and destination resolution.

## AC-01 — Local-first stop search

- Given a query matching a supported stop, route label, alias, or approved typo form
- When the user searches for an origin or destination
- Then local GTFS-derived results appear before any generic provider result, with the stop/platform identity and result type visible.

## AC-02 — Routable result contract

- Given a result the user can select
- When the result is presented
- Then it includes a stable identity or explicit place-to-stop conversion state, display label, coordinates, source, confidence, and enough context for the user to confirm it.

## AC-03 — Ambiguity requires a choice

- Given duplicate stop names, multiple platforms, or a low-confidence place match that can change the route
- When the user attempts to continue
- Then Astara presents the relevant distinctions and requires an explicit selection; it does not silently choose a platform.

## AC-04 — Fallback place search is labeled

- Given no adequate local stop result in the contest/demo
- When local search completes
- Then Astara does not call an unapproved generic geocoder and instead shows a recoverable no-result/low-confidence state; a future approved provider must be source-labeled and attribution-compliant.

## AC-05 — Current location is explicit and session-only

- Given the user invokes `Lokasiku`
- When permission is requested or resolved
- Then a denied or unavailable permission leaves manual search available, and an accepted location is used only for the active planning session without retaining raw coordinates, location history, or default analytics.

## AC-06 — No-result and provider failure recovery

- Given local search cannot resolve a query, or a future approved provider fails or exceeds quota
- When the search completes
- Then Astara preserves the entered query, shows a clear no-result/failure state with an actionable suggested-halte, edit, or retry path, and does not return an arbitrary location.

## AC-07 — Usable-nearest-stop behavior

- Given a place or current location is near several stops
- When Astara converts it for routing
- Then it uses supported walking evidence when available, otherwise labels the distance/selection limitation, and exposes the chosen stop for confirmation.

## AC-08 — Mobile-first search flow

- Given a mobile viewport
- When the user searches, reviews suggestions, confirms a platform, or recovers from a no-result state
- Then fields, results, status text, and primary actions remain in one column without horizontal scrolling, and each action is usable by touch without requiring the map.

## Edge cases

- Verify aliases, typo matches, duplicate platforms, far-away places, denied location, imprecise location, missing coordinates, unavailable local index, and fallback quota failure.

## Verifiability

- AC-01–AC-04 and AC-07–AC-08 → search fixtures and provider contract tests.
- AC-05 → permission/session data review.
- AC-06 → deterministic failure and recovery scenarios.
