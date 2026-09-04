# Design Tokens: Astara

Universal semantic design tokens for the Astara transit companion. All components must import or reference these semantic tokens rather than hardcoding raw hex values or pixel sizes.

---

## 1. Color Palette

### 1.1 Brand & Neutral Foundation

| Token Name | Light Mode (Default) | Dark Mode (Neon Midnight) | Usage |
|---|---|---|---|
| `color-brand-primary` | `#059669` (Emerald-600) | `#10B981` (Emerald-500) | Primary actions, branding accents, pedestrian focus |
| `color-brand-hover` | `#047857` (Emerald-700) | `#059669` (Emerald-600) | Interactive hover states |
| `color-brand-subtle` | `#ECFDF5` (Emerald-50) | `#064E3B` (Emerald-950) | Highlighted card backgrounds, selection chips |
| `color-bg-canvas` | `#F8FAFC` (Slate-50) | `#0B0F17` (Deep Midnight) | Application root background |
| `color-bg-surface` | `#FFFFFF` (Pure White) | `#151D2A` (Dark Slate Surface) | Bottom sheet, cards, floating inputs |
| `color-bg-surface-elevated` | `#F1F5F9` (Slate-100) | `#1E293B` (Slate-800) | Secondary buttons, hovered items, timebar track |
| `color-text-primary` | `#0F172A` (Slate-900) | `#F8FAFC` (Slate-50) | Main titles, durations, prominent headsigns |
| `color-text-secondary` | `#475569` (Slate-600) | `#94A3B8` (Slate-400) | Subtitles, intermediate stops, instructions |
| `color-text-tertiary` | `#94A3B8` (Slate-400) | `#64748B` (Slate-500) | Timestamps, metadata, subtle hints |
| `color-border-subtle` | `#E2E8F0` (Slate-200) | `#243042` (Dark Slate Border) | Card dividers, input borders |
| `color-border-focus` | `#059669` (Emerald-600) | `#10B981` (Emerald-500) | Keyboard focus rings, active input outlines |

---

### 1.2 TransJakarta Official Corridor Tokens (SSOT)

Official TransJakarta branding colors must remain vivid and distinct across both basemap and UI badges.

```css
/* TransJakarta Official Corridor Palette */
--tj-corridor-1:  #E11D48; /* Red - Blok M to Kota */
--tj-corridor-2:  #2563EB; /* Blue - Pulo Gadung to Monas */
--tj-corridor-3:  #D97706; /* Amber Gold - Kalideres to Monas */
--tj-corridor-4:  #7C3AED; /* Purple - Pulo Gadung to Galunggung */
--tj-corridor-5:  #0D9488; /* Teal - Ancol to Kampung Melayu */
--tj-corridor-6:  #16A34A; /* Emerald - Ragunan to Galunggung */
--tj-corridor-7:  #DC2626; /* Crimson - Kampung Rambutan to Kampung Melayu */
--tj-corridor-8:  #9333EA; /* Deep Violet - Lebak Bulus to Pasar Baru */
--tj-corridor-9:  #EA580C; /* Orange - Pinang Ranti to Pluit */
--tj-corridor-10: #4F46E5; /* Indigo - Tanjung Priok to PGC */
--tj-corridor-11: #0284C7; /* Sky Blue - Pulo Gebang to Kampung Melayu */
--tj-corridor-12: #059669; /* Sea Green - Pluit to Tanjung Priok */
--tj-corridor-13: #C026D3; /* Fuchsia - Ciledug to Tegal Mampang */
--tj-feeder:      #0284C7; /* Feeder / Non-BRT Bus */
--tj-mikrotrans:  #0284C7; /* Mikrotrans Angkot */
```

- **Badge Foreground Rule:** Always pair with high-contrast text (`#FFFFFF` on dark colors, `#0F172A` on lighter hues).

---

### 1.3 Data Trust & Evidence Semantic Colors

Strictly mapped to the data honesty requirements in `REQ-012` and `REQ-014`:

| Evidence Status | Badge Background | Badge Text | Icon & Border | Semantic Meaning |
|---|---|---|---|---|
| `status-verified` | `#ECFDF5` (Emerald-50) | `#065F46` (Emerald-800) | `#059669` | Audited and verified physical path / gate |
| `status-limited` | `#F1F5F9` (Slate-100) | `#334155` (Slate-700) | `#64748B` | Unaudited walking path or missing gate geometry |
| `status-needs-check` | `#FFFBEB` (Amber-50) | `#92400E` (Amber-800) | `#D97706` | Outdated, conflicting, or provisional data |

---

### 1.4 Wayfinding & Motion Semantics

- `color-walk-leg`: `#64748B` (Neutral dashed vector line on map, distinct from transit colors).
- `color-transfer-hub`: `#F59E0B` (Amber interchange marker on map).
- `color-active-selection`: `#0284C7` (Sky blue highlight glow for active leg).

---

## 2. Typography Scale

Astara uses **Plus Jakarta Sans** (clean, modern, rounded geometric sans-serif reflecting Indonesian civic pride).

```css
font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

| Token Name | Size | Line Height | Weight | Letter Spacing | Purpose |
|---|---|---|---|---|---|
| `font-display-hero` | `32px` (`2rem`) | `36px` (`1.125`) | 800 (ExtraBold) | `-0.03em` | Total journey minutes (`34 mnt`) |
| `font-heading-lg` | `20px` (`1.25rem`) | `26px` (`1.3`) | 700 (Bold) | `-0.02em` | Route title (`TJ 1 Arah KOTA`) |
| `font-heading-md` | `16px` (`1rem`) | `22px` (`1.375`) | 600 (SemiBold) | `-0.01em` | Halte names, action step titles |
| `font-body-md` | `14px` (`0.875rem`) | `20px` (`1.42`) | 400 (Regular) | `0em` | Physical wayfinding instructions |
| `font-body-sm` | `13px` (`0.8125rem`)| `18px` (`1.38`) | 500 (Medium) | `0em` | Subtitle rationale, intermediate stop list |
| `font-badge-label` | `12px` (`0.75rem`) | `16px` (`1.33`) | 600 (SemiBold) | `0.02em` | `TruthBadge`, `ReasonChips` |
| `font-headsign-caps`| `11px` (`0.6875rem`)| `14px` (`1.27`) | 800 (ExtraBold) | `0.05em` | Direction indicator (`ARAH KOTA`) |

---

## 3. Spacing Scale (4px Base Grid)

```css
--space-1:   4px;   /* Micro gap between icon and text */
--space-2:   8px;   /* Inner padding of badges, chip gaps */
--space-3:  12px;   /* Card element spacing, list item padding */
--space-4:  16px;   /* Standard card padding, horizontal gutters */
--space-5:  20px;   /* Large container padding */
--space-6:  24px;   /* Bottom sheet inner padding */
--space-8:  32px;   /* Section separation */
--space-12: 48px;   /* Minimum touch target dimension */
```

- **Touch Target Rule:** Any clickable button or interactive chip must have an effective touch area of at least $\ge 48\times48\text{px}$ (using invisible padding if necessary).

---

## 4. Radii & Elevations

### 4.1 Corner Radii
- `radius-sm`: `6px` (Small badges, inline tags).
- `radius-md`: `10px` (Input fields, intermediate stop cards).
- `radius-lg`: `16px` (Reason cards, route summary container).
- `radius-sheet`: `24px` (Top corners of `RouteBottomSheet`).
- `radius-pill`: `9999px` (Search pills, `ReasonChips`, drag handle).

### 4.2 Elevation Shadows
```css
/* Light Mode Shadows */
--shadow-card:   0 2px 8px -2px rgba(15, 23, 42, 0.08), 0 1px 4px -1px rgba(15, 23, 42, 0.04);
--shadow-sheet:  0 -8px 24px -4px rgba(15, 23, 42, 0.12), 0 -2px 6px -1px rgba(15, 23, 42, 0.04);
--shadow-float:  0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);

/* Dark Mode Shadows */
--shadow-card-dark:  0 2px 8px -2px rgba(0, 0, 0, 0.4);
--shadow-sheet-dark: 0 -8px 30px -4px rgba(0, 0, 0, 0.6);
```

---

## 5. Animation & Motion

- `motion-spring-sheet`: `cubic-bezier(0.32, 0.72, 0, 1)` (Native iOS/Android-like drawer feel).
- `motion-duration-sheet`: `320ms` (Duration for bottom sheet snapping between states).
- `motion-duration-fade`: `180ms ease-out` (Dropdown accordion open/close).
- `motion-duration-map-fly`: `800ms ease-in-out` (Map camera panning to focused step).

---

## 6. Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| `mobile` (default) | `< 768px` | 1-column layout: Fullscreen map + 3-state bottom sheet |
| `desktop` | `≥ 768px` | 2-column layout: 420px fixed left sidebar + full map canvas |

---

## 7. Anti-Patterns & Prohibited Usages

| Prohibited Pattern | Reason | Compliant Alternative |
|---|---|---|
| ❌ Hardcoded Hex Values (e.g. `bg-[#0055ff]`) | Inconsistent branding and breaks dark mode | Use `color-bg-surface` or `--tj-corridor-X` |
| ❌ Color-Only Line Distinction | Colorblind users cannot distinguish similar lines | Use solid lines for bus + dashed for walking + text headsigns |
| ❌ Horizontal Scrolling Container on Mobile | Causes accidental drawer gesture conflicts | Keep all route steps in a single vertical stack |
| ❌ Microscopic Text ($< 11\text{px}$) | Unreadable while walking in bright outdoor sunlight | Minimum font size is $11\text{px}$ bold caps, body $\ge 14\text{px}$ |
| ❌ Fabricated Realtime Countdowns (`"Bus tiba 2 mnt lagi"`) | Hallucinates data trust when GTFS-RT is absent | Use headway intervals (`"Tiap 5-10 mnt"`) per `REQ-013` |
