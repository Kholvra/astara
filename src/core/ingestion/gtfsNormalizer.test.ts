import { describe, expect, it } from "vitest";

import { normalizeGtfsFiles } from "./gtfsNormalizer";

const metadata = {
  snapshotId: "snapshot-test-1",
  sourceUrl: "https://example.test/transjakarta.zip",
  acquiredAt: "2026-09-09T00:00:00.000Z",
  contentHash: "a".repeat(64),
};

const config = {
  serviceDate: "2026-09-09",
  approvedSourceHosts: ["example.test"],
};

function createFiles(
  overrides: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return {
    "agency.txt": [
      "agency_id,agency_name,agency_url,agency_timezone",
      "Tije,Transjakarta,https://transjakarta.co.id/,Asia/Jakarta",
    ].join("\n"),
    "routes.txt": [
      "route_id,agency_id,route_short_name,route_long_name,route_type",
      "R1,Tije,R1,Central Loop,3",
    ].join("\n"),
    "stops.txt": [
      "stop_id,stop_name,stop_lat,stop_lon",
      "S1,Origin,-6.175,106.827",
      "S2,Destination,-6.2,106.82",
    ].join("\n"),
    "trips.txt": [
      "trip_id,route_id,service_id,trip_headsign,shape_id",
      "T1,R1,WEEKDAY,Central Loop,SH1",
    ].join("\n"),
    "stop_times.txt": [
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint",
      "T1,05:00:00,05:00:10,S1,0,",
      "T1,25:10:00,25:10:10,S2,1,",
    ].join("\n"),
    "calendar.txt": [
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
      "WEEKDAY,1,1,1,1,1,0,0,20260101,20261231",
    ].join("\n"),
    "frequencies.txt": [
      "trip_id,start_time,end_time,headway_secs,exact_times",
      "T1,05:00:00,22:00:00,600,0",
    ].join("\n"),
    ...overrides,
  };
}

function validate(
  files: Readonly<Record<string, string>> = createFiles(),
  metadataOverrides: Readonly<Record<string, unknown>> = {},
  configOverrides: Readonly<Record<string, unknown>> = {},
) {
  return normalizeGtfsFiles({
    files,
    metadata: { ...metadata, ...metadataOverrides },
    config: { ...config, ...configOverrides },
  });
}

describe("normalizeGtfsFiles", () => {
  it("normalizes a valid feed and keeps source lineage on records", () => {
    const result = validate();

    expect(result.accepted).toBe(true);
    expect(result.snapshot).toEqual(
      expect.objectContaining({
        metadata,
        coverage: "limited",
      }),
    );
    const route = result.snapshot?.routes[0];
    expect(route?.id).toBe("R1");
    expect(route?.agencyId).toBe("Tije");
    expect(route?.lineage).toEqual({
      snapshotId: metadata.snapshotId,
      fileName: "routes.txt",
      rowNumber: 2,
    });
    expect(result.snapshot?.stops[0]?.coordinate).toEqual([106.827, -6.175]);
    expect(result.snapshot?.stopTimes[1]?.arrivalTime).toEqual({
      raw: "25:10:00",
      secondsSinceServiceDayStart: 90_600,
    });
    expect(result.snapshot?.frequencies[0]).toEqual(
      expect.objectContaining({
        headwaySeconds: 600,
        timingSemantics: "interval",
      }),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATA-WARN-001" }),
        expect.objectContaining({ code: "DATA-WARN-002" }),
        expect.objectContaining({ code: "DATA-WARN-003" }),
        expect.objectContaining({ code: "DATA-WARN-004" }),
      ]),
    );
  });

  it("rejects a missing core file with a rule and file-specific blocker", () => {
    const files = createFiles();
    const filesWithoutRoutes = Object.fromEntries(
      Object.entries(files).filter(([fileName]) => fileName !== "routes.txt"),
    );
    const result = validate(filesWithoutRoutes);

    expect(result.accepted).toBe(false);
    expect(result.snapshot).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATA-HARD-001",
          fileName: "routes.txt",
        }),
      ]),
    );
  });

  it("rejects duplicate IDs and dangling references without returning a partial snapshot", () => {
    const result = validate(
      createFiles({
        "routes.txt": [
          "route_id,agency_id,route_short_name,route_long_name,route_type",
          "R1,Tije,R1,Central Loop,3",
          "R1,Tije,R1-duplicate,Central Loop,3",
        ].join("\n"),
        "stop_times.txt": [
          "trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint",
          "UNKNOWN,05:00:00,05:00:10,S1,0,1",
        ].join("\n"),
      }),
    );

    expect(result.accepted).toBe(false);
    expect(result.snapshot).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATA-HARD-003",
          fileName: "routes.txt",
        }),
        expect.objectContaining({
          code: "DATA-HARD-003",
          fileName: "stop_times.txt",
        }),
      ]),
    );
  });

  it("rejects invalid coordinates and malformed times", () => {
    const result = validate(
      createFiles({
        "stops.txt": [
          "stop_id,stop_name,stop_lat,stop_lon",
          "S1,Origin,-91,106.827",
          "S2,Destination,-6.2,106.82",
        ].join("\n"),
        "stop_times.txt": [
          "trip_id,arrival_time,departure_time,stop_id,stop_sequence",
          "T1,25:60:00,25:10:10,S1,0",
          "T1,05:00:00,05:00:10,S2,1",
        ].join("\n"),
      }),
    );

    expect(result.accepted).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATA-HARD-004",
          fileName: "stops.txt",
        }),
        expect.objectContaining({
          code: "DATA-HARD-002",
          fileName: "stop_times.txt",
        }),
      ]),
    );
  });

  it("uses calendar exceptions to activate a service that has no weekday baseline", () => {
    const result = validate(
      createFiles({
        "calendar.txt": [
          "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
          "SPECIAL,0,0,0,0,0,0,0,20260101,20261231",
        ].join("\n"),
        "trips.txt": [
          "trip_id,route_id,service_id,trip_headsign",
          "T1,R1,SPECIAL,Special Day",
        ].join("\n"),
        "calendar_dates.txt": [
          "service_id,date,exception_type",
          "SPECIAL,20260909,1",
        ].join("\n"),
      }),
    );

    expect(result.accepted).toBe(true);
    expect(result.snapshot?.calendarDates).toHaveLength(1);
  });

  it("accepts a calendar-dates-only service basis", () => {
    const files = createFiles({
      "trips.txt": [
        "trip_id,route_id,service_id,trip_headsign",
        "T1,R1,SPECIAL,Special Day",
      ].join("\n"),
      "calendar_dates.txt": [
        "service_id,date,exception_type",
        "SPECIAL,20260909,1",
      ].join("\n"),
    });
    const filesWithoutCalendar = Object.fromEntries(
      Object.entries(files).filter(([fileName]) => fileName !== "calendar.txt"),
    );

    const result = validate(filesWithoutCalendar);

    expect(result.accepted).toBe(true);
    expect(result.snapshot?.calendars).toEqual([]);
    expect(result.snapshot?.calendarDates).toHaveLength(1);
  });

  it("rejects a service date removed by a calendar exception", () => {
    const result = validate(
      createFiles({
        "calendar_dates.txt": [
          "service_id,date,exception_type",
          "WEEKDAY,20260909,2",
        ].join("\n"),
      }),
    );

    expect(result.accepted).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATA-HARD-005" }),
      ]),
    );
  });

  it("fails closed when provenance or validation configuration is incomplete", () => {
    const result = validate(
      createFiles(),
      {
        sourceUrl: "http://unapproved.test/feed.zip",
        contentHash: "bad-hash",
      },
      {
        approvedSourceHosts: [],
      },
    );

    expect(result.accepted).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATA-HARD-999" }),
      ]),
    );
  });

  it("replays the same candidate deterministically", () => {
    const first = validate();
    const second = validate();

    expect(second).toEqual(first);
  });
});
