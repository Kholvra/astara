import { describe, expect, it } from "vitest";

import { selectPrimaryRoute } from "./routeEngine";
import {
  makePlanningInput,
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";

describe("RAPTOR route-target pruning", () => {
  it("prunes a branch that cannot reach the destination within the transfer budget", () => {
    const base = makeTransferSnapshot();
    const routeThree = {
      ...base.routes[1]!,
      id: "route-3",
      shortName: "3",
      lineage: { ...base.routes[1]!.lineage, rowNumber: 4 },
    };
    const branchStop = {
      ...base.stops[base.stops.length - 1]!,
      id: "hub-c",
      name: "Hub C",
      coordinate: [106.807, -6.193] as [number, number],
      lineage: { ...base.stops[base.stops.length - 1]!.lineage, rowNumber: 6 },
    };
    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        routes: [...base.routes, routeThree],
        stops: [...base.stops, branchStop],
      },
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge(),
        makeTransferEdge({
          edgeId: "edge-z",
          to: { stopId: branchStop.id, transitServiceId: routeThree.id },
        }),
      ],
      config: { maxTransfers: 1, maxSearchStates: 2 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.routeId).toContain("route-2");
  });
});
