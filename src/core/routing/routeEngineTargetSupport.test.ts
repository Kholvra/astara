import { describe, expect, it } from "vitest";

import { createRouteEngineIndex } from "./routeEngineSupport";
import {
  createRouteLineage,
  normalizeRouteEngineConfig,
} from "./routeEngineSupport";
import type { SearchContext } from "./routeEngineInternalTypes";
import {
  createDestinationAccessStopIds,
  createRideTargetStopIds,
} from "./routeEngineTargetSupport";
import {
  makePlanningInput,
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";
import { createTransferEdgeIndex } from "./routeEngineSearchSupport";

describe("route-target search support", () => {
  it("only marks transfer stops reachable from the route being scanned", () => {
    const snapshot = makeTransferSnapshot();
    const configResult = normalizeRouteEngineConfig({ maxTransfers: 3 });
    if (configResult.state === "invalid") {
      throw new Error("Route-target fixture requires a valid config");
    }
    const transferEdges = [
      makeTransferEdge(),
      makeTransferEdge({
        edgeId: "edge-irrelevant",
        from: { stopId: "hub-b", transitServiceId: "route-2" },
        to: { stopId: "hub-a", transitServiceId: "route-1" },
      }),
    ];
    const context: SearchContext = {
      request: {
        snapshot,
        planning: makePlanningInput("2026-09-11", "08:00"),
        transferEdges,
      },
      snapshot,
      index: createRouteEngineIndex(snapshot),
      config: configResult.config,
      lineage: createRouteLineage(snapshot, configResult.config),
      requestedSeconds: 8 * 60 * 60,
      nowMs: () => 0,
      activeServiceIdsByDate: new Map(),
      transferEdgesByFromStop: createTransferEdgeIndex(transferEdges),
      routeTransferDistanceToDestination: new Map([
        ["route-1", 1],
        ["route-2", 0],
      ]),
      destinationAccessStopIds: new Set(["destination"]),
    };

    const targets = createRideTargetStopIds(context, "route-1", 0);

    expect(targets).toEqual(new Set(["destination", "hub-a"]));
  });

  it("includes the last child stop when the selected destination is a parent station", () => {
    const finalEdge = makeTransferEdge({
      edgeId: "edge-final-parent",
      from: { stopId: "destination-platform" },
      to: { stopId: "destination-station" },
    });

    expect(
      createDestinationAccessStopIds([finalEdge], "destination-station"),
    ).toEqual(new Set(["destination-station", "destination-platform"]));
  });
});
