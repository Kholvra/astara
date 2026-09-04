# Design Brief: Astara (Explainable TransJakarta Transit Companion)

## Visitor Mode
**Operate**  
The user is an active traveler or prospective commuter preparing to navigate Jakarta. The primary mode of engagement is utilitarian, high-stress (often on the street or at a bustling station), and requires instant decision clarity without cognitive friction.

## Problem
Commuters and infrequent travelers in Jakarta face acute confusion when navigating the TransJakarta (TJ) network:
- Identical or overlapping route codes have disparate destinations, platforms, or branches.
- Google Maps presents 5–10 technically valid transit options that overwhelm users with micro-transfers or unrealistic street-level crossings.
- Official apps suffer from data clutter and lack physical wayfinding context (e.g., which entrance gate, which JPO bridge, which platform direction).
- Riders resort to asking friends, security guards, or social media out of fear of boarding the wrong bus.

## Solution
Astara computes and delivers **a single, explainable best route** presented via a 3-state bottom sheet (Gojek / Apple Maps interaction model) floating above a synchronized MapLibre GL visual canvas. Instead of dumping raw transit graphs, Astara explains the route in human-readable steps:
1. Exact station entrance/gate.
2. Bus code and prominent capitalized headsign (`TJ 1 Arah KOTA`).
3. Platform and alighting stop count.
4. Step-by-step pedestrian transfer paths (JPO, concourse, platform change).
5. Explicit, honest data status badges (`Terverifikasi`, `Data terbatas`, `Perlu dicek`).

## Experience Principles

### 1. Decisive over Exhaustive
*Resolves the tension between providing comprehensive alternative routes vs. eliminating choice paralysis.*  
Astara's route engine selects the single most sensible, least confusing itinerary. The UI does not force the user to evaluate multiple trade-off cards; it presents one authoritative, confident answer.

### 2. Physical Reality over Abstract Geometry
*Resolves the tension between theoretical transit stop coordinates vs. actual street-level pedestrian wayfinding.*  
A transit stop is not a coordinate point; it is a physical entity with specific gates, stairs, JPO overpasses, and directional platforms. Instructions prioritize physical landmarks and entrance sides over abstract GPS lines.

### 3. Radical Truthfulness over Feigned Completeness
*Resolves the tension between marketing an "all-knowing" transit AI vs. maintaining unshakeable user trust.*  
Astara never hallucinates real-time bus locations or wheelchair ramps. Missing pedestrian audit data is explicitly branded with clear status badges (`Data terbatas` or `Perlu dicek`). What is shown is verified; what is unknown is honestly disclosed.

## Aesthetic Direction
- **Philosophy:** "Calm Transit Utility" — clean, high-contrast, uncluttered modern urban design.
- **Tone:** Dependable, warm, clear, crisp, pedestrian-first.
- **References:**
  - *Transit App (Transit 6.0):* Horizontal visual timebars, oversized glanceable duration typography, high-contrast route pills, friendly humanist typeface.
  - *Gojek / Apple Maps:* Interactive full-screen map foundation paired with an anchored, swipeable bottom drawer.
  - *Citymapper:* Micro-wayfinding precision for station entrances, exits, and platform directions.
- **Anti-References:**
  - Cluttered 10-route comparison lists with competing arrival chips (Google Maps transit mode).
  - Ad-laden, visually noisy official transit portals with microscopic text and complex tables.
  - Long prose paragraphs or chatty AI responses that require reading while walking.

## Existing Patterns (Repository Alignment)
- **Layer Direction:** Strict one-way flow (`UI` -> `Route Engine / Services` -> `Data Layer / GTFS Index` -> `Shared Lib / Types`).
- **Data Invariants:** Coordinates strictly formatted as GeoJSON `[longitude, latitude]`.
- **Glossary:** Standardized Bahasa Indonesia terms (`Halte`, `Arah`, `Pindah`, `Jalan kaki`, `Terverifikasi`, `Data terbatas`, `Perlu dicek`, `Tidak ada rute`).

## Component Inventory

| Component | Status | Role & Placement |
|---|---|---|
| `SearchHeader` | New | Floating search input bar anchored at the top of the viewport |
| `MapContainer` | New | Full-bleed MapLibre GL canvas with lightweight monochrome vector tiles |
| `RouteBottomSheet` | New | 3-state draggable drawer (`Collapsed`, `Peek`, `Expanded`) |
| `RouteSummaryCard` | New | Top section of the bottom sheet showing total time, line badge, and headline reason |
| `RouteTimebar` | New | Segmented horizontal bar visualizing walking vs. transit duration proportions |
| `ReasonChips` | New | Compact pills displaying factual selection drivers (e.g., `[🛡️ Tanpa Pindah]`, `[🚶 250 m Jalan]`) |
| `RouteTimeline` | New | Vertical ordered list of physical journey actions |
| `StepActionItem` | New | Individual step item (origin walk, boarding, transit, alighting, transfer, final walk) |
| `TruthBadge` | New | Visual trust indicator (`Terverifikasi`, `Data terbatas`, `Perlu dicek`) |
| `IntermediateStopsDropdown`| New | Collapsible accordion revealing stops traversed between boarding and alighting |

## Key Interactions
1. **Search & Confirm:** User taps floating search bar, types destination, and selects from local GTFS stop index suggestions.
2. **Instant Route Lock (Peek State):** Bottom sheet transitions to `Peek` state (~35% viewport height). Map automatically adjusts camera (`fitBounds`) to display the entire journey geometry.
3. **Drawer Expansion (Expanded State):** User swipes up or taps `Lihat Langkah Perjalanan`. Bottom sheet expands to ~75% viewport height, displaying the step-by-step wayfinding timeline. Map remains visible at the top ~25%.
4. **Step Selection & Map Synchronization:** Tapping any step in the timeline triggers a camera pan/zoom (`flyTo`) in MapLibre to highlight that specific leg and focus on the associated decision marker.
5. **Dismissal / Reset:** Tapping close (`✕`) or clearing search collapses the sheet back to search state and resets the map.

## Responsive Behavior
- **Mobile Viewport (Primary Baseline, <768px):**
  - Full-bleed map background (`h-screen w-screen`).
  - Floating top search pill with safe-area padding (`env(safe-area-inset-top)`).
  - Anchored bottom sheet with touch handle (`h-1.5 w-12 rounded-full`).
  - Zero horizontal scrolling. All touch targets strictly $\ge 48\times48\text{px}$.
- **Tablet / Desktop Viewport ($\ge 768\text{px}$):**
  - 2-column split layout.
  - Left column: Fixed planning sidebar (`w-[420px] max-w-[440px] h-screen overflow-y-auto border-r shadow-lg`).
  - Right column: Full-bleed interactive MapLibre canvas occupying remaining viewport width.
  - Bottom sheet abstraction translates seamlessly into the structured left sidebar panel.

## Accessibility Requirements
- **Color Contrast:** All text and critical UI elements adhere to WCAG 2.1 AA standards ($\ge 4.5:1$ for body text, $\ge 3:1$ for large text and transit badges).
- **Non-Color Semantics:** Transit legs and walking legs are distinguished by line structure (solid vs. dashed), text labels, and iconography, never by color alone.
- **Screen Reader Support:**
  - Semantic HTML landmarks (`<main>`, `<nav>`, `<aside>`).
  - ARIA attributes: `aria-expanded` on accordion and bottom sheet, `aria-live="polite"` for route updates.
- **Localization:** Primary UI copy in approved Bahasa Indonesia transit terminology. English design documentation.

## Out of Scope
- Multi-modal routing outside TransJakarta (MRT, KRL Commuter Line, LRT deferred for initial MVP).
- Real-time bus GPS tracking or live ETA countdowns (GTFS-Static schedule & frequency headways only).
- User authentication, personal accounts, saved route history.
- Ticketing, QR code generation, or in-app payment processing.
