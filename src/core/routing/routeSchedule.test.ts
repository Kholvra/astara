import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";

import { findNextTripRide, getServiceDateCandidates } from "./routeSchedule";

describe("route schedule semantics", () => {
  it("maps a previous service day's after-midnight trip to the requested local date", () => {
    const candidates = getServiceDateCandidates("2026-09-11", "01:10");
    const previous = candidates.find(
      (candidate) => candidate.serviceDate === "2026-09-10",
    );

    expect(previous).toMatchObject({
      serviceDate: "2026-09-10",
      dayOffsetFromRequestedDate: -1,
    });

    const ride = findNextTripRide({
      requestedDate: "2026-09-11",
      requestedTime: "01:10",
      serviceDate: "2026-09-10",
      boardingDeparture: parseGtfsTime("25:10:00"),
      alightingArrival: parseGtfsTime("25:40:00"),
      firstStopDeparture: parseGtfsTime("25:00:00"),
    });

    expect(ride).toMatchObject({
      semantics: "exact",
      departure: { raw: "25:10:00", secondsSinceServiceDayStart: 90_600 },
      arrival: { raw: "25:40:00", secondsSinceServiceDayStart: 92_400 },
      actualDepartureSeconds: 4_200,
      actualArrivalSeconds: 6_000,
      serviceDate: "2026-09-10",
    });
  });

  it("keeps an interval frequency as a headway window without an exact departure", () => {
    const ride = findNextTripRide({
      requestedDate: "2026-09-11",
      requestedTime: "05:07",
      serviceDate: "2026-09-11",
      boardingDeparture: parseGtfsTime("05:00:00"),
      alightingArrival: parseGtfsTime("05:20:00"),
      firstStopDeparture: parseGtfsTime("05:00:00"),
      frequency: {
        tripId: "trip-interval",
        startTime: parseGtfsTime("05:00:00"),
        endTime: parseGtfsTime("05:20:00"),
        headwaySeconds: 600,
        timingSemantics: "interval",
        lineage: {
          snapshotId: "snapshot-1",
          fileName: "frequencies.txt",
          rowNumber: 2,
        },
      },
    });

    expect(ride).toMatchObject({
      semantics: "interval",
      start: { raw: "05:00:00" },
      end: { raw: "05:20:00" },
      headwaySeconds: 600,
      actualDepartureSeconds: 18_720,
      actualArrivalSeconds: 19_920,
      serviceDate: "2026-09-11",
    });
    expect(ride).not.toHaveProperty("departure");
  });

  it("rejects an interval after its service window", () => {
    const ride = findNextTripRide({
      requestedDate: "2026-09-11",
      requestedTime: "05:21",
      serviceDate: "2026-09-11",
      boardingDeparture: parseGtfsTime("05:00:00"),
      alightingArrival: parseGtfsTime("05:20:00"),
      firstStopDeparture: parseGtfsTime("05:00:00"),
      frequency: {
        tripId: "trip-interval",
        startTime: parseGtfsTime("05:00:00"),
        endTime: parseGtfsTime("05:20:00"),
        headwaySeconds: 600,
        timingSemantics: "interval",
        lineage: {
          snapshotId: "snapshot-1",
          fileName: "frequencies.txt",
          rowNumber: 2,
        },
      },
    });

    expect(ride).toBeUndefined();
  });
});
