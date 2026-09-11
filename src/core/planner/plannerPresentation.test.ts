import { describe, expect, it } from "vitest";

import type { GeoCoordinate } from "~/core/geojson/geometry";
import type { JourneyRoute, TransitRouteLeg, WalkingRouteLeg } from "~/core/routing/routingTypes";
import { createRouteMapDataForJourney } from "./plannerPresentation";

const ORIGIN_COORD: GeoCoordinate = [106.8272, -6.1754];
const DEST_COORD: GeoCoordinate = [106.7978, -6.2432];
const INTERMEDIATE_COORD: GeoCoordinate = [106.81, -6.2];

function makeBaseJourney(legs: JourneyRoute["legs"]): JourneyRoute {
  return {
    routeId: "journey-test",
    status: "routed",
    originStopId: "origin-parent",
    destinationStopId: "destination-parent",
    legs,
    boardingAlighting: {
      originStopId: "origin-parent",
      destinationStopId: "destination-parent",
      stopIds: ["origin-parent", "destination-parent"],
    },
    serviceDirections: [],
    transferCount: 0,
    decisionPointCount: 1,
    walking: { label: "Terverifikasi", legs: [] },
    timing: { semantics: "unavailable" },
    geometry: { state: "supported", legs: [] },
    evidenceRank: "complete",
    accessEvidence: "Terverifikasi",
    limitation: { freshness: "current", access: "Terverifikasi", notes: [] },
    lineage: {
      snapshotId: "snap-1",
      sourceUrl: "https://example.test",
      acquiredAt: "2026-09-10T00:00:00.000Z",
      contentHash: "hash-1",
      coverage: "complete",
      freshness: "current",
    },
    explanation: {
      decidingCriterion: "only-eligible",
      tieBreakApplied: false,
      reasonCodes: [],
      sourceFields: [],
      sourceValues: {},
    },
  };
}

describe("createRouteMapDataForJourney", () => {
  it("resolves route map data and markers from direct transit geometry", () => {
    const transitLeg: TransitRouteLeg = {
      kind: "transit",
      legId: "leg-transit-1",
      routeId: "1",
      routeShortName: "1",
      routeLongName: "Blok M - Kota",
      tripId: "trip-1",
      serviceId: "svc-1",
      fromStopId: "stop-monas",
      toStopId: "stop-blok-m",
      stopIds: ["stop-monas", "stop-blok-m"],
      timing: { semantics: "unavailable" },
      geometry: {
        state: "supported",
        coordinates: [ORIGIN_COORD, INTERMEDIATE_COORD, DEST_COORD],
        fromStopSequence: 1,
        toStopSequence: 2,
      },
      lineage: [],
    };

    const journey = makeBaseJourney([transitLeg]);
    const mapData = createRouteMapDataForJourney(journey);

    expect(mapData.routeId).toBe("journey-test");
    expect(mapData.legs).toHaveLength(1);
    expect(mapData.legs[0]?.geometryState).toBe("supported");
    expect(mapData.legs[0]?.coordinates).toEqual([
      ORIGIN_COORD,
      INTERMEDIATE_COORD,
      DEST_COORD,
    ]);

    expect(mapData.markers).toHaveLength(2);
    expect(mapData.markers[0]?.kind).toBe("origin");
    expect(mapData.markers[0]?.coordinate).toEqual(ORIGIN_COORD);
    expect(mapData.markers[1]?.kind).toBe("destination");
    expect(mapData.markers[1]?.coordinate).toEqual(DEST_COORD);
  });

  it("resolves origin and destination markers from stopsById for parent station transfer legs", () => {
    const walkIn: WalkingRouteLeg = {
      kind: "walking",
      legId: "leg-walk-1",
      edgeId: "edge-1",
      fromStopId: "origin-parent",
      toStopId: "platform-monas",
      coordinates: [],
      evidenceState: "limited",
      connectionState: "review-only",
      evidenceReferences: [],
      limitations: [],
    };
    const transitLeg: TransitRouteLeg = {
      kind: "transit",
      legId: "leg-transit-1",
      routeId: "1",
      routeShortName: "1",
      routeLongName: "Blok M - Kota",
      tripId: "trip-1",
      serviceId: "svc-1",
      fromStopId: "platform-monas",
      toStopId: "platform-blokm",
      stopIds: ["platform-monas", "platform-blokm"],
      timing: { semantics: "unavailable" },
      geometry: {
        state: "supported",
        coordinates: [ORIGIN_COORD, DEST_COORD],
        fromStopSequence: 1,
        toStopSequence: 2,
      },
      lineage: [],
    };
    const walkOut: WalkingRouteLeg = {
      kind: "walking",
      legId: "leg-walk-2",
      edgeId: "edge-2",
      fromStopId: "platform-blokm",
      toStopId: "destination-parent",
      coordinates: [],
      evidenceState: "limited",
      connectionState: "review-only",
      evidenceReferences: [],
      limitations: [],
    };

    const stopsById = new Map([
      ["origin-parent", { coordinate: ORIGIN_COORD, name: "Monumen Nasional" }],
      ["platform-monas", { coordinate: [106.8273, -6.1755] as GeoCoordinate, name: "Monas Pintu 1" }],
      ["platform-blokm", { coordinate: [106.7979, -6.2431] as GeoCoordinate, name: "Blok M Jalur 1" }],
      ["destination-parent", { coordinate: DEST_COORD, name: "Blok M" }],
    ]);

    const journey = makeBaseJourney([walkIn, transitLeg, walkOut]);
    const mapData = createRouteMapDataForJourney(journey, stopsById);

    expect(mapData.markers).toHaveLength(2);
    expect(mapData.markers[0]?.kind).toBe("origin");
    expect(mapData.markers[0]?.coordinate).toEqual(ORIGIN_COORD);
    expect(mapData.markers[1]?.kind).toBe("destination");
    expect(mapData.markers[1]?.coordinate).toEqual(DEST_COORD);

    expect(mapData.legs[0]?.coordinates).toHaveLength(2);
    expect(mapData.legs[0]?.geometryState).toBe("limited");
    expect(mapData.legs[2]?.coordinates).toHaveLength(2);
    expect(mapData.legs[2]?.geometryState).toBe("limited");
  });

  it("synthesizes transit leg coordinates from stops when shape geometry is empty", () => {
    const transitLeg: TransitRouteLeg = {
      kind: "transit",
      legId: "leg-transit-1",
      routeId: "1",
      routeShortName: "1",
      routeLongName: "Blok M - Kota",
      tripId: "trip-1",
      serviceId: "svc-1",
      fromStopId: "stop-1",
      toStopId: "stop-2",
      stopIds: ["stop-1", "stop-2"],
      timing: { semantics: "unavailable" },
      geometry: {
        state: "unavailable",
        coordinates: [],
        fromStopSequence: 1,
        toStopSequence: 2,
      },
      lineage: [],
    };

    const stopsById = new Map([
      ["stop-1", { coordinate: ORIGIN_COORD }],
      ["stop-2", { coordinate: DEST_COORD }],
    ]);

    const journey = makeBaseJourney([transitLeg]);
    const mapData = createRouteMapDataForJourney(journey, stopsById);

    expect(mapData.legs[0]?.coordinates).toEqual([ORIGIN_COORD, DEST_COORD]);
    expect(mapData.legs[0]?.geometryState).toBe("limited");
  });
});
