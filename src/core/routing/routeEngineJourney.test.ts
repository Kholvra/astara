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

  it("does not scan another transit round after terminal parent-station access", () => {
    const base = makeTransferSnapshot();
    const routeThree = {
      ...base.routes[1]!,
      id: "route-3",
      shortName: "3",
      lineage: { ...base.routes[1]!.lineage, rowNumber: 4 },
    };
    const tripThree = {
      ...base.trips[1]!,
      id: "trip-3",
      routeId: routeThree.id,
      serviceId: "service-3",
      shapeId: "shape-3",
      lineage: { ...base.trips[1]!.lineage, rowNumber: 4 },
    };
    const branchStop = {
      ...base.stops[0]!,
      id: "hub-c",
      name: "Hub C",
      coordinate: [106.807, -6.193] as [number, number],
      lineage: { ...base.stops[0]!.lineage, rowNumber: 6 },
    };
    const branchDestination = {
      ...base.stops[1]!,
      id: "hub-d",
      name: "Hub D",
      coordinate: [106.808, -6.192] as [number, number],
      lineage: { ...base.stops[1]!.lineage, rowNumber: 7 },
    };
    const branchStopTimes = [
      {
        ...base.stopTimes[2]!,
        tripId: tripThree.id,
        stopId: branchStop.id,
        stopSequence: 1,
        arrivalTime: parseGtfsTime("08:50:00"),
        departureTime: parseGtfsTime("08:50:00"),
        lineage: { ...base.stopTimes[2]!.lineage, rowNumber: 6 },
      },
      {
        ...base.stopTimes[3]!,
        tripId: tripThree.id,
        stopId: branchDestination.id,
        stopSequence: 2,
        arrivalTime: parseGtfsTime("09:10:00"),
        departureTime: parseGtfsTime("09:10:00"),
        lineage: { ...base.stopTimes[3]!.lineage, rowNumber: 7 },
      },
    ];
    const parentDestination = {
      ...base.stops[1]!,
      id: "destination-station",
      name: "Destination Station",
      locationType: 1,
      coordinate: [106.81, -6.19] as [number, number],
      lineage: { ...base.stops[1]!.lineage, rowNumber: 8 },
    };
    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        routes: [...base.routes, routeThree],
        stops: [
          ...base.stops,
          branchStop,
          branchDestination,
          parentDestination,
        ],
        trips: [...base.trips, tripThree],
        stopTimes: [...base.stopTimes, ...branchStopTimes],
        calendars: [
          ...base.calendars,
          {
            ...base.calendars[1]!,
            serviceId: tripThree.serviceId,
            lineage: { ...base.calendars[1]!.lineage, rowNumber: 4 },
          },
        ],
      },
      planning: {
        ...makePlanningInput("2026-09-11", "08:00"),
        destinationId: parentDestination.id,
      },
      transferEdges: [
        makeTransferEdge(),
        makeTransferEdge({
          edgeId: "edge-final-parent",
          from: { stopId: "destination" },
          to: { stopId: parentDestination.id },
        }),
        makeTransferEdge({
          edgeId: "edge-branch-after-destination",
          from: { stopId: "destination", transitServiceId: "route-2" },
          to: { stopId: branchStop.id, transitServiceId: routeThree.id },
        }),
      ],
      config: { maxSearchStates: 2 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "walking",
      "transit",
      "walking",
    ]);
    expect(result.primary.destinationStopId).toBe(parentDestination.id);
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
