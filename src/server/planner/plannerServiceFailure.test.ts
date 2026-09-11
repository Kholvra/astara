import { describe, expect, it } from "vitest";

import { makeSnapshot } from "~/core/routing/routeEngineTestFixtures";
import type { RouteSelectionResult } from "~/core/routing/routingTypes";

import { createPlannerService } from "./plannerService";

const policy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data jadwal bersifat statis untuk demo dan dapat berubah.",
};

describe("planner route failure mapping", () => {
  it("explains search exhaustion as a retryable calculation limit", async () => {
    const snapshot = makeSnapshot();
    const exhausted: RouteSelectionResult = {
      state: "limited-data",
      code: "SEARCH_EXHAUSTED",
      message: "Search budget exhausted.",
      recoveryAction: "Choose another supported journey.",
    };
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () => ({
          metadata: snapshot.metadata,
          serviceDate: snapshot.serviceDate,
          coverage: snapshot.coverage,
          limitations: snapshot.limitations,
          hasIntervalFrequencies: false,
          hasShapeGeometry: true,
        }),
      },
      policy,
      selectRoute: () => exhausted,
    });

    const catalog = await service.getCatalog();
    if (catalog.state !== "success") throw new Error("Catalog failed");
    const result = await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: catalog.catalog.snapshotId,
      configurationHash: catalog.catalog.configurationHash,
    });

    expect(result).toEqual({
      state: "failure",
      kind: "error",
      message:
        "Pencarian rute terlalu kompleks untuk diselesaikan sekarang. Coba halte atau waktu lain.",
      retryable: true,
      routeFailure: exhausted,
    });
  });
});
