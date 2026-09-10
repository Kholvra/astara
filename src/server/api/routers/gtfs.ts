import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createGtfsStatusService } from "~/server/gtfs/gtfsStatusService";
import { createGtfsSnapshotRepository } from "~/server/gtfs/gtfsSnapshotRepository";
import { readGtfsRuntimeConfig } from "~/server/gtfs/gtfsRuntimeConfig";

export const gtfsRouter = createTRPCRouter({
  status: publicProcedure.query(async ({ ctx }) => {
    try {
      const config = readGtfsRuntimeConfig();
      const service = createGtfsStatusService({
        repository: createGtfsSnapshotRepository(ctx.db),
        policy: config.freshnessPolicy,
      });
      return service.getStatus();
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Status data transit sedang tidak tersedia.",
      });
    }
  }),
});
