import { describe, expect, it, vi } from "vitest";

import { makeSnapshot } from "~/core/routing/routeEngineTestFixtures";
import { parseGtfsTime } from "~/core/ingestion/gtfsTime";
import type {
  RouteSelectionRequest,
  RouteSelectionResult,
} from "~/core/routing/routingTypes";
import {
  createPlannerService,
  MAX_TRANSFER_EDGE_CANDIDATES,
} from "./plannerService";

const policy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data jadwal bersifat statis untuk demo dan dapat berubah.",
};

const statusFacts = (snapshotId: string) => ({
  metadata: {
    snapshotId,
    sourceUrl: "https://example.test/gtfs.zip",
    acquiredAt: "2026-09-10T00:00:00.000Z",
    contentHash: "hash-test",
  },
  serviceDate: "2026-09-11",
  coverage: "complete" as const,
  limitations: [],
  hasIntervalFrequencies: false,
  hasShapeGeometry: true,
});

describe("planner service", () => {
  it("returns a local snapshot catalog and routes with pinned identity", async () => {
    const snapshot = makeSnapshot();
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-10T01:00:00.000Z",
    });

    const catalogResult = await service.getCatalog();
    expect(catalogResult.state).toBe("success");
    if (catalogResult.state !== "success") throw new Error("catalog failed");
    expect(catalogResult.catalog.items.map((item) => item.id)).toEqual([
      "origin",
      "destination",
    ]);
    expect(catalogResult.catalog.configurationHash).toContain(
      "planner-config-v1",
    );

    const result = await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });
    expect(result.state).toBe("success");
    if (result.state !== "success") throw new Error("route failed");
    expect(result.result.primary.originStopId).toBe("origin");
    expect(result.stopLabels.destination).toBe("Destination");
    expect(Object.keys(result.stopLabels)).toEqual(["origin", "destination"]);
    expect(result.mapData.routeId).toBe(result.result.primary.routeId);
  });

  it("fails closed before routing when snapshot or effective config pins disagree", async () => {
    const snapshot = makeSnapshot();
    const planEngine = vi.fn();
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-10T01:00:00.000Z",
      selectRoute: planEngine,
    });
    const catalogResult = await service.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");

    const result = await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: "other-snapshot",
      configurationHash: "other-config",
    });
    expect(result).toMatchObject({ state: "failure", kind: "stale-data" });
    expect(planEngine).not.toHaveBeenCalled();
  });

  it("rejects a catalog pin when the effective route policy changes", async () => {
    const snapshot = makeSnapshot();
    const repository = {
      getActiveSnapshot: async () => snapshot,
      getActiveStatusFacts: async () =>
        statusFacts(snapshot.metadata.snapshotId),
    };
    const original = createPlannerService({ repository, policy });
    const catalogResult = await original.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");

    const selectRoute = vi.fn();
    const changed = createPlannerService({
      repository,
      policy,
      routeConfig: { maxTransfers: 2 },
      selectRoute,
    });
    const result = await changed.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });

    expect(result).toMatchObject({ state: "failure", kind: "stale-data" });
    expect(selectRoute).not.toHaveBeenCalled();
  });

  it("rejects inconsistent active reads without publishing a mixed result", async () => {
    const snapshot = makeSnapshot();
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () => statusFacts("other-snapshot"),
      },
      policy,
    });
    const result = await service.getCatalog();
    expect(result).toMatchObject({ state: "failure", kind: "error" });
  });

  it("carries an allowed stale-demo note into the prepared route lineage", async () => {
    const snapshot = makeSnapshot();
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-20T01:00:00.000Z",
    });

    const catalogResult = await service.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");
    const result = await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });

    expect(result.state).toBe("success");
    if (result.state !== "success") return;
    expect(result.status.freshness).toBe("stale");
    expect(result.status.staticDemoNote).toBe(policy.staleDemoNote);
    expect(result.result.primary.lineage).toMatchObject({
      freshness: "stale",
      staticDemoNote: policy.staleDemoNote,
    });
  });

  it("keeps GTFS after-midnight service times routable from the local Jakarta clock", async () => {
    const base = makeSnapshot();
    const snapshot = {
      ...base,
      stopTimes: base.stopTimes.map((stopTime) => {
        const value = stopTime.stopId === "origin" ? "25:10:00" : "25:40:00";
        const parsed = parseGtfsTime(value);
        return { ...stopTime, arrivalTime: parsed, departureTime: parsed };
      }),
    };
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-10T01:00:00.000Z",
    });
    const catalogResult = await service.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");

    const result = await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "01:10",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });

    expect(result.state).toBe("success");
    if (result.state !== "success") return;
    expect(result.result.primary.timing).toMatchObject({
      semantics: "exact",
      departure: { raw: "25:10:00" },
      arrival: { raw: "25:40:00" },
    });
  });

  it("bounds shared-parent transfer expansion before route selection", async () => {
    const base = makeSnapshot();
    const lineage = base.stops[0]?.lineage;
    if (!lineage) throw new Error("Transfer fixture requires stop lineage");
    const extraStops = Array.from({ length: 280 }, (_, index) => ({
      id: `platform-${index}`,
      name: `Platform ${index}`,
      coordinate: [106.8, -6.2] as [number, number],
      parentStationId: `station-${Math.floor(index / 40)}`,
      lineage: { ...lineage, rowNumber: index + 10 },
    }));
    const snapshot = { ...base, stops: [...base.stops, ...extraStops] };
    const selectRoute = vi.fn(
      (_request: RouteSelectionRequest): RouteSelectionResult => ({
        state: "no-route",
        code: "NO_ELIGIBLE_JOURNEY",
        message: "No route in bounded transfer fixture.",
        recoveryAction: "Choose another stop.",
      }),
    );
    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-10T01:00:00.000Z",
      selectRoute,
    });
    const catalogResult = await service.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");

    await service.planRoute({
      originId: "origin",
      destinationId: "destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });

    const request = selectRoute.mock.calls[0]?.[0];
    expect(request?.transferEdges.length).toBeLessThanOrEqual(
      MAX_TRANSFER_EDGE_CANDIDATES,
    );
  });

  it("plans a route when origin and destination are parent stations", async () => {
    const base = makeSnapshot();
    const lineage = base.stops[0]?.lineage;
    if (!lineage) throw new Error("Fixture lineage missing");

    const stops: typeof base.stops = [
      {
        id: "station-origin",
        name: "Origin Station",
        coordinate: [106.8, -6.2],
        locationType: 1,
        lineage: { ...lineage, rowNumber: 10 },
      },
      {
        id: "platform-origin",
        name: "Origin Platform",
        coordinate: [106.8, -6.2],
        locationType: 0,
        parentStationId: "station-origin",
        lineage: { ...lineage, rowNumber: 11 },
      },
      {
        id: "station-destination",
        name: "Destination Station",
        coordinate: [106.81, -6.19],
        locationType: 1,
        lineage: { ...lineage, rowNumber: 12 },
      },
      {
        id: "platform-destination",
        name: "Destination Platform",
        coordinate: [106.81, -6.19],
        locationType: 0,
        parentStationId: "station-destination",
        lineage: { ...lineage, rowNumber: 13 },
      },
    ];

    const stopTimes = [
      {
        ...base.stopTimes[0]!,
        stopId: "platform-origin",
        departureTime: parseGtfsTime("08:05:00"),
        arrivalTime: parseGtfsTime("08:05:00"),
      },
      {
        ...base.stopTimes[1]!,
        stopId: "platform-destination",
        departureTime: parseGtfsTime("08:25:00"),
        arrivalTime: parseGtfsTime("08:25:00"),
      },
    ];

    const snapshot = {
      ...base,
      stops,
      stopTimes,
    };

    const service = createPlannerService({
      repository: {
        getActiveSnapshot: async () => snapshot,
        getActiveStatusFacts: async () =>
          statusFacts(snapshot.metadata.snapshotId),
      },
      policy,
      now: () => "2026-09-10T01:00:00.000Z",
    });

    const catalogResult = await service.getCatalog();
    if (catalogResult.state !== "success") throw new Error("catalog failed");

    const result = await service.planRoute({
      originId: "station-origin",
      destinationId: "station-destination",
      departAt: {
        mode: "depart-at",
        localDate: "2026-09-11",
        localTime: "08:00",
        timezone: "Asia/Jakarta",
      },
      snapshotId: snapshot.metadata.snapshotId,
      configurationHash: catalogResult.catalog.configurationHash,
    });

    expect(result.state).toBe("success");
    if (result.state !== "success") throw new Error("route failed");
    expect(result.result.primary.originStopId).toBe("station-origin");
    expect(result.result.primary.destinationStopId).toBe("station-destination");
  });
});
