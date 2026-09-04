# REQ-012 — Route Card and Journey Instructions — Acceptance Criteria

Observable criteria for the primary route card and ordered instructions.

## AC-01 — Summary facts

- Given a successful primary route result
- When the route card opens
- Then it shows the supported route summary, service/direction, timing assumption, transfer count, walking components, and fare/interval state without requiring the map; an incomplete fare shows its limitation without a numeric amount.

## AC-02 — Traceable recommendation reason

- Given a route result with scoring fields and preferences
- When the card explains why the route was chosen
- Then each reason maps to a returned fact or approved calculation, and the card distinguishes factual attributes from user-preference trade-offs.

## AC-03 — Ordered journey actions

- Given a route with origin walk, boarding, transit, transfer, alighting, and destination walk legs
- When instructions render
- Then they appear in journey order, identify the relevant service/direction and decision point, and do not omit or duplicate a leg.

## AC-04 — Evidence and uncertainty language

- Given verified, estimated, stale, unknown, limited, or barrier evidence
- When the related fact is shown
- Then the card maps internal unknown/limited evidence to the approved `Data terbatas` or `Perlu dicek` copy and never upgrades missing evidence to a safety or accessibility guarantee.

## AC-05 — Bahasa Indonesia terminology

- Given the approved content glossary
- When the card, labels, and notices are reviewed
- Then the same terms are used consistently for halte, rute, arah, transit, transfer, berjalan, estimate, and data status, with no unexplained technical field names.

## AC-06 — Incomplete-data and map-independent behavior

- Given missing geometry, a failed map provider, stale data, or an unsupported physical detail
- When the card is displayed
- Then known route facts and ordered supported steps remain readable, the limitation is visible, and no invented instruction replaces the missing detail. A direct route may remain visible with an unknown walk, and a supported transfer may remain visible as limited.

## AC-07 — No-route and duplicate-step behavior

- Given no valid route or duplicate/ambiguous platform steps
- When the user views the outcome
- Then the card shows a recoverable no-route/confirmation state, and a valid route never contains duplicate or contradictory journey instructions.

## AC-08 — Unsupported transfer is not presented as a route

- Given a transfer marked `no-edge` because minimum connection evidence is absent or the match is proximity-only
- When the route result is displayed
- Then the card does not render that connection as a transfer step or invent walking instructions, and it shows the applicable no-route or recovery state.

## AC-09 — Limited supported transfer remains bounded

- Given a transfer backed by approved connection evidence but without a verified walking path or physical detail
- When the route card renders
- Then it keeps the supported transfer fact, labels the missing detail as `Data terbatas` or `Perlu dicek` even when the route is primary under the evidence-completeness policy, and makes no accessibility or wayfinding claim beyond the evidence.

## AC-10 — Mobile-first card flow

- Given a mobile viewport and a selected route
- When the user reads the summary, expands steps, or opens/collapses the map companion
- Then the card remains the first and authoritative surface, the approved facts/status/actions are visible in one column without horizontal scrolling, and the journey remains understandable without opening the map.

## Edge cases

- Verify direct, transfer-heavy, frequency, estimated-fare, stale, barrier, unknown-access, missing-map, long-step, and ambiguous-platform cases.

## Verifiability

- AC-01–AC-04 and AC-06–AC-09 → route fixtures and content snapshot review.
- AC-05 and AC-10 → glossary/content review and mobile layout walkthrough.
- Human comprehension → REQ-016.
