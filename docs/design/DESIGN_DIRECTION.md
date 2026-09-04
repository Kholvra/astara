# Design Direction: Astara

## Chosen Direction: Modern Minimalist Jakarta ("Calm Transit Clarity")

### 1. Thesis
Public transit navigation in Jakarta is inherently chaotic, hot, and noisy. Astara acts as an antidote to urban cognitive overload: a calm, decisive, high-contrast digital companion that delivers instant certainty in 3 seconds. The interface embraces the mental model of Jakarta's leading ride-hailing and map applications (Gojek / Apple Maps bottom sheet), stripping away extraneous visual noise so that physical wayfinding actions stand out with supreme clarity.

### 2. Palette & Materials
- **Canvas & Surfaces:** Whisper-soft neutral canvas (`#F8FAFC`), elevated pure white cards (`#FFFFFF`), and refined slate dividers (`#E2E8F0`). In dark mode, switches to an immersive midnight palette (`#0B0F17` / `#151D2A`).
- **Accent Contrasts:** Primary brand is **Pedestrian Emerald Green** (`#059669`), representing cool, sustainable, pedestrian-first mobility and verified data trust. Saturated official TransJakarta corridor colors (`#E11D48` Red, `#2563EB` Blue, `#EA580C` Orange, etc.) serve as the primary transit landmarks against a desaturated, low-contrast basemap.
- **Surface Materials:**
  - *Floating Search Pill:* Semi-translucent frosted glass (`backdrop-blur-md bg-white/90`) with soft edge highlight.
  - *Bottom Sheet Drawer:* Tactile card surface with smooth 24px rounded top corners and subtle multi-layer diffuse shadow (`shadow-sheet`).
  - *Touch Anchors:* Softly rounded pill chips (`rounded-full`) with comfortable $48\times48\text{px}$ touch targets.
- **Typography:** *Plus Jakarta Sans* — rounded, humanist, modern geometry that feels warm, optimistic, and effortlessly readable in bright tropical daylight.

### 3. First Viewport Experience (Mobile Baseline)
- **Top 65% Viewport:** Clean, light-mode Carto Positron basemap automatically framed to the journey bounds. The transit corridor glows with a crisp 5px solid color line, while pedestrian walk legs are rendered with distinct charcoal dashed paths.
- **Bottom 35% Viewport (Peek State):**
  - Instant duration typography: **34 mnt** in extra-bold 32px display font.
  - Primary route badge: High-contrast corridor tag (`TJ 1 Arah KOTA`).
  - Single-line human explanation: *"Paling mudah: 1x transit tanpa nyebrang jalan"*.
  - Two glanceable chips: `[ 🛡️ Cuma 1x Pindah ]` `[ 🚶 280 m Jalan ]`.
  - Segmented visual timebar showing the exact ratio of walking vs. riding.
  - Clear drawer handle prompting an effortless swipe up to view step-by-step gate and JPO wayfinding.

### 4. Honest Trade-offs & Risk Mitigation
- **Risk:** Without careful contrast management, all-white minimalist card layouts can look generic or sterile.
- **Mitigation:** Celebrate TransJakarta's vibrant corridor identities as first-class design elements. Use authentic physical wayfinding language (JPO, platform gates, direction headsigns) rather than abstract generic routing icons.

---

## Alternative Directions Considered & Rejected

### Alternative A: Transit Utilitarian ("Metro Physical Signage")
- **Concept:** Emulate physical subway station signage (TfL Underground, MRT Jakarta platform signs). Stark black and white, heavy 2px borders, rigid square corners (0–4px radius), industrial signage pictograms.
- **Why Rejected:** Felt intimidating, institutional, and rigid. Infrequent transit users need reassuring, friendly guidance rather than looking like an internal operator terminal.

### Alternative B: Editorial Pedestrian ("City Explorer / Urban Gazette")
- **Concept:** Styled like an architectural city magazine. Warm cream backgrounds (`#FDFBF7`), muted olive tones, serif headlines, leisurely walking guides with landmarks.
- **Why Rejected:** Incompatible with fast, utilitarian commuter needs. When standing on a hot street corner or in a crowded queue, riders need instant glanceability, bold numbers, and high contrast, not leisurely editorial reading.

### Alternative C: Neo-Brutalist Dispatch ("Terminal Transit")
- **Concept:** High-contrast retro brutalism. Bold yellow backdrops, thick black offset drop shadows (`shadow-[4px_4px_0px_#000]`), raw monospace data tables.
- **Why Rejected:** Trend-driven and visually exhausting. Directly violated Astara's non-negotiable principle of reducing cognitive load for travelers of all ages.
