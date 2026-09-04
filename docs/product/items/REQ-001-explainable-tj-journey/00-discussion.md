# REQ-001 — TJ Route Selection — Discussion

## Raw request

Derived from the Astara design decision: build the full-network explainable route experience for regular TransJakarta services, with the route card as the primary instruction surface.

## Context

Astara is intended to help people who rarely or do not yet understand TransJakarta travel from an origin to a destination without needing to ask another person. The selected product approach searches the modeled TJ network and explains one route in human-readable steps.

## Actor / consumer

Primary actor: a person who is rarely or not yet familiar with TransJakarta. Inclusive considerations include older adults, visitors, stroller users, and wheelchair users.

## Problem

Users can find route names but still have to infer the correct service direction, platform or stop, alighting point, transfer path, and final walk. A network-valid route can still create too many decisions or unsupported pedestrian assumptions.

## Desired outcome

After selecting an origin and destination, the user can identify the recommended TJ service, direction, boarding point, alighting point, transfers, and walking segments from a route card, together with the reason for the recommendation and the verification status of relevant facts.

## Known constraints

- MVP covers the regular TransJakarta network represented by the available data: BRT and variants, feeder services, Mikrotrans, and Royaltrans only when usable data exists.
- MRT, KRL, and LRT are outside the MVP core.
- Realtime tracking, login, payment, booking, and AI-selected routes are outside the MVP.
- Static or seeded data must be auditable before a demo.
- Astara must show `Terverifikasi`, `Perlu dicek`, or `Data terbatas` when evidence differs or is missing; it must not invent pedestrian detail.

## Open questions

| ID | Question | Why it matters | Owner | Status |
|---|---|---|---|---|
| OQ-001 | Does the MVP show exactly one recommendation, or one primary recommendation plus visible alternatives? | The design selects one main route, while the research recommends preserving route trade-offs. | Project owner (proposed) | Closed — resolved by D-004 |
| OQ-002 | What is the minimum evidence required before a route can be recommended for a demo scenario? | Full-network coverage does not guarantee equal pedestrian detail. | Project owner (proposed) | Closed — resolved by D-011 |
| OQ-003 | Which facts and preferences must be exposed in the explanation of “best”? | The scorer must be explainable rather than a mystery score. | Project owner (proposed) | Closed — resolved by D-010 |
| OQ-004 | What target date/time inputs are required for time-dependent routing in the first user flow? | Service calendars, frequency, and after-midnight times affect route results. | Project owner (proposed) | Closed — resolved by D-008 |

## Decisions

| ID | Decision | Date | Owner | Consequence |
|---|---|---|---|---|
| D-001 | Product name is Astara. | 2026-09-02 | User | New requirement and product documentation use Astara. |
| D-002 | Use Approach B: full-network explainable best route for regular TransJakarta services. | 2026-09-01 | Project docs | The backlog is not limited to one corridor or a hand-written route demo. |
| D-003 | Route card is the primary instruction surface and the map is its visual companion. | 2026-09-01 | Project docs | Route behavior and acceptance must be understandable without relying on map interpretation alone. |
| D-004 | The MVP presents one primary route card per planning scenario; visible alternative routes are deferred. | 2026-09-03 | Project docs (`docs/design.md`) | REQ-001 returns and explains one primary route; REQ-012 renders one primary card. Alternative comparison is not part of the first card contract. |
| D-005 | Route selection consumes REQ-003 transfer states explicitly: `no-edge` connections are excluded, while supported connections with missing walking detail remain `limited` and may be considered only under the approved evidence threshold. | 2026-09-03 | Project owner | A selected route preserves the limitation for REQ-012/REQ-005; proximity-only candidates cannot appear as routes. |
| D-006 | For the contest/demo, a supported-but-incomplete `limited` candidate may become the primary route when no candidate with stronger/complete evidence is available. The limitation remains visible and this decision does not define scoring weights. | 2026-09-03 | Project owner | REQ-001 can keep a usable demo journey without treating limited access detail as verified; `no-edge` candidates remain excluded. |
| D-007 | Evidence completeness is a ranking preference, not an absolute gate: when route trade-offs are comparable, prefer a candidate with complete evidence; allow a supported `limited` candidate to win only when it is materially better or the only viable candidate. Exact numeric thresholds remain open. | 2026-09-03 | Project owner | The scorer must preserve evidence status and make the trade-off explainable without inventing a numeric penalty. |
| D-008 | The MVP timing input is a local depart-at date/time, defaulting to “sekarang”; arrive-by planning is out of scope. | 2026-09-04 | Project owner; see REQ-013 D-003 | REQ-001 evaluates the selected departure time and does not promise reverse-scheduled arrival planning. |
| D-009 | The MVP exposes no user-selectable preference, slider, or preset; route selection uses a fixed, explainable scoring policy so the flow stays simple for older users. | 2026-09-04 | Project owner; see REQ-013 D-004 | REQ-001 receives no preference choice from the user; the remaining explanation decision concerns which fixed-policy facts appear. |
| D-010 | The MVP uses a fixed lexicographic ranking policy: valid/routable service first, then fewer transfers and decision points, then less supported walking, then shorter expected duration, then stronger evidence when the earlier trade-offs are comparable, with a stable route-ID tie-break. Explanations expose these observable facts. | 2026-09-04 | Project owner | The scorer remains deterministic and explainable without a user preference or opaque numeric score; a supported `limited` candidate can win when it wins an earlier criterion or is the only viable candidate. |
| D-011 | A route may be recommended when origin/destination identities are routable, service is active for the selected depart-at input, and every transfer has approved connection evidence. Unknown or limited walking detail remains visible; `no-edge` connections are excluded. | 2026-09-04 | Project owner | Missing pedestrian detail limits the claim but does not block a usable demo route when no stronger candidate exists. |

## Assumptions (agent-proposed)

- The full-network route result can be demonstrated with static or seeded data while feed and routing validation remain in progress.
- REQ-002, REQ-003, and REQ-006 may provide evidence needed before this item can become `ready`; this is a sequencing suggestion, not an approved dependency.

## Next step

Scoring, explanation facts, and the minimum recommendation evidence are resolved by D-010–D-011. Timing correction follows REQ-013, engine evidence follows REQ-006, and formal priority/size approval remains a backlog gate before handoff.

## Refinement log

### 2026-09-02 — Backlog refinement pass

- The latest design is treated as the current product baseline: full regular TransJakarta network, one primary route card, and a map as companion.
- The earlier broader multimodal MVP is represented as deferred scope in REQ-009.
- The route-card contract and acceptance criteria were drafted, while unresolved scoring, time-input, and evidence decisions remain visible in the readiness review.

### 2026-09-03 — Decomposition pass

- The item is narrowed to selecting a primary route from the modeled TJ network and exposing the route facts needed by downstream surfaces.
- Route-card wording and ordered journey instructions move to REQ-012.
- Date/time, fare, and user preference inputs move to REQ-013.

### 2026-09-03 — Artifact-status correction

- Updated the next step to reflect that the requirement and acceptance-criteria artifacts already exist; unresolved behavior and evidence decisions remain the actual gate.

### 2026-09-03 — Shared route-presentation decision

- Closed OQ-001 using the existing product decision in `docs/design.md`: the MVP presents one primary route card per scenario, with visible alternatives deferred.

### 2026-09-03 — Transfer evidence policy

- The route selector now has an explicit downstream contract for the contest/demo: exclude `no-edge` transfers and preserve `limited` status when approved connection evidence exists but walking detail is missing.
- The minimum recommendation threshold itself remains an open product decision; this refinement does not invent a score or weight.

### 2026-09-03 — Limited-primary fallback decision

- The project owner approved selecting a `limited` candidate as the primary demo route when no candidate with stronger/complete evidence is available.
- The limitation must remain in route facts and downstream card/map surfaces; no `no-edge` or proximity-only candidate is eligible.

### 2026-09-03 — Evidence-completeness preference

- The project owner approved preferring complete evidence when route trade-offs are comparable, while allowing a supported `limited` candidate when it is materially better or the only viable option.
- No numeric weight or “materially better” threshold was invented; those remain part of the scoring decision.

### 2026-09-04 — Depart-at-only timing decision

- The project owner approved consuming a local depart-at date/time input for the MVP; arrive-by is not part of the first route-selection flow.

### 2026-09-04 — No-preference simplicity decision

- The project owner approved a fixed scoring policy with no user-selectable preference, slider, or preset in the MVP flow.
- The route explanation still needs to name the observable facts behind that fixed policy; this does not create a new user input.

### 2026-09-04 — Fixed scoring and evidence threshold

- The project owner approved a deterministic lexicographic policy that prioritizes valid service, fewer transfers/decision points, supported walking, duration, and evidence completeness in that order, with a stable tie-break.
- The project owner approved the minimum recommendation evidence: routable origin/destination, active service for the depart-at input, and approved evidence for every transfer. Unknown or limited walking detail remains a visible limitation; `no-edge` is excluded.
- The explanation exposes service/direction, transfer count, walking status, duration/interval, and evidence status as the facts behind the primary choice.
