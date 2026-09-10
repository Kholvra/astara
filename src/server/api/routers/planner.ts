import { z } from "zod";

import { parseIsoServiceDate } from "~/core/ingestion/gtfsCalendar";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  createPlannerService,
  type PlannerService,
} from "~/server/planner/plannerService";
import { createGtfsSnapshotRepository } from "~/server/gtfs/gtfsSnapshotRepository";
import { readGtfsRuntimeConfig } from "~/server/gtfs/gtfsRuntimeConfig";

export const departAtSchema = z.object({
  mode: z.literal("depart-at"),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => parseIsoServiceDate(value) !== undefined),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1).max(64),
});

export const routeInputSchema = z.object({
  originId: z.string().trim().min(1).max(160),
  destinationId: z.string().trim().min(1).max(160),
  departAt: departAtSchema,
  snapshotId: z.string().trim().min(1).max(200),
  configurationHash: z.string().trim().min(1).max(2_000),
});

type PlannerServiceFactory = (
  database: Parameters<typeof createGtfsSnapshotRepository>[0],
) => PlannerService;

function createService(
  database: Parameters<typeof createGtfsSnapshotRepository>[0],
) {
  const config = readGtfsRuntimeConfig();
  return createPlannerService({
    repository: createGtfsSnapshotRepository(database),
    policy: config.freshnessPolicy,
  });
}

export function createPlannerRouter(
  serviceFactory: PlannerServiceFactory = createService,
) {
  return createTRPCRouter({
    catalog: publicProcedure.query(async ({ ctx }) => {
      try {
        return await serviceFactory(ctx.db).getCatalog();
      } catch {
        return {
          state: "failure" as const,
          kind: "error" as const,
          message: "Data transit sedang tidak tersedia. Coba lagi.",
          retryable: true,
        };
      }
    }),
    route: publicProcedure
      .input(routeInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await serviceFactory(ctx.db).planRoute(input);
        } catch {
          return {
            state: "failure" as const,
            kind: "error" as const,
            message: "Rute belum dapat dihitung. Coba lagi atau ubah pilihan.",
            retryable: true,
          };
        }
      }),
  });
}

export const plannerRouter = createPlannerRouter();
