import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";
import type { GtfsFrequency } from "~/core/ingestion/gtfsTypes";

import { selectPrimaryRoute } from "./routeEngine";
import {
  makePlanningInput,
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";

describe("RAPTOR journey materialization", () => {
  it("keeps origin access separate from in-network transfers", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge({
          edgeId: "edge-access",
          from: { stopId: "origin" },
          to: { stopId: "hub-b", transitServiceId: "route-2" },
        }),
      ],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "walking",
      "transit",
    ]);
    expect(result.primary.legs[0]).toMatchObject({
      kind: "walking",
      edgeId: "edge-access",
      fromStopId: "origin",
      toStopId: "hub-b",
    });
    expect(result.primary.transferCount).toBe(0);
  });

  it("keeps a final transfer-to-destination after the last ride", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge({
          edgeId: "edge-final",
          to: { stopId: "destination" },
        }),
      ],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "walking",
    ]);
    expect(result.primary.legs[1]).toMatchObject({
      kind: "walking",
      edgeId: "edge-final",
      fromStopId: "hub-a",
      toStopId: "destination",
    });
    expect(result.primary.transferCount).toBe(1);
  });

  it("rejects a transfer that arrives after the next service departs", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge({
          costs: {
            walkingDistanceMeters: 420,
            walkingDurationSeconds: 700,
            safetyBufferSeconds: 30,
            transferDurationSeconds: 700,
            cognitiveDecisionCostSeconds: 45,
          },
        }),
      ],
    });

    expect(result).toMatchObject({
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
    });
  });

  it("terminates cyclic transfer evidence without repeating trips or edges", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge(),
        makeTransferEdge({
          edgeId: "edge-cycle",
          from: { stopId: "hub-b", transitServiceId: "route-2" },
          to: { stopId: "hub-a", transitServiceId: "route-1" },
        }),
      ],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    const transitTripIds = result.primary.legs
      .filter((leg) => leg.kind === "transit")
      .map((leg) => leg.tripId);
    const walkingEdgeIds = result.primary.legs
      .filter((leg) => leg.kind === "walking")
      .map((leg) => leg.edgeId);
    expect(transitTripIds).toEqual(["trip-1", "trip-2"]);
    expect(new Set(transitTripIds).size).toBe(transitTripIds.length);
    expect(new Set(walkingEdgeIds).size).toBe(walkingEdgeIds.length);
  });

  it("preserves interval-to-exact timing across a catchable transfer", () => {
    const snapshot = makeTransferSnapshot();
    const intervalFrequency: GtfsFrequency = {
      tripId: "trip-1",
      startTime: parseGtfsTime("08:00:00"),
      endTime: parseGtfsTime("08:10:00"),
      headwaySeconds: 600,
      timingSemantics: "interval",
      lineage: {
        snapshotId: "snapshot-test",
        fileName: "frequencies.txt",
        rowNumber: 2,
      },
    };
    const mixedSnapshot = {
      ...snapshot,
      frequencies: [intervalFrequency],
      stopTimes: snapshot.stopTimes.map((stopTime) => {
        if (stopTime.tripId !== "trip-2") {
          return stopTime;
        }
        const raw = stopTime.stopId === "hub-b" ? "08:30:00" : "08:50:00";
        const parsed = parseGtfsTime(raw);
        return { ...stopTime, arrivalTime: parsed, departureTime: parsed };
      }),
    };

    const result = selectPrimaryRoute({
      snapshot: mixedSnapshot,
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.legs[0]).toMatchObject({
      kind: "transit",
      timing: {
        semantics: "interval",
        headwaySeconds: 600,
      },
    });
    expect(result.primary.legs[0]).not.toHaveProperty("timing.departure");
    expect(result.primary.legs[2]).toMatchObject({
      kind: "transit",
      tripId: "trip-2",
      timing: {
        semantics: "exact",
        departure: { raw: "08:30:00" },
        arrival: { raw: "08:50:00" },
      },
    });
  });
});
