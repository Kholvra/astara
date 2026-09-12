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

const APPROVED_TJBB_ROUTE_IDS = [
  "B11",
  "B21",
  "B25",
  "B41",
  "B51",
  "D11",
  "D21",
  "D41",
  "P11",
  "S11",
  "S21",
  "S22",
  "S61",
  "SH1",
  "SH2",
  "T11",
  "T12",
  "T31",
] as const;

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
    {
      id: "BW1",
      agencyId: "tj",
      shortName: "BW1",
      longName: "Bus Wisata",
      routeType: 3,
      lineage: lineage("routes.txt", 7),
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
    {
      id: "trip-tjbb",
      routeId: "B11",
      serviceId: "service-tjbb",
      shapeId: "shape-tjbb",
      lineage: lineage("trips.txt", 5),
    },
    {
      id: "trip-bw",
      routeId: "BW1",
      serviceId: "service-bw",
      shapeId: "shape-bw",
      lineage: lineage("trips.txt", 6),
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
    {
      tripId: "trip-tjbb",
      stopId: "kept",
      stopSequence: 1,
      arrivalTime: { raw: "08:30:00", secondsSinceServiceDayStart: 30600 },
      departureTime: { raw: "08:30:00", secondsSinceServiceDayStart: 30600 },
      lineage: lineage("stop_times.txt", 7),
    },
    {
      tripId: "trip-tjbb",
      stopId: "destination",
      stopSequence: 2,
      arrivalTime: { raw: "08:50:00", secondsSinceServiceDayStart: 31800 },
      departureTime: { raw: "08:50:00", secondsSinceServiceDayStart: 31800 },
      lineage: lineage("stop_times.txt", 8),
    },
    {
      tripId: "trip-bw",
      stopId: "excluded",
      stopSequence: 1,
      arrivalTime: { raw: "09:00:00", secondsSinceServiceDayStart: 32400 },
      departureTime: { raw: "09:00:00", secondsSinceServiceDayStart: 32400 },
      lineage: lineage("stop_times.txt", 9),
    },
    {
      tripId: "trip-bw",
      stopId: "destination",
      stopSequence: 2,
      arrivalTime: { raw: "09:20:00", secondsSinceServiceDayStart: 33600 },
      departureTime: { raw: "09:20:00", secondsSinceServiceDayStart: 33600 },
      lineage: lineage("stop_times.txt", 10),
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
    {
      serviceId: "service-tjbb",
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
      lineage: lineage("calendar.txt", 5),
    },
    {
      serviceId: "service-bw",
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
      lineage: lineage("calendar.txt", 6),
    },
  ],
  calendarDates: [
    {
      serviceId: "service-tjbb",
      date: "20260911",
      exceptionType: 1 as const,
      lineage: lineage("calendar_dates.txt", 2),
    },
    {
      serviceId: "service-jak",
      date: "20260911",
      exceptionType: 1 as const,
      lineage: lineage("calendar_dates.txt", 3),
    },
    {
      serviceId: "service-bw",
      date: "20260911",
      exceptionType: 1 as const,
      lineage: lineage("calendar_dates.txt", 4),
    },
  ],
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
    {
      tripId: "trip-tjbb",
      startTime: { raw: "08:30:00", secondsSinceServiceDayStart: 30600 },
      endTime: { raw: "09:30:00", secondsSinceServiceDayStart: 34200 },
      headwaySeconds: 900,
      timingSemantics: "interval" as const,
      lineage: lineage("frequencies.txt", 4),
    },
    {
      tripId: "trip-bw",
      startTime: { raw: "09:00:00", secondsSinceServiceDayStart: 32400 },
      endTime: { raw: "10:00:00", secondsSinceServiceDayStart: 36000 },
      headwaySeconds: 1800,
      timingSemantics: "interval" as const,
      lineage: lineage("frequencies.txt", 5),
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
    {
      fromStopId: "kept",
      toStopId: "destination",
      transferType: 2,
      lineage: lineage("transfers.txt", 4),
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
    {
      shapeId: "shape-tjbb",
      coordinate: [106.84, -6.2] as [number, number],
      sequence: 1,
      lineage: lineage("shapes.txt", 5),
    },
    {
      shapeId: "shape-bw",
      coordinate: [106.85, -6.2] as [number, number],
      sequence: 1,
      lineage: lineage("shapes.txt", 6),
    },
  ],
  fareAttributes: [
    {
      fareId: "fare-tjbb",
      price: 3500,
      currencyType: "IDR",
      paymentMethod: 0,
      transfers: 0,
      agencyId: "tj",
      lineage: lineage("fare_attributes.txt", 2),
    },
    {
      fareId: "fare-jak",
      price: 0,
      currencyType: "IDR",
      paymentMethod: 0,
      transfers: 0,
      agencyId: "tj",
      lineage: lineage("fare_attributes.txt", 3),
    },
    {
      fareId: "fare-bw",
      price: 5000,
      currencyType: "IDR",
      paymentMethod: 0,
      transfers: 0,
      agencyId: "tj",
      lineage: lineage("fare_attributes.txt", 4),
    },
  ],
  fareRules: [
    {
      fareId: "fare-tjbb",
      routeId: "B11",
      lineage: lineage("fare_rules.txt", 2),
    },
    {
      fareId: "fare-jak",
      routeId: "JAK.08",
      lineage: lineage("fare_rules.txt", 3),
    },
    {
      fareId: "fare-bw",
      routeId: "BW1",
      lineage: lineage("fare_rules.txt", 4),
    },
  ],
};

describe("MVP GTFS profile", () => {
  it("keeps the exact TJBB allowlist while excluding Mikrotrans and Bus Wisata", () => {
    expect(
      APPROVED_TJBB_ROUTE_IDS.map((routeId) => isMvpRouteId(routeId)),
    ).toEqual(APPROVED_TJBB_ROUTE_IDS.map(() => true));
    expect(isMvpRouteId("1")).toBe(true);
    expect(isMvpRouteId("14")).toBe(true);
    expect(isMvpRouteId("2F")).toBe(true);
    expect(isMvpRouteId("JAK.08")).toBe(false);
    expect(isMvpRouteId("BW1")).toBe(false);
    expect(isMvpRouteId("L13E")).toBe(false);
  });

  it("filters the relational snapshot and rebases lineage to the MVP snapshot", () => {
    const result = createMvpSnapshot(sourceSnapshot);

    expect(result.metadata.snapshotId).toBe(
      `${MVP_PROFILE_VERSION}-${sourceSnapshot.metadata.snapshotId}`,
    );
    expect(result.routes.map((route) => route.id)).toEqual([
      "1",
      "14",
      "2F",
      "B11",
    ]);
    expect(result.trips.map((trip) => trip.id)).toEqual([
      "trip-kept",
      "trip-regular",
      "trip-tjbb",
    ]);
    expect(result.stopTimes.map((stopTime) => stopTime.tripId)).toEqual([
      "trip-kept",
      "trip-kept",
      "trip-regular",
      "trip-regular",
      "trip-tjbb",
      "trip-tjbb",
    ]);
    expect(result.frequencies.map((frequency) => frequency.tripId)).toEqual([
      "trip-kept",
      "trip-tjbb",
    ]);
    expect(result.shapes.map((shape) => shape.shapeId)).toEqual([
      "shape-kept",
      "shape-regular",
      "shape-tjbb",
    ]);
    expect(result.calendars.map((calendar) => calendar.serviceId)).toEqual([
      "service-kept",
      "service-regular",
      "service-tjbb",
    ]);
    expect(
      result.calendarDates.map((calendarDate) => calendarDate.serviceId),
    ).toEqual(["service-tjbb"]);
    expect(result.transfers.map((transfer) => transfer.fromStopId)).toEqual([
      "parent",
      "kept",
    ]);
    expect(result.fareAttributes.map((fare) => fare.fareId)).toEqual([
      "fare-tjbb",
    ]);
    expect(result.fareRules.map((fareRule) => fareRule.routeId)).toEqual([
      "B11",
    ]);
    expect(result.stops.map((stop) => stop.id).sort()).toEqual([
      "destination",
      "kept",
      "parent",
    ]);
    expect(result.limitations).toContain(
      "MVP profile excludes Mikrotrans and Bus Wisata services.",
    );
    expect(result.routes[0]?.lineage.snapshotId).toBe(
      result.metadata.snapshotId,
    );
    expect(result.stopTimes[0]?.lineage.snapshotId).toBe(
      result.metadata.snapshotId,
    );
    expect(sourceSnapshot.routes).toHaveLength(6);
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
