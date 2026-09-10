import { describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({ db: {} }));

import { createCallerFactory } from "~/server/api/trpc";
import type { PlannerService } from "~/server/planner/plannerService";
import type { createGtfsSnapshotRepository } from "~/server/gtfs/gtfsSnapshotRepository";
import { createPlannerRouter } from "./planner";

const database = {} as Parameters<typeof createGtfsSnapshotRepository>[0];

const validInput = {
  originId: "origin",
  destinationId: "destination",
  departAt: {
    mode: "depart-at" as const,
    localDate: "2026-09-11",
    localTime: "08:00",
    timezone: "Asia/Jakarta",
  },
  snapshotId: "snapshot-1",
  configurationHash: "planner-config-v1:test",
};

function createCaller(service: PlannerService) {
  const router = createPlannerRouter(() => service);
  return createCallerFactory(router)({ db: database, headers: new Headers() });
}

describe("planner tRPC contract", () => {
  it("validates route input before invoking the read-only service", async () => {
    const planRoute = vi.fn<PlannerService["planRoute"]>(async () => ({
      state: "failure",
      kind: "no-route",
      message: "Tidak ada rute yang cocok.",
      retryable: false,
    }));
    const caller = createCaller({
      getCatalog: async () => ({
        state: "failure",
        kind: "stale-data",
        message: "Data transit belum siap.",
        retryable: true,
      }),
      planRoute,
    });

    await expect(
      caller.route({
        ...validInput,
        originId: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(planRoute).not.toHaveBeenCalled();

    await expect(
      caller.route({
        ...validInput,
        departAt: { ...validInput.departAt, localTime: "25:00" },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(planRoute).not.toHaveBeenCalled();

    await expect(
      caller.route({
        ...validInput,
        departAt: { ...validInput.departAt, localDate: "2026-02-30" },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(planRoute).not.toHaveBeenCalled();

    const result = await caller.route(validInput);
    expect(result).toMatchObject({ state: "failure", kind: "no-route" });
    expect(planRoute).toHaveBeenCalledOnce();
    expect(planRoute).toHaveBeenCalledWith(validInput);
  });

  it("turns unexpected catalog errors into a safe actionable response", async () => {
    const caller = createCaller({
      getCatalog: vi.fn(async () => {
        throw new Error("database details");
      }),
      planRoute: vi.fn(async () => ({
        state: "failure" as const,
        kind: "error" as const,
        message: "Tidak dipakai.",
        retryable: true,
      })),
    });

    await expect(caller.catalog()).resolves.toEqual({
      state: "failure",
      kind: "error",
      message: "Data transit sedang tidak tersedia. Coba lagi.",
      retryable: true,
    });
  });
});
