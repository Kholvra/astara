import type {
  GtfsAgency,
  GtfsCalendar,
  GtfsFrequency,
  GtfsRoute,
  GtfsSnapshot,
  GtfsStop,
  GtfsStopTime,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";
import { parseGtfsTime } from "~/core/ingestion/gtfsTime";
import type { TransferEdge } from "~/core/transfer/transferTypes";
import {
  FIXED_SCORING_POLICY,
  type TripPlanningInput,
} from "~/core/timing/tripTiming";

const SNAPSHOT_ID = "snapshot-test";
const LINEAGE = {
  snapshotId: SNAPSHOT_ID,
  fileName: "fixture.txt",
  rowNumber: 1,
};

export function makePlanningInput(
  localDate: string,
  localTime: string,
): TripPlanningInput {
  return {
    originId: "origin",
    destinationId: "destination",
    departAt: {
      mode: "depart-at",
      localDate,
      localTime,
      timezone: "Asia/Jakarta",
    },
    scoringPolicy: FIXED_SCORING_POLICY,
  };
}

export function makeSnapshot(
  overrides: Partial<GtfsSnapshot> = {},
): GtfsSnapshot {
  const agency: GtfsAgency = {
    id: "agency-1",
    name: "TransJakarta",
    url: "https://example.test/transjakarta",
    timezone: "Asia/Jakarta",
    lineage: { ...LINEAGE, fileName: "agency.txt" },
  };
  const route: GtfsRoute = {
    id: "route-1",
    agencyId: agency.id,
    shortName: "1",
    longName: "Blok M – Kota",
    routeType: 3,
    lineage: { ...LINEAGE, fileName: "routes.txt" },
  };
  const stops: GtfsStop[] = [
    {
      id: "origin",
      name: "Origin",
      coordinate: [106.8, -6.2],
      lineage: { ...LINEAGE, fileName: "stops.txt", rowNumber: 2 },
    },
    {
      id: "destination",
      name: "Destination",
      coordinate: [106.81, -6.19],
      lineage: { ...LINEAGE, fileName: "stops.txt", rowNumber: 3 },
    },
  ];
  const trip: GtfsTrip = {
    id: "trip-1",
    routeId: route.id,
    serviceId: "service-1",
    headsign: "Destination",
    directionId: 0,
    shapeId: "shape-1",
    lineage: { ...LINEAGE, fileName: "trips.txt" },
  };
  const stopTimes: GtfsStopTime[] = [
    makeStopTime(trip.id, "origin", 1, "08:00:00", 2),
    makeStopTime(trip.id, "destination", 2, "08:20:00", 3),
  ];

  return {
    metadata: {
      snapshotId: SNAPSHOT_ID,
      sourceUrl: "https://example.test/gtfs.zip",
      acquiredAt: "2026-09-10T00:00:00.000Z",
      contentHash: "hash-test",
      feedVersion: "fixture-v1",
    },
    serviceDate: "2026-09-11",
    coverage: "complete",
    limitations: [],
    agencies: [agency],
    routes: [route],
    stops,
    trips: [trip],
    stopTimes,
    calendars: [makeCalendar("service-1")],
    calendarDates: [],
    frequencies: [],
    transfers: [],
    shapes: [
      {
        shapeId: "shape-1",
        coordinate: [106.8, -6.2],
        sequence: 1,
        lineage: { ...LINEAGE, fileName: "shapes.txt", rowNumber: 2 },
      },
      {
        shapeId: "shape-1",
        coordinate: [106.81, -6.19],
        sequence: 2,
        lineage: { ...LINEAGE, fileName: "shapes.txt", rowNumber: 3 },
      },
    ],
    fareAttributes: [],
    fareRules: [],
    ...overrides,
  };
}

export function makeSnapshotWithInactiveRequestedDate(): GtfsSnapshot {
  const snapshot = makeSnapshot();
  return {
    ...snapshot,
    calendarDates: [
      {
        serviceId: "service-1",
        date: "2026-09-11",
        exceptionType: 2,
        lineage: { ...LINEAGE, fileName: "calendar_dates.txt" },
      },
    ],
  };
}

export function makeIntervalSnapshot(): GtfsSnapshot {
  const snapshot = makeSnapshot();
  const frequency: GtfsFrequency = {
    tripId: "trip-1",
    startTime: parseGtfsTime("08:00:00"),
    endTime: parseGtfsTime("08:30:00"),
    headwaySeconds: 600,
    timingSemantics: "interval",
    lineage: { ...LINEAGE, fileName: "frequencies.txt" },
  };
  return { ...snapshot, frequencies: [frequency] };
}

export function makeTransferSnapshot(
  overrides: Partial<GtfsSnapshot> = {},
): GtfsSnapshot {
  const snapshot = makeSnapshot();
  const routeOne = snapshot.routes[0];
  const tripOne = snapshot.trips[0];
  if (!routeOne || !tripOne) {
    throw new Error("Transfer fixture requires a base route and trip");
  }

  const routeTwo: GtfsRoute = {
    ...routeOne,
    id: "route-2",
    shortName: "2",
    longName: "Feeder Two",
    lineage: { ...LINEAGE, fileName: "routes.txt", rowNumber: 3 },
  };
  const tripTwo: GtfsTrip = {
    ...tripOne,
    id: "trip-2",
    routeId: routeTwo.id,
    serviceId: "service-2",
    headsign: "Destination",
    shapeId: "shape-2",
    lineage: { ...LINEAGE, fileName: "trips.txt", rowNumber: 3 },
  };
  const transferStops: GtfsStop[] = [
    {
      id: "hub-a",
      name: "Hub A",
      coordinate: [106.805, -6.195],
      lineage: { ...LINEAGE, fileName: "stops.txt", rowNumber: 4 },
    },
    {
      id: "hub-b",
      name: "Hub B",
      coordinate: [106.806, -6.194],
      lineage: { ...LINEAGE, fileName: "stops.txt", rowNumber: 5 },
    },
  ];

  return {
    ...snapshot,
    routes: [routeOne, routeTwo],
    stops: [...snapshot.stops, ...transferStops],
    trips: [tripOne, tripTwo],
    stopTimes: [
      makeStopTime(tripOne.id, "origin", 1, "08:00:00", 2),
      makeStopTime(tripOne.id, "hub-a", 2, "08:10:00", 3),
      makeStopTime(tripTwo.id, "hub-b", 1, "08:20:00", 4),
      makeStopTime(tripTwo.id, "destination", 2, "08:40:00", 5),
    ],
    calendars: [makeCalendar("service-1"), makeCalendar("service-2")],
    shapes: [
      ...snapshot.shapes,
      {
        shapeId: "shape-2",
        coordinate: [106.806, -6.194],
        sequence: 1,
        lineage: { ...LINEAGE, fileName: "shapes.txt", rowNumber: 4 },
      },
      {
        shapeId: "shape-2",
        coordinate: [106.81, -6.19],
        sequence: 2,
        lineage: { ...LINEAGE, fileName: "shapes.txt", rowNumber: 5 },
      },
    ],
    ...overrides,
  };
}

export function makeTransferEdge(
  overrides: Partial<TransferEdge> = {},
): TransferEdge {
  return {
    edgeId: "edge-hub",
    from: { stopId: "hub-a", transitServiceId: "route-1" },
    to: { stopId: "hub-b", transitServiceId: "route-2" },
    evidenceSource: "explicit-gtfs-transfer",
    evidenceReferences: [
      {
        source: "explicit-gtfs-transfer",
        referenceId: "transfers.txt:2",
        evidenceDate: "2026-09-10T00:00:00.000Z",
      },
    ],
    evidenceState: "limited",
    connectionState: "routable",
    eligibleForRouting: true,
    barrierState: "unknown",
    walkingPath: {
      pathId: "path-hub",
      coordinates: [
        [106.805, -6.195],
        [106.806, -6.194],
      ],
      distanceMeters: 420,
      durationSeconds: 300,
    },
    costs: {
      walkingDistanceMeters: 420,
      walkingDurationSeconds: 300,
      safetyBufferSeconds: 30,
      transferDurationSeconds: 330,
      cognitiveDecisionCostSeconds: 45,
    },
    limitations: ["Walking path detail is limited or unavailable."],
    ...overrides,
  };
}

function makeCalendar(serviceId: string): GtfsCalendar {
  return {
    serviceId,
    weekdays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    lineage: { ...LINEAGE, fileName: "calendar.txt" },
  };
}

function makeStopTime(
  tripId: string,
  stopId: string,
  stopSequence: number,
  time: string,
  rowNumber: number,
): GtfsStopTime {
  const parsed = parseGtfsTime(time);
  return {
    tripId,
    stopId,
    stopSequence,
    arrivalTime: parsed,
    departureTime: parsed,
    lineage: { ...LINEAGE, fileName: "stop_times.txt", rowNumber },
  };
}
