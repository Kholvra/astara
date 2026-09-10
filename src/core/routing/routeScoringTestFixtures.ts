import type { GeoCoordinate } from "~/core/geojson/geometry";
import { parseGtfsTime } from "~/core/ingestion/gtfsTime";

import type { JourneyRoute, RouteCandidate } from "./routingTypes";

const COORDINATE: GeoCoordinate = [106.8, -6.2];

export function makeCandidate(options: {
  routeId: string;
  transferCount?: number;
  decisionPointCount?: number;
  walkingDistanceMeters?: number;
  expectedDurationSeconds?: number;
  evidenceRank?: JourneyRoute["evidenceRank"];
}): RouteCandidate {
  const transferCount = options.transferCount ?? 0;
  const decisionPointCount = options.decisionPointCount ?? transferCount + 1;
  const evidenceRank = options.evidenceRank ?? "complete";
  const timing =
    options.expectedDurationSeconds === undefined
      ? { semantics: "unavailable" as const }
      : {
          semantics: "exact" as const,
          departure: parseGtfsTime("08:00:00"),
          arrival: parseGtfsTime("08:30:00"),
          expectedDurationSeconds: options.expectedDurationSeconds,
        };
  const journey: JourneyRoute = {
    routeId: options.routeId,
    status: evidenceRank === "complete" ? "routed" : "limited",
    originStopId: "origin",
    destinationStopId: "destination",
    legs: [],
    boardingAlighting: {
      originStopId: "origin",
      destinationStopId: "destination",
      stopIds: ["origin", "destination"],
    },
    serviceDirections: [],
    transferCount,
    decisionPointCount,
    walking: {
      ...(options.walkingDistanceMeters === undefined
        ? {}
        : { totalDistanceMeters: options.walkingDistanceMeters }),
      label: evidenceRank === "complete" ? "Terverifikasi" : "limited",
      legs: [],
    },
    timing,
    geometry: {
      state: "supported",
      legs: [
        {
          state: "supported",
          coordinates: [COORDINATE, [106.81, -6.19]],
          fromStopSequence: 1,
          toStopSequence: 2,
        },
      ],
    },
    evidenceRank,
    accessEvidence: evidenceRank === "complete" ? "Terverifikasi" : "limited",
    limitation: {
      freshness: evidenceRank === "complete" ? "current" : "aging",
      access: evidenceRank === "complete" ? "Terverifikasi" : "limited",
      notes: [],
    },
    lineage: {
      snapshotId: "snapshot-test",
      sourceUrl: "https://example.test/gtfs.zip",
      acquiredAt: "2026-09-10T00:00:00.000Z",
      contentHash: "hash-test",
      coverage: "complete",
      freshness: evidenceRank === "complete" ? "current" : "aging",
    },
    explanation: {
      decidingCriterion: "only-eligible",
      tieBreakApplied: false,
      reasonCodes: [],
      sourceFields: [],
      sourceValues: {},
    },
  };

  return {
    journey,
    score: {
      routeId: options.routeId,
      transferCount,
      decisionPointCount,
      ...(options.walkingDistanceMeters === undefined
        ? {}
        : { walkingDistanceMeters: options.walkingDistanceMeters }),
      ...(options.expectedDurationSeconds === undefined
        ? {}
        : { expectedDurationSeconds: options.expectedDurationSeconds }),
      evidenceRank,
    },
  };
}
