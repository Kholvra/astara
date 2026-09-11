import { describe, expect, it } from "vitest";

import { createRouteTransferDistanceIndex } from "./routeEngineSearchSupport";
import { createRouteEngineIndex } from "./routeEngineSupport";
import {
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";

describe("route-target search support", () => {
  it("calculates a conservative reverse transfer distance to destination routes", () => {
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
    const hubC = {
      ...base.stops[base.stops.length - 1]!,
      id: "hub-c",
      name: "Hub C",
      coordinate: [106.807, -6.193] as [number, number],
      lineage: { ...base.stops[base.stops.length - 1]!.lineage, rowNumber: 6 },
    };
    const remoteDestination = {
      ...base.stops[1]!,
      id: "remote-destination",
      name: "Remote Destination",
      lineage: { ...base.stops[1]!.lineage, rowNumber: 7 },
    };
    const snapshot = {
      ...base,
      routes: [...base.routes, routeThree],
      trips: [...base.trips, tripThree],
      stops: [...base.stops, hubC, remoteDestination],
      stopTimes: [
        ...base.stopTimes,
        {
          ...base.stopTimes[2]!,
          tripId: tripThree.id,
          stopId: hubC.id,
          stopSequence: 1,
          lineage: { ...base.stopTimes[2]!.lineage, rowNumber: 6 },
        },
        {
          ...base.stopTimes[3]!,
          tripId: tripThree.id,
          stopId: remoteDestination.id,
          stopSequence: 2,
          lineage: { ...base.stopTimes[3]!.lineage, rowNumber: 7 },
        },
      ],
      calendars: [
        ...base.calendars,
        { ...base.calendars[1]!, serviceId: tripThree.serviceId },
      ],
    };
    const index = createRouteEngineIndex(snapshot);
    const result = createRouteTransferDistanceIndex(
      index,
      [
        makeTransferEdge(),
        makeTransferEdge({
          edgeId: "edge-route-2-to-3",
          from: { stopId: "hub-b", transitServiceId: "route-2" },
          to: { stopId: hubC.id, transitServiceId: routeThree.id },
        }),
      ],
      remoteDestination.id,
      { supportedRouteTypes: [3] },
    );

    expect(result.get(routeThree.id)).toBe(0);
    expect(result.get("route-2")).toBe(1);
    expect(result.get("route-1")).toBe(2);
  });
});
