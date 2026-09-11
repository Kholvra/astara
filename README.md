# Astara

Astara is an explainable, pedestrian-first TransJakarta transit companion for Jakarta. It computes optimal itineraries across BRT corridors, feeder buses, and Mikrotrans (JakLingko), presenting human-readable route cards paired with an interactive MapLibre GL visual companion.

---

## Key Features

- **Explainable Transit Routing**: Multi-modal route calculation connecting BRT corridors, feeder lines, and Mikrotrans with clear rationale explaining why an itinerary is recommended (transfer count, directness, and walking effort).
- **Pedestrian-First Wayfinding**: Real walking connections, platform transfer instructions, and verified station entrances tailored for Jakarta riders.
- **Dynamic GeoJSON Shape Slicing**: Pre-slices high-density GTFS geometry (>240,000 coordinates) into lightweight route segments on demand, avoiding massive client bundles.
- **Interactive Map Companion**: Custom MapLibre GL renderer with corridor-accurate branding, stop markers, transfer path visualization, and zero vendor lock-in (`NEXT_PUBLIC_MAP_STYLE_URL`).
- **Gesture-Driven Bottom Sheet**: Non-intrusive mobile exploration interface supporting smooth swipe-up expansion, compact resting states, and zero scroll traps.
- **Local-First Stop Index**: Resolves origin and destination searches against local GTFS stop indexes before invoking external geocoders.
- **Honest Data Transparency**: Explicit labels for unverified pedestrian paths and limitations (`Data terbatas` / `Perlu dicek`) without hallucinating live bus arrivals or missing accessibility data.

---

## Tech Stack

| Layer              | Technology                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | [Next.js 15](https://nextjs.org/) (App Router, React 19)                                                            |
| **Language**       | [TypeScript](https://www.typescriptlang.org/) (Strict mode, `noUncheckedIndexedAccess`)                             |
| **Styling**        | [Tailwind CSS v4](https://tailwindcss.com/)                                                                         |
| **API Layer**      | [tRPC v11](https://trpc.io/) with [Zod](https://zod.dev/) validation & [TanStack Query](https://tanstack.com/query) |
| **Database & ORM** | [Prisma](https://www.prisma.io/) with [PostgreSQL](https://www.postgresql.org/)                                     |
| **Map Rendering**  | [MapLibre GL JS](https://maplibre.org/) (with local web workers)                                                    |
| **Testing**        | [Vitest](https://vitest.dev/) (270+ unit and golden integration tests)                                              |
| **Icons**          | [Lucide React](https://lucide.dev/)                                                                                 |

---

## Architecture & Project Structure

The project strictly follows one-way layer flow:
`UI (RouteCard / Map)` &rarr; `Route Engine / Services` &rarr; `Data Layer / GTFS Index` &rarr; `Shared Lib / Types`.

```
astara/
├── prisma/               # Prisma database schema and migrations
├── public/maplibre/      # Copied MapLibre GL web workers (offline-ready)
├── scripts/              # Build, GTFS seeding, and worker automation scripts
├── src/
│   ├── app/              # Next.js App Router entrypoints and route handlers
│   ├── core/             # Pure transit domain logic (zero browser/framework dependencies)
│   │   ├── access/       # Pedestrian accessibility and evidence tracking
│   │   ├── geojson/      # Shape slicing and GeoJSON geometry helpers
│   │   ├── ingestion/    # GTFS CSV parsers, time normalizers, and lifecycle
│   │   ├── planner/      # Presentation models and planner state machines
│   │   ├── routing/      # Multi-modal routing engine, transfer graph, and heuristics
│   │   ├── search/       # Local GTFS stop index and search adapters
│   │   └── timing/       # Midnight+ service times and headway models
│   ├── data/             # Static datasets, curated pedestrian paths, and fixtures
│   ├── map/              # MapLibre wrapper, marker layers, and camera controllers
│   ├── server/           # tRPC routers, GTFS snapshot services, and database clients
│   ├── trpc/             # Client-side tRPC React query hooks
│   └── ui/               # Presentation components (Route cards, Search, Bottom sheet)
│       ├── explore/      # Explore bottom sheet and destination discovery
│       ├── map/          # Location reader and map overlay controls
│       ├── planner/      # Planner orchestrator and status panels
│       └── route-card/   # Route summary cards and timeline steps
└── tests/
    └── golden/           # Real-world Jakarta origin-destination test fixtures
```

---

## Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher
- **PostgreSQL**: local instance or hosted URL (e.g. Supabase, Neon)

### Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Kholvra/astara.git
   cd astara
   pnpm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Configure `.env` with your PostgreSQL database URL and optional MapLibre style URL.

3. Push schema to the database:

   ```bash
   pnpm db:push
   ```

4. Seed the MVP GTFS dataset:

   ```bash
   pnpm db:seed:mvp
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable                     | Description                                       | Default / Example                                      |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`               | PostgreSQL connection string                      | `postgresql://postgres:password@localhost:5432/astara` |
| `DATABASE_URL_UNPOOLED`      | Direct connection string for migrations           | Same as `DATABASE_URL`                                 |
| `NEXT_PUBLIC_MAP_STYLE_URL`  | MapLibre-compatible vector tile style JSON URL    | Optional during bootstrap                              |
| `GTFS_SERVICE_DATE`          | Target service date for GTFS schedule evaluation  | `2026-09-09`                                           |
| `GTFS_APPROVED_SOURCE_HOSTS` | Whitelisted hosts for GTFS snapshot downloads     | `ppid.transjakarta.co.id`                              |
| `GTFS_AGING_AFTER_HOURS`     | Duration in hours before snapshot is marked aging | `24`                                                   |
| `GTFS_STALE_AFTER_HOURS`     | Duration in hours before snapshot is marked stale | `72`                                                   |
| `GTFS_ALLOW_STALE_DEMO`      | Allows demo operation when GTFS feed is stale     | `true`                                                 |

---

## Development & Testing Commands

- **Start Dev Server**: `pnpm dev` (runs Next.js Turbo server; automatically copies MapLibre workers to `public/maplibre/`).
- **Run Typecheck & Lint**: `pnpm check` (or `SKIP_ENV_VALIDATION=1 pnpm check` without environment secrets).
- **Run Unit & Integration Tests**: `pnpm test` (`vitest run`).
- **Watch Tests**: `pnpm test:watch`.
- **Build for Production**: `pnpm build`.
- **Database Schema Sync**: `pnpm db:push`.
- **Database Migrations Deploy**: `pnpm db:migrate`.
- **Prisma Studio**: `pnpm db:studio`.

---

## Principles & Guardrails

1. **Search Before You Write**: Extend existing modules and reuse domain primitives before adding new files or functions.
2. **Decouple Map from Routing**: The map renderer receives pre-sliced GeoJSON route legs and markers; it never performs routing calculations or parses raw GTFS files.
3. **Named Exports Only**: Default exports are reserved strictly for Next.js route entrypoints (`src/app/**/page.tsx`, `layout.tsx`).
4. **Resilience over Fragility**: Core routing and golden cases operate with static/cached GTFS snapshots to ensure reliable performance during network outages.

---

## License

Private repository. All rights reserved.
