# Design Contract: Origin and Destination Search

- Source: [`01-requirement.md`](01-requirement.md) (`REQ-004`), [`02-acceptance-criteria.md`](02-acceptance-criteria.md), and [`03-readiness-review.md`](03-readiness-review.md)
- Status: `Proposed`
- Profile: `product-app`
- Scope: Local-first query resolution, result identity/confidence, ambiguity confirmation, current-location session boundary, fallback policy, and recovery
- Owner: Search/location-resolution owner; privacy decisions remain owned by the project owner
- Risk: A silent ambiguous or arbitrary place selection can route from the wrong platform, while careless location retention can create an unapproved privacy boundary.
- Existing behavior: Specification/bootstrap phase; no search index, geocoder adapter, permission integration, or tests exist. REQ-002 supplies the local network index.

## Intent and non-goals

The search contract turns a traveler’s origin/destination query into an understandable, source-labeled, routable location choice. It prioritizes local TransJakarta identities and makes ambiguity or provider failure recoverable.

It does not define route ranking, navigation, saved places, login, trip history, continuous tracking, arbitrary transport modes, or an external geocoder for the contest/demo.

## Trust boundary

| ID | Boundary | Input/source | Validation or parse | Trusted representation | Rejection/failure |
|---|---|---|---|---|---|
| TB-01 | User query to local search | Free-text query, origin/destination context, and optional current-location intent; untrusted | Normalize for search only, preserve entered text, query local index and bounded alias corpus | Ranked local results with stable identity, type, coordinates, source, and confidence | Empty/invalid query remains editable; no arbitrary routable location is created |
| TB-02 | Local/provider result to routable location | Stop/platform/place result, coordinates, source, confidence, and walking proximity; untrusted until selected | Validate identity/coordinates, distinguish `Halte/rute`, `Tempat/alamat`, `Lokasiku`, and require place-to-stop conversion where needed | Explicitly selected routable location or pending confirmation | Missing identity/coordinates or low-confidence routing-relevant ambiguity stays non-routable and asks for correction |
| TB-03 | Current location permission to session | Browser/device permission result and position; untrusted personal data | Require explicit `Lokasiku` action, use only for active session, convert to supported nearby stop/point, and discard at session boundary | Session-scoped location selection, not a persistent history record | Denied/unavailable/imprecise location leaves manual search usable; raw coordinates are not retained |
| TB-04 | Future provider to search results | Approved generic geocoder response/quota/attribution; external untrusted data | Use only after explicit provider approval and local search failure; preserve source, attribution, policy, and coordinates | Labeled fallback result subject to confirmation/conversion | Contest/demo does not call an unapproved provider; provider failure becomes recoverable failure |

## Preconditions

| ID | Trigger | MUST be true | Owner | Violation behavior |
|---|---|---|---|---|
| PRE-01 | Before a search | Query context is `origin` or `destination` and local index availability is known | Search owner | Return a plain-language input/index failure; preserve the query |
| PRE-02 | Before a result becomes routable | The result has stable identity or an explicit place-to-stop conversion and valid `[longitude, latitude]` coordinates | Search/location owner | Keep result pending/limited; require selection or correction |
| PRE-03 | Before current-location use | The user explicitly invoked `Lokasiku` and permission was requested through the platform boundary | Privacy/search owner | Do not access or retain location; keep manual search available |

## Postconditions

| ID | On success, MUST guarantee | Preserved values/state | Side effects |
|---|---|---|---|
| POST-01 | Local stop/index results are considered before any generic provider result, with result type and identity visible | Entered query and source remain available for confirmation | Search returns an auditable ranked result set |
| POST-02 | A selected result exposes stable identity/conversion state, label, coordinates, source, and confidence | The user can see what will be sent to route selection | A routable location is handed to REQ-001 only after the required confirmation/conversion |
| POST-03 | Duplicate platforms or low-confidence matches that can change routing require explicit user choice | Alternative distinctions remain visible; no silent platform selection | Search transitions to confirmation rather than routing prematurely |
| POST-04 | No-result, low-confidence, local-index failure, or provider failure preserves the query and offers suggested halte, edit, retry, or provider-safe action | Origin/destination already selected elsewhere remain intact | Planner receives an explicit recoverable non-success outcome |
| POST-05 | Accepted current location is converted to a routable nearby point/stop for the active session only | No raw coordinate history, analytics, or persistent trip location is created by this operation | REQ-001 receives a source-labeled session location |
| POST-06 | If a generic provider is ever enabled, its result is labeled and attribution/policy metadata are preserved; contest/demo behavior remains local-only | Provider failure/quota does not erase the query | A future adapter remains replaceable and non-authoritative |

## Invariants and state transitions

| ID | Owner | Invariant or legal transition | Forbidden case |
|---|---|---|---|
| INV-01 | Search owner | Local GTFS stop/index results are primary for stop/route queries; external geocoding is not called when local resolution is sufficient | Every query is sent to an unapproved generic geocoder first |
| INV-02 | Location owner | A routable result has stable identity or explicit conversion, valid coordinates, source, and confidence; a place is not silently treated as a stop | Arbitrary place/coordinate is sent to routing without conversion or confirmation |
| INV-03 | Ranking owner | Exact/alias/type/identity/proximity signals may rank results, but supported walking evidence is preferred for nearest usable stop when available; straight-line distance is only a prefilter | Euclidean proximity alone proves a usable stop or transfer |
| INV-04 | Ambiguity owner | If duplicate platform/entrance or low confidence can alter routing, state is pending explicit user selection; otherwise a canonical local result may proceed | Search silently picks a materially different platform |
| INV-05 | Privacy owner | Current location is opt-in and session-only; permission denial never removes manual search | Raw coordinates, location history, or default analytics persist from this flow |
| INV-06 | Failure owner | No-result/provider failure preserves the original query and remains recoverable; it never yields an arbitrary location | Failure becomes an empty successful route or silent fallback |
| STATE-01 | Search owner | `query → searching → results/confirmation → selected`; `searching → no-result/failure`; `Lokasiku → permission → session selection/denied` are legal transitions | A failed/ambiguous state transitions directly to routing without a selected routable identity |

## Failure and recovery semantics

- Empty/invalid query, unavailable local index, missing coordinates, or low confidence produces plain-language feedback and preserves the query.
- During the contest/demo, local index plus approved aliases are the only active sources. No external geocoder is invoked as a hidden fallback.
- A future provider may run only after separate privacy, quota, outage, attribution, and provider approval; its result remains labeled and may require confirmation/conversion.
- Permission denial, unavailable sensor, imprecise position, or a point outside the supported network returns to manual search or a suggested halte; it does not trap the planner.
- Search does not retain raw location beyond the active session; REQ-015 may preserve the selected logical input under its session policy, not raw coordinates.

## Architecture boundaries

| ID | Boundary rule | Owner | Reason and enforcement status |
|---|---|---|---|
| ARCH-01 | Search owns resolution and result confidence; REQ-001 owns routing and MUST receive a stable selected location rather than free text. | Search/route owners | Prevents routing from reinterpreting ambiguous input; requires cross-module contract tests. |
| ARCH-02 | The local GTFS index is prepared in the data/core layer; UI handles query/confirmation presentation and does not parse raw GTFS files. | Data/search/UI owners | Aligns with local-first and `ARCH-MAP-001` browser raw-feed boundary. |
| ARCH-03 | External geocoder access is isolated behind an approved, replaceable adapter and is not a contest/demo dependency. | Search/platform owner | Keeps privacy, quota, attribution, and outage decisions explicit. |

## Verification mapping

| Contract ID | Observable oracle | Check type/owner | Evidence | Status |
|---|---|---|---|---|
| TB-01, TB-02, TB-03, TB-04 | Query/result fixtures prove local-first ordering, source typing, coordinate validation, session-only location, and provider labeling | Search/provider contract tests; search owner | AC-01, AC-02, AC-04, AC-05, AC-07; no implementation exists | Unverified |
| PRE-01, PRE-02, PRE-03 | Invalid context, non-routable result, and uninvoked location permission are rejected safely | Boundary/privacy tests; search owner | AC-02, AC-03, AC-05; no tests exist | Unverified |
| POST-01, POST-02, POST-03, POST-04, POST-05, POST-06 | Results, confirmation, recovery, session location, and future-provider boundaries match expected outcomes | Search integration/manual permission review; search + planner owners | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08; no implementation exists | Unverified |
| INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Alias, duplicate, far-away, denied, missing-index, quota, and arbitrary-fallback negative cases preserve invariants | Search fixture suite; search owner | AC-01, AC-03, AC-04, AC-05, AC-06, AC-07; no fixtures exist | Unverified |
| STATE-01 | Search/confirmation/no-result/location transitions are observable and recoverable | State/component test; search + REQ-015 owners | AC-03, AC-05, AC-06; no implementation exists | Unverified |
| ARCH-01, ARCH-02, ARCH-03 | Import/data-boundary review proves search does not rank routes, parse browser raw GTFS, or require unapproved geocoder | Architecture/import/provider review; architecture owner | AGENTS.md, REQ-002, `ARCHITECTURE.md`; no source graph exists | Unverified |

## Open decisions and assumptions

### Approved source decisions

- REQ-004 is `Ready`, priority `high`, size `M`.
- D-002 through D-005 in [`00-discussion.md`](00-discussion.md) are treated as approved, including bounded aliases, routing-relevant confirmation, local-only contest behavior, and recoverable no-result handling.

### Deferred or implementation-facing decisions

- A production generic geocoder, provider policy, and attribution/quotas remain deferred. No contract consumer may assume that adapter exists.
- The initial alias corpus and local-index ranking details must be represented in fixtures; no implementation or permission tests exist, so all statuses are `Unverified`.
