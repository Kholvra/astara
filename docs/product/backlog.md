# Astara — Backlog

Master index requirement untuk seluruh project Astara. Detail tiap item berada di dokumen yang ditautkan; file ini sengaja tidak menyalin requirement lengkap.

Baseline saat ini terdiri dari 16 item: 11 paket MVP yang sudah `ready`, dan 5 item post-MVP yang tetap `discovery`. Setelah refinement dan triage 2026-09-04, keputusan perilaku utama MVP sudah tercatat, termasuk mobile-first; priority, size, dan urutan kerja MVP telah disetujui untuk handoff. Kolom `Depends on` tetap merupakan working dependency proposal yang perlu dikonfirmasi saat engineering kickoff.

## MVP product outcomes

| ID | Title | Type | Status | Priority | Size | Depends on | Detail |
|---|---|---|---|---|---|---|---|
| REQ-001 | TJ Route Selection | feature | ready | high | L | REQ-002, REQ-003, REQ-004, REQ-013 | [requirement](items/REQ-001-explainable-tj-journey/01-requirement.md) |
| REQ-003 | Transfer Connectivity and Confidence | feature | ready | high | M | REQ-002 | [requirement](items/REQ-003-transfer-pedestrian-wayfinding/01-requirement.md) |
| REQ-004 | Origin and Destination Search | feature | ready | high | M | REQ-002 | [requirement](items/REQ-004-origin-destination-search/01-requirement.md) |
| REQ-005 | Map Companion Experience | feature | ready | medium | M | REQ-001 | [requirement](items/REQ-005-map-route-geometry/01-requirement.md) |
| REQ-012 | Route Card and Journey Instructions | feature | ready | high | M | REQ-001, REQ-003, REQ-014 | [requirement](items/REQ-012-route-card-instructions/01-requirement.md) |
| REQ-013 | Trip Timing, Fare, and Preference Controls | feature | ready | high | M | REQ-002 | [requirement](items/REQ-013-trip-timing-fare-preferences/01-requirement.md) |
| REQ-014 | Curated Pedestrian Access Evidence | feature | ready | medium | M | REQ-002 | [requirement](items/REQ-014-curated-pedestrian-access/01-requirement.md) |
| REQ-015 | Planner State and Recovery | feature | ready | high | M | REQ-001, REQ-002, REQ-004, REQ-005, REQ-013 | [requirement](items/REQ-015-planner-state-recovery/01-requirement.md) |

## MVP enabling and decision gates

| ID | Title | Type | Status | Priority | Size | Depends on | Detail |
|---|---|---|---|---|---|---|---|
| REQ-002 | Trusted TransJakarta Network Data | chore | ready | high | L | none | [requirement](items/REQ-002-trusted-tj-data/01-requirement.md) |
| REQ-006 | Routing Correctness Benchmark | spike | ready | high | M | REQ-002 | [requirement](items/REQ-006-routing-validation/01-requirement.md) |
| REQ-016 | Route Comprehension User Validation | spike | ready | high | M | REQ-001, REQ-005, REQ-012, REQ-013, REQ-015 | [requirement](items/REQ-016-route-comprehension-validation/01-requirement.md) |

## Post-MVP / deferred outcomes

| ID | Title | Type | Status | Priority | Size | Depends on | Detail |
|---|---|---|---|---|---|---|---|
| REQ-007 | Realtime Service Updates | feature | discovery | unset | unset | none recorded | [discussion](items/REQ-007-realtime-service-updates/00-discussion.md) |
| REQ-008 | Community Access Reports | feature | discovery | unset | unset | none recorded | [discussion](items/REQ-008-community-access-reports/00-discussion.md) |
| REQ-009 | Multimodal Network Expansion | feature | discovery | unset | unset | none recorded | [discussion](items/REQ-009-multimodal-expansion/00-discussion.md) |
| REQ-010 | Transit-Aware Place Discovery | feature | discovery | unset | unset | none recorded | [discussion](items/REQ-010-place-discovery/00-discussion.md) |
| REQ-011 | Operator and City Access Insights | feature | discovery | unset | unset | none recorded | [discussion](items/REQ-011-operator-access-insights/00-discussion.md) |

## Dependency map — working proposal

Dependency ini adalah proposal teknis/kontrak dari refinement, bukan persetujuan prioritas bisnis. Edge yang hanya menjadi gate validasi tidak diperlakukan sebagai dependency runtime.

### Runtime/data dependencies

```text
REQ-002 ──> REQ-003, REQ-004, REQ-013, REQ-014
REQ-002 + REQ-003 + REQ-004 + REQ-013 ────────────────────────────────> REQ-001
REQ-001 ──────────────────────────────────────────────────────────────> REQ-005
REQ-001 + REQ-003 + REQ-014 ─────────────────────────────────────────> REQ-012
REQ-001 + REQ-002 + REQ-004 + REQ-005 + REQ-013 ─────────────────────> REQ-015
REQ-001 + REQ-005 + REQ-012 + REQ-013 + REQ-015 ─────────────────────> REQ-016
```

- REQ-002 adalah fondasi snapshot, identitas, calendar, frequency, freshness, dan lineage.
- REQ-001 menggabungkan lokasi, transfer, timing, dan data snapshot menjadi route result.
- REQ-005, REQ-012, dan REQ-015 mengonsumsi route result untuk map, instruksi, dan state/recovery; metadata mereka juga mencantumkan kontrak input lain yang dibutuhkan.
- REQ-014 memelihara evidence akses yang dikonsumsi oleh transfer/card/map; ia tidak menentukan algoritma transfer.
- REQ-016 menguji timing input sebagai bagian dari vertical slice, sehingga REQ-013 dicatat sebagai direct prerequisite, bukan hanya item terkait.

### Decision and validation gates

- REQ-006 memvalidasi correctness dan pilihan engine untuk REQ-001. Ia bukan runtime dependency yang harus dipanggil oleh setiap user request.
- REQ-016 memvalidasi vertical slice setelah route, card, map, dan recovery tersedia. Ia adalah release/evidence gate, bukan dependency runtime.

### Future dependency hypotheses

REQ-007 kemungkinan membutuhkan identitas snapshot/route dari REQ-002 dan REQ-001 plus sumber realtime resmi. REQ-008 kemungkinan mengonsumsi REQ-002 dan REQ-014. REQ-009 kemungkinan bergantung pada kontrak jaringan/transfer REQ-001–003 dan data operator mode lain. REQ-010 kemungkinan mengonsumsi REQ-001 dan REQ-004. REQ-011 kemungkinan mengonsumsi lineage REQ-002 dan evidence REQ-014. Semua edge future ini tetap belum formal karena itemnya masih discovery.

## Priority and sizing — approved 2026-09-04

Project owner menyetujui proposal triage ini pada 2026-09-04. Nilai formal pada tabel backlog dan metadata item sekarang mencerminkan keputusan tersebut; ukuran spike tetap dicatat sebagai `M`.

| Item | Approved priority | Approved size | Reasoning |
|---|---|---|---|
| REQ-002 | high | L | Data snapshot, validation, fallback, and lineage are the foundation for every contest route. |
| REQ-006 | high | M (spike) | Correctness evidence should gate the route-engine choice before the core result is hardened. |
| REQ-003 | high | M | Transfer truth is required for a trustworthy direct/transfer journey and cannot be inferred from proximity alone. |
| REQ-004 | high | M | Local-first origin/destination resolution is required for the primary planning flow. |
| REQ-013 | high | M | Depart-at and frequency semantics are required inputs; numeric fare can remain limited for the demo. |
| REQ-014 | medium | M | Curated access evidence strengthens the pedestrian-first promise, but the approved no-data baseline can still demo with `Data terbatas`. |
| REQ-001 | high | L | Full-network candidate selection and explainable scoring are the core route outcome. |
| REQ-012 | high | M | The route card is the authoritative, mobile-first instruction surface. |
| REQ-005 | medium | M | The map is an important visual companion, but the card remains usable when map data/provider work is limited. |
| REQ-015 | high | M | Explicit state and recovery prevent blank or misleading demo failures across the mobile flow. |
| REQ-016 | high | M (spike) | Comprehension evidence is the release gate for the tested contest scenarios. |
| REQ-007–REQ-011 | unset | unset | Post-MVP items remain discovery-only and are not bounded enough for honest priority or sizing. |

## Explicitly not in backlog scope

The following are documented as out of scope for the MVP and are not represented as separate requirements yet: ticket payment, booking other modes, TransJakarta Cares and tourism services as core routes, and unsupported accessibility claims. They can be captured later only if the product scope changes.

## Execution sequence — approved 2026-09-04

Project owner menyetujui urutan kerja ini pada 2026-09-04. Urutan diturunkan dari research gates dan dependency graph; items in the same sequence can proceed in parallel when their shared contracts are available.

| Sequence | Workstream | Items | Execution note |
|---|---|---|---|
| 1 | Data foundation | REQ-002 | Publish the approved static snapshot, validation result, fallback behavior, and lineage contract. |
| 2 (parallel) | Correctness gate | REQ-006 | Run golden cases against the snapshot and record the engine decision; this is a validation gate, not a runtime dependency. |
| 2 (parallel) | Route inputs and evidence | REQ-003, REQ-004, REQ-013, REQ-014 | Build transfer truth, local search, timing semantics, and bounded access evidence against the data contract. |
| 3 | Core route outcome | REQ-001 | Combine the approved data, inputs, transfer graph, and fixed scoring into one primary route result. |
| 4 (parallel) | User-facing vertical slice | REQ-012, REQ-005, REQ-015 | Deliver the mobile-first card, collapsible map companion, and explicit recovery around the route result. |
| 5 | Comprehension gate | REQ-016 | Test the assembled slice on low-end mobile and decide proceed, iterate, or narrow the demo claim. |
| Deferred | Post-MVP exploration | REQ-007–REQ-011 | Keep in discovery until the core route-comprehension outcome and business scope are proven. |

Formal `priority` and `size` fields for the 11 MVP items are approved as shown above. The dependency values remain a working graph to confirm or revise during engineering kickoff; the execution sequence is the approved delivery order.
