import { describe, expect, it } from "vitest";

import {
  MVP_PROFILE_VERSION,
  createMvpSnapshot,
  isMvpRouteId,
} from "./gtfsMvpProfile.mjs";

const lineage = (fileName: string, rowNumber: number) => ({
  snapshotId: "source-snapshot",
  fileName,
  rowNumber,
});

const sourceSnapshot = {
  metadata: {
    snapshotId: "source-snapshot",
    sourceUrl: "https://example.test/gtfs.zip",
    acquiredAt: "2026-09-10T00:00:00.000Z",
    contentHash: "a".repeat(64),
  },
  serviceDate: "2026-09-11",
  coverage: "limited" as const,
  limitations: ["Source limitation."],
  agencies: [
    {
      id: "tj",
      name: "TransJakarta",
      url: "https://example.test",
      timezone: "Asia/Jakarta",
      lineage: lineage("agency.txt", 2),
    },
  ],
  routes: [
    {
      id: "1",
      agencyId: "tj",
      shortName: "1",
      longName: "BRT",
      routeType: 3,
      lineage: lineage("routes.txt", 2),
    },
    {
      id: "14",
      agencyId: "tj",
      shortName: "14",
      longName: "BRT 14",
      routeType: 3,
      lineage: lineage("routes.txt", 3),
    },
    {
      id: "2F",
      agencyId: "tj",
      shortName: "2F",
      longName: "Regular",
      routeType: 3,
      lineage: lineage("routes.txt", 4),
    },
    {
      id: "JAK.08",
      agencyId: "tj",
      shortName: "JAK.08",
      longName: "Mikrotrans",
      routeType: 3,
      lineage: lineage("routes.txt", 5),
    },
    {
      id: "B11",
      agencyId: "tj",
      shortName: "B11",
      longName: "Regional",
      routeType: 3,
      lineage: lineage("routes.txt", 6),
    },
  ],
  stops: [
    {
      id: "parent",
      name: "Parent",
      coordinate: [106.8, -6.2] as [number, number],
      locationType: 1,
      lineage: lineage("stops.txt", 2),
    },
    {
      id: "kept",
      name: "Kept",
      coordinate: [106.81, -6.2] as [number, number],
      parentStationId: "parent",
      lineage: lineage("stops.txt", 3),
    },
    {
      id: "excluded",
      name: "Excluded",
      coordinate: [106.82, -6.2] as [number, number],
      lineage: lineage("stops.txt", 4),
    },
    {
      id: "destination",
      name: "Destination",
      coordinate: [106.83, -6.2] as [number, number],
      lineage: lineage("stops.txt", 5),
    },
  ],
  trips: [
    {
      id: "trip-kept",
      routeId: "1",
      serviceId: "service-kept",
      shapeId: "shape-kept",
      lineage: lineage("trips.txt", 2),
    },
    {
      id: "trip-regular",
      routeId: "2F",
      serviceId: "service-regular",
      shapeId: "shape-regular",
      lineage: lineage("trips.txt", 3),
    },
    {
      id: "trip-jak",
      routeId: "JAK.08",
      serviceId: "service-jak",
      shapeId: "shape-jak",
      lineage: lineage("trips.txt", 4),
    },
  ],
  stopTimes: [
    {
      tripId: "trip-kept",
      stopId: "kept",
      stopSequence: 1,
      arrivalTime: { raw: "08:00:00", secondsSinceServiceDayStart: 28800 },
      departureTime: { raw: "08:00:00", secondsSinceServiceDayStart: 28800 },
      lineage: lineage("stop_times.txt", 2),
    },
    {
      tripId: "trip-kept",
      stopId: "destination",
      stopSequence: 2,
      arrivalTime: { raw: "08:20:00", secondsSinceServiceDayStart: 30000 },
      departureTime: { raw: "08:20:00", secondsSinceServiceDayStart: 30000 },
      lineage: lineage("stop_times.txt", 3),
    },
    {
      tripId: "trip-regular",
      stopId: "kept",
      stopSequence: 1,
      arrivalTime: { raw: "08:10:00", secondsSinceServiceDayStart: 29400 },
      departureTime: { raw: "08:10:00", secondsSinceServiceDayStart: 29400 },
      lineage: lineage("stop_times.txt", 4),
    },
    {
      tripId: "trip-regular",
      stopId: "destination",
      stopSequence: 2,
      arrivalTime: { raw: "08:30:00", secondsSinceServiceDayStart: 30600 },
      departureTime: { raw: "08:30:00", secondsSinceServiceDayStart: 30600 },
      lineage: lineage("stop_times.txt", 5),
    },
    {
      tripId: "trip-jak",
      stopId: "excluded",
      stopSequence: 1,
      arrivalTime: { raw: "08:20:00", secondsSinceServiceDayStart: 30000 },
      departureTime: { raw: "08:20:00", secondsSinceServiceDayStart: 30000 },
      lineage: lineage("stop_times.txt", 6),
    },
  ],
  calendars: [
    {
      serviceId: "service-kept",
      weekdays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
      startDate: "20260101",
      endDate: "20261231",
      lineage: lineage("calendar.txt", 2),
    },
    {
      serviceId: "service-jak",
      weekdays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
      startDate: "20260101",
      endDate: "20261231",
      lineage: lineage("calendar.txt", 3),
    },
    {
      serviceId: "service-regular",
      weekdays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
      startDate: "20260101",
      endDate: "20261231",
      lineage: lineage("calendar.txt", 4),
    },
  ],
  calendarDates: [],
  frequencies: [
    {
      tripId: "trip-kept",
      startTime: { raw: "08:00:00", secondsSinceServiceDayStart: 28800 },
      endTime: { raw: "09:00:00", secondsSinceServiceDayStart: 32400 },
      headwaySeconds: 600,
      timingSemantics: "interval" as const,
      lineage: lineage("frequencies.txt", 2),
    },
    {
      tripId: "trip-jak",
      startTime: { raw: "08:00:00", secondsSinceServiceDayStart: 28800 },
      endTime: { raw: "09:00:00", secondsSinceServiceDayStart: 32400 },
      headwaySeconds: 600,
      timingSemantics: "interval" as const,
      lineage: lineage("frequencies.txt", 3),
    },
  ],
  transfers: [
    {
      fromStopId: "parent",
      toStopId: "kept",
      transferType: 2,
      lineage: lineage("transfers.txt", 2),
    },
    {
      fromStopId: "excluded",
      toStopId: "kept",
      transferType: 2,
      lineage: lineage("transfers.txt", 3),
    },
  ],
  shapes: [
    {
      shapeId: "shape-kept",
      coordinate: [106.8, -6.2] as [number, number],
      sequence: 1,
      lineage: lineage("shapes.txt", 2),
    },
    {
      shapeId: "shape-jak",
      coordinate: [106.82, -6.2] as [number, number],
      sequence: 1,
      lineage: lineage("shapes.txt", 3),
    },
    {
      shapeId: "shape-regular",
      coordinate: [106.83, -6.2] as [number, number],
      sequence: 1,
      lineage: lineage("shapes.txt", 4),
    },
  ],
  fareAttributes: [],
  fareRules: [],
};

describe("MVP GTFS profile", () => {
  it("keeps BRT and regular route IDs while excluding Mikrotrans and other prefixes", () => {
    expect(isMvpRouteId("1")).toBe(true);
    expect(isMvpRouteId("14")).toBe(true);
    expect(isMvpRouteId("2F")).toBe(true);
    expect(isMvpRouteId("JAK.08")).toBe(false);
    expect(isMvpRouteId("B11")).toBe(false);
    expect(isMvpRouteId("L13E")).toBe(false);
  });

  it("filters the relational snapshot and rebases lineage to the MVP snapshot", () => {
    const result = createMvpSnapshot(sourceSnapshot);

    expect(result.metadata.snapshotId).toBe(
      `${MVP_PROFILE_VERSION}-${sourceSnapshot.metadata.snapshotId}`,
    );
    expect(result.routes.map((route) => route.id)).toEqual(["1", "14", "2F"]);
    expect(result.trips.map((trip) => trip.id)).toEqual([
      "trip-kept",
      "trip-regular",
    ]);
    expect(result.stopTimes.map((stopTime) => stopTime.tripId)).toEqual([
      "trip-kept",
      "trip-kept",
      "trip-regular",
      "trip-regular",
    ]);
    expect(result.frequencies.map((frequency) => frequency.tripId)).toEqual([
      "trip-kept",
    ]);
    expect(result.shapes.map((shape) => shape.shapeId)).toEqual([
      "shape-kept",
      "shape-regular",
    ]);
    expect(result.calendars.map((calendar) => calendar.serviceId)).toEqual([
      "service-kept",
      "service-regular",
    ]);
    expect(result.transfers.map((transfer) => transfer.fromStopId)).toEqual([
      "parent",
    ]);
    expect(result.stops.map((stop) => stop.id).sort()).toEqual([
      "destination",
      "kept",
      "parent",
    ]);
    expect(result.limitations).toContain(
      "MVP profile excludes Mikrotrans and regional/tourism services.",
    );
    expect(result.routes[0]?.lineage.snapshotId).toBe(
      result.metadata.snapshotId,
    );
    expect(result.stopTimes[0]?.lineage.snapshotId).toBe(
      result.metadata.snapshotId,
    );
    expect(sourceSnapshot.routes).toHaveLength(5);
    expect(sourceSnapshot.metadata.snapshotId).toBe("source-snapshot");
  });

  it("fails closed for unsafe route IDs and malformed retained relations", () => {
    expect(isMvpRouteId(null as unknown as string)).toBe(false);
    expect(isMvpRouteId(14 as unknown as string)).toBe(false);

    const malformed = {
      ...sourceSnapshot,
      trips: [
        {
          ...sourceSnapshot.trips[0]!,
          id: "trip-without-stops",
        },
      ],
      stopTimes: [],
    };

    expect(() => createMvpSnapshot(malformed)).toThrow(
      "retains no usable stop times",
    );
  });

  it("fails closed when a retained stop has no parent record", () => {
    const malformed = {
      ...sourceSnapshot,
      stops: sourceSnapshot.stops.map((stop) =>
        stop.id === "kept"
          ? { ...stop, parentStationId: "missing-parent" }
          : stop,
      ),
    };

    expect(() => createMvpSnapshot(malformed)).toThrow(
      "parent station missing-parent is missing",
    );
  });
});
