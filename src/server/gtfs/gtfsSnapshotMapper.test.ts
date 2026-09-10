import { describe, expect, it } from "vitest";

import {
  gtfsSnapshotInclude,
  mapGtfsSnapshotRow,
  type GtfsSnapshotRow,
} from "./gtfsSnapshotMapper";

function createRow(): GtfsSnapshotRow {
  return {
    snapshotId: "snapshot-1",
    sourceUrl: "https://example.test/feed.zip",
    acquiredAt: "2026-09-09T00:00:00.000Z",
    contentHash: "a".repeat(64),
    httpEtag: null,
    httpLastModified: null,
    feedVersion: "v1",
    serviceDate: "2026-09-09",
    coverage: "LIMITED",
    limitations: ["pathways.txt is absent"],
    rawStorageKey: `${"a".repeat(64)}.zip`,
    validationState: "ACCEPTED",
    validationCompletedAt: "2026-09-09T00:01:00.000Z",
    createdAt: new Date("2026-09-09T00:01:00.000Z"),
    agencies: [
      {
        snapshotId: "snapshot-1",
        agencyId: "A1",
        name: "Agency",
        url: "https://example.test",
        timezone: "Asia/Jakarta",
        lineageFileName: "agency.txt",
        lineageRowNumber: 2,
      },
    ],
    routes: [
      {
        snapshotId: "snapshot-1",
        routeId: "R1",
        agencyId: "A1",
        shortName: "R1",
        longName: "Route 1",
        routeType: 3,
        lineageFileName: "routes.txt",
        lineageRowNumber: 2,
      },
    ],
    stops: [
      {
        snapshotId: "snapshot-1",
        stopId: "S1",
        name: "Stop",
        latitude: -6.1,
        longitude: 106.8,
        stopCode: null,
        locationType: null,
        parentStationId: null,
        lineageFileName: "stops.txt",
        lineageRowNumber: 2,
      },
    ],
    trips: [],
    stopTimes: [
      {
        snapshotId: "snapshot-1",
        tripId: "T1",
        stopSequence: 0,
        stopId: "S1",
        arrivalTimeRaw: "25:10:00",
        arrivalTimeSeconds: 90600,
        departureTimeRaw: "25:10:10",
        departureTimeSeconds: 90610,
        timepoint: null,
        lineageFileName: "stop_times.txt",
        lineageRowNumber: 2,
      },
    ],
    calendars: [],
    calendarDates: [],
    frequencies: [],
    transfers: [],
    shapes: [],
    fareAttributes: [],
    fareRules: [],
    validationIssues: [],
    publicationDecisions: [],
    activePointer: null,
    accessEvidenceAssociations: [],
  } as unknown as GtfsSnapshotRow;
}

describe("mapGtfsSnapshotRow", () => {
  it("rehydrates stored coordinates, times, metadata, and lineage", () => {
    const snapshot = mapGtfsSnapshotRow(createRow());

    expect(snapshot.metadata).toEqual({
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.test/feed.zip",
      acquiredAt: "2026-09-09T00:00:00.000Z",
      contentHash: "a".repeat(64),
      feedVersion: "v1",
    });
    expect(snapshot.stops[0]?.coordinate).toEqual([106.8, -6.1]);
    expect(snapshot.stopTimes[0]?.arrivalTime).toEqual({
      raw: "25:10:00",
      secondsSinceServiceDayStart: 90600,
    });
    expect(snapshot.routes[0]?.lineage).toEqual({
      snapshotId: "snapshot-1",
      fileName: "routes.txt",
      rowNumber: 2,
    });
  });

  it("keeps the relation include contract explicit", () => {
    expect(gtfsSnapshotInclude.shapes).toBe(true);
    expect(gtfsSnapshotInclude.validationIssues).toBe(true);
  });
});
