# Astara

Astara is an explainable, pedestrian-first TransJakarta transit companion.
The application is bootstrapped with the stock [T3 Stack](https://create.t3.gg/)
and keeps authentication enabled.

## Local development

```bash
pnpm install
pnpm dev
```

The local database workflow is intentionally deferred for the current
bootstrap. Authentication remains configured through the variables in
`.env.example`.

## Stack

- Next.js App Router and TypeScript
- tRPC and Zod
- Prisma with PostgreSQL
- NextAuth.js with the Prisma adapter
- Tailwind CSS
- MapLibre GL JS
- Vitest

## Project boundaries

- `src/core/` owns pure transit/domain logic.
- `src/data/` will own GTFS and curated pedestrian data.
- `src/map/` renders prepared route geometry with MapLibre.
- `src/server/` owns tRPC, authentication, and server adapters.
- `src/ui/` owns presentation components.

Map style configuration is optional during bootstrap and must be supplied via
`NEXT_PUBLIC_MAP_STYLE_URL`; no tile provider is hardcoded.
