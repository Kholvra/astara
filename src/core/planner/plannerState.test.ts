import { describe, expect, it, vi } from "vitest";

import type {
  PlannerCatalog,
  PlannerPlanInput,
  PlannerPlanOutcome,
  PlannerPlanSuccess,
} from "./plannerTypes";
import { createPlannerController } from "./plannerState";

const status = {
  networkAvailability: "available" as const,
  freshness: "current" as const,
  coverage: "complete" as const,
  evidenceState: "Terverifikasi" as const,
  connectionState: "no-edge" as const,
  timingSemantics: "exact" as const,
  geometryState: "supported" as const,
  limitations: [],
};

const origin = {
  id: "origin",
  name: "Halte Asal",
  type: "stop_or_route" as const,
  coordinates: [106.8, -6.2] as [number, number],
  source: "gtfs_local" as const,
  confidence: "high" as const,
  verification: "Terverifikasi" as const,
};

const destination = {
  ...origin,
  id: "destination",
  name: "Halte Tujuan",
  coordinates: [106.81, -6.19] as [number, number],
};

const departAt = {
  mode: "depart-at" as const,
  localDate: "2026-09-11",
  localTime: "08:00",
  timezone: "Asia/Jakarta",
};

const catalog: PlannerCatalog = {
  snapshotId: "snapshot-1",
  configurationHash: "config-1",
  items: [],
  status,
};

const success: PlannerPlanSuccess = {
  state: "success",
  snapshotId: "snapshot-1",
  configurationHash: "config-1",
  result: {} as PlannerPlanSuccess["result"],
  stopLabels: { origin: "Halte Asal", destination: "Halte Tujuan" },
  mapData: {} as PlannerPlanSuccess["mapData"],
  status,
};

const microtask = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("planner state controller", () => {
  it("fails closed when a catalog reports unavailable network data", async () => {
    const controller = createPlannerController({
      loadCatalog: async () => ({
        ...catalog,
        status: { ...status, networkAvailability: "unavailable" as const },
      }),
      planRoute: async () => success,
    });

    controller.open();
    await microtask();

    expect(controller.getState()).toMatchObject({
      state: "stale-data",
      retryAvailable: true,
      catalog: null,
    });
  });

  it("moves valid inputs through ready, loading, result, and detail", async () => {
    const planRoute = vi.fn(async () => success);
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute,
    });

    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    expect(controller.getState().state).toBe("ready");

    controller.plan();
    expect(controller.getState().state).toBe("loading");
    await microtask();
    expect(controller.getState().state).toBe("result");
    expect(planRoute).toHaveBeenCalledOnce();

    controller.openDetail();
    expect(controller.getState().state).toBe("detail");
    controller.back();
    expect(controller.getState().state).toBe("result");
    controller.back();
    expect(controller.getState().state).toBe("select");
  });

  it("ignores duplicate submits and stale completions after edit", async () => {
    let resolveRoute: ((outcome: PlannerPlanOutcome) => void) | undefined;
    const planRoute = vi.fn(
      () =>
        new Promise<PlannerPlanOutcome>((resolve) => {
          resolveRoute = resolve;
        }),
    );
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    controller.plan();
    expect(planRoute).toHaveBeenCalledOnce();

    controller.edit();
    resolveRoute?.(success);
    await microtask();
    expect(controller.getState().state).toBe("select");
    expect(controller.getState().route).toBeNull();
  });

  it("cancels an in-flight operation when browser back is pressed", async () => {
    let resolveRoute: ((outcome: PlannerPlanOutcome) => void) | undefined;
    const planRoute = vi.fn(
      () =>
        new Promise<PlannerPlanOutcome>((resolve) => {
          resolveRoute = resolve;
        }),
    );
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    controller.back();
    expect(controller.getState()).toMatchObject({
      state: "select",
      origin,
      destination,
      departAt,
      route: null,
    });
    resolveRoute?.(success);
    await microtask();
    expect(controller.getState().state).toBe("select");
  });

  it("accepts only the current revision when an edited plan is submitted", async () => {
    const resolvers: Array<(outcome: PlannerPlanOutcome) => void> = [];
    const planRoute = vi.fn(
      () =>
        new Promise<PlannerPlanOutcome>((resolve) => resolvers.push(resolve)),
    );
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    controller.edit();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    expect(planRoute).toHaveBeenCalledTimes(2);
    resolvers[0]?.({
      state: "failure",
      kind: "error",
      message: "Old failure",
      retryable: true,
    });
    await microtask();
    expect(controller.getState().state).toBe("loading");
    resolvers[1]?.(success);
    await microtask();
    expect(controller.getState().state).toBe("result");
  });

  it("times out one attempt and binds a single retry to the newer attempt", async () => {
    vi.useFakeTimers();
    try {
      const resolvers: Array<(outcome: PlannerPlanOutcome) => void> = [];
      const planRoute = vi.fn(
        () =>
          new Promise<PlannerPlanOutcome>((resolve) => resolvers.push(resolve)),
      );
      const controller = createPlannerController({
        loadCatalog: async () => catalog,
        planRoute,
        timeoutMs: 15_000,
      });
      controller.open();
      await microtask();
      controller.setEndpoint("origin", origin);
      controller.setEndpoint("destination", destination);
      controller.setDepartAt(departAt);
      controller.plan();
      await microtask();
      vi.advanceTimersByTime(15_000);
      await microtask();
      expect(controller.getState()).toMatchObject({
        state: "error",
        retryAvailable: true,
      });
      controller.retry();
      controller.retry();
      expect(planRoute).toHaveBeenCalledTimes(2);
      resolvers[0]?.(success);
      await microtask();
      expect(controller.getState().state).toBe("loading");
      resolvers[1]?.(success);
      await microtask();
      expect(controller.getState().state).toBe("result");
      vi.runOnlyPendingTimers();
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows exactly one retry with unchanged input and resets deliberately", async () => {
    const failure: PlannerPlanOutcome = {
      state: "failure",
      kind: "error",
      message: "Layanan sedang tidak tersedia.",
      retryable: true,
    };
    const planRoute = vi
      .fn<(input: PlannerPlanInput) => Promise<PlannerPlanOutcome>>()
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(failure);
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    await microtask();
    expect(controller.getState().state).toBe("error");
    controller.retry();
    controller.retry();
    await microtask();
    expect(controller.getState().state).toBe("result");
    expect(planRoute).toHaveBeenCalledTimes(2);
    expect(planRoute.mock.calls[0]?.[0].departAt).toEqual(departAt);
    controller.reset();
    expect(controller.getState()).toMatchObject({
      state: "idle",
      origin: null,
      destination: null,
      route: null,
    });
  });

  it("keeps a route card when map fails and restores the previous view", async () => {
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute: async () => success,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    await microtask();
    controller.openDetail();
    controller.reportMapFailure();
    expect(controller.getState()).toMatchObject({
      state: "map-failure",
      mapReturnState: "detail",
      route: success,
    });
    controller.openDetail();
    expect(controller.getState().mapReturnState).toBe("detail");
    controller.closeDetail();
    expect(controller.getState()).toMatchObject({
      state: "map-failure",
      mapReturnState: "result",
      detailOpen: false,
    });
    controller.dismissMapFailure();
    expect(controller.getState().state).toBe("result");
  });

  it("accepts one map retry and ignores late events from the old map", async () => {
    const controller = createPlannerController({
      loadCatalog: async () => catalog,
      planRoute: async () => success,
    });
    controller.open();
    await microtask();
    controller.setEndpoint("origin", origin);
    controller.setEndpoint("destination", destination);
    controller.setDepartAt(departAt);
    controller.plan();
    await microtask();
    controller.reportMapFailure("Peta gagal", 0);
    expect(controller.getState().mapRetryAvailable).toBe(true);
    controller.retryMap();
    controller.reportMapFailure("Peta lama gagal", 0);
    expect(controller.getState().state).toBe("result");
    controller.reportMapFailure("Peta gagal lagi", 1);
    expect(controller.getState().mapRetryAvailable).toBe(false);
    controller.dismissMapFailure();
    expect(controller.getState().state).toBe("result");
  });

  it("preserves in-flight catalog operation when setDepartAt and setEndpoint are called before catalog finishes loading", async () => {
    let resolveCatalog!: (value: PlannerCatalog) => void;
    const catalogPromise = new Promise<PlannerCatalog>((resolve) => {
      resolveCatalog = resolve;
    });

    const controller = createPlannerController({
      loadCatalog: () => catalogPromise,
      planRoute: async () => success,
    });

    controller.open();
    expect(controller.getState().operation?.kind).toBe("catalog");

    // Call setDepartAt and setEndpoint immediately while catalog is still pending
    controller.setDepartAt(departAt);
    expect(controller.getState().operation?.kind).toBe("catalog");
    expect(controller.getState().departAt).toEqual(departAt);

    controller.setEndpoint("origin", origin);
    expect(controller.getState().operation?.kind).toBe("catalog");
    expect(controller.getState().origin).toEqual(origin);

    // Resolve catalog
    resolveCatalog(catalog);
    await microtask();

    expect(controller.getState()).toMatchObject({
      catalog,
      state: "select",
      origin,
      departAt,
      operation: null,
    });
  });
});
