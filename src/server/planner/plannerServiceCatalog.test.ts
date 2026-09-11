import { describe, expect, it } from "vitest";

import type {
  GtfsConsumerStatus,
  GtfsRoute,
  GtfsSnapshot,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";
import { makeSnapshot } from "~/core/routing/routeEngineTestFixtures";

import { createStopCatalog } from "./plannerServiceSupport";

const status: GtfsConsumerStatus = {
  networkAvailability: "available",
  freshness: "current",
  coverage: "complete",
  evidenceState: "Terverifikasi",
  connectionState: "routable",
  timingSemantics: "exact",
  geometryState: "supported",
  limitations: [],
};

describe("createStopCatalog", () => {
  it("groups explicit station platforms and keeps unparented stops distinct", () => {
    const snapshot = makeStationCatalogSnapshot();

    const catalog = createStopCatalog(snapshot, status);

    expect(catalog.map((item) => item.id)).toEqual([
      "origin",
      "destination",
      "station-cawang",
      "standalone-cawang",
    ]);
    expect(catalog).toContainEqual(
      expect.objectContaining({
        id: "station-cawang",
        title: "Cawang Sentral",
        routes: ["1", "2"],
        subtitle: "2 halte · 1 · 2",
      }),
    );
    expect(catalog).toContainEqual(
      expect.objectContaining({
        id: "standalone-cawang",
        title: "Cawang Sentral 1",
        routes: ["1"],
        subtitle: "1",
      }),
    );
  });
});

function makeStationCatalogSnapshot(): GtfsSnapshot {
  const base = makeSnapshot();
  const baseRoute = base.routes[0];
  const baseTrip = base.trips[0];
  if (!baseRoute || !baseTrip) {
    throw new Error("Catalog fixture requires base route and trip");
  }

  const routeTwo: GtfsRoute = {
    ...baseRoute,
    id: "route-2",
    shortName: "2",
    longName: "Route Two",
  };
  const tripTwo: GtfsTrip = {
    ...baseTrip,
    id: "trip-2",
    routeId: routeTwo.id,
  };
  const lineage = base.stops[0]?.lineage;
  const firstStopTime = base.stopTimes[0];
  if (!lineage || !firstStopTime) {
    throw new Error("Catalog fixture requires base stop time");
  }

  return {
    ...base,
    routes: [...base.routes, routeTwo],
    trips: [...base.trips, tripTwo],
    stops: [
      ...base.stops,
      {
        id: "station-cawang",
        name: "Cawang Sentral",
        coordinate: [106.8736, -6.2503],
        locationType: 1,
        lineage: { ...lineage, rowNumber: 10 },
      },
      {
        id: "platform-cawang-a",
        name: "Cawang Sentral",
        coordinate: [106.8737, -6.2502],
        locationType: 0,
        parentStationId: "station-cawang",
        lineage: { ...lineage, rowNumber: 11 },
      },
      {
        id: "platform-cawang-b",
        name: "Cawang Sentral",
        coordinate: [106.8735, -6.2504],
        locationType: 0,
        parentStationId: "station-cawang",
        lineage: { ...lineage, rowNumber: 12 },
      },
      {
        id: "standalone-cawang",
        name: "Cawang Sentral 1",
        coordinate: [106.8738, -6.2506],
        locationType: 0,
        lineage: { ...lineage, rowNumber: 13 },
      },
    ],
    stopTimes: [
      ...base.stopTimes,
      {
        ...firstStopTime,
        stopId: "platform-cawang-a",
        stopSequence: 3,
        lineage: { ...lineage, fileName: "stop_times.txt", rowNumber: 10 },
      },
      {
        ...firstStopTime,
        tripId: tripTwo.id,
        stopId: "platform-cawang-b",
        stopSequence: 1,
        lineage: { ...lineage, fileName: "stop_times.txt", rowNumber: 11 },
      },
      {
        ...firstStopTime,
        stopId: "standalone-cawang",
        stopSequence: 4,
        lineage: { ...lineage, fileName: "stop_times.txt", rowNumber: 12 },
      },
    ],
  };
}
