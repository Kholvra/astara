import { isGeoCoordinate } from "~/core/geojson/geometry";
import { parseGtfsTime, type GtfsTime } from "~/core/ingestion/gtfsTime";
import type { EvidenceState } from "~/core/ingestion/gtfsTypes";

import {
  EXPLANATION_SOURCE_FIELDS,
  RoutingBenchmarkInputError,
  type BoardingAlightingFacts,
  type GeometryFacts,
  type GeometryLegFacts,
  type IntervalTimingFacts,
  type LimitationFacts,
  type RouteFacts,
  type RouteExplanationFacts,
  type ServiceDirectionFacts,
  type TimingFacts,
  type WalkingFacts,
} from "./routingBenchmarkTypes";
import {
  asRecord,
  hasValidExplanationLineage,
  isFiniteNumber,
  isInteger,
  parseStringArray,
  requiredString,
} from "./routingBenchmarkSupport";

export function parseRouteFacts(
  value: unknown,
  path: string,
  requireExplanationLineage = true,
): RouteFacts {
  const input = asRecord(value, path);
  const routeStatus = input.routeStatus;
  if (routeStatus !== "routed" && routeStatus !== "no-route") {
    throw new RoutingBenchmarkInputError([
      `${path}.routeStatus must be routed or no-route`,
    ]);
  }
  const boardingAlighting = parseBoardingAlighting(
    input.boardingAlighting,
    `${path}.boardingAlighting`,
  );
  const serviceDirection = parseServiceDirection(
    input.serviceDirection,
    `${path}.serviceDirection`,
  );
  const transferCount = input.transferCount;
  if (!isInteger(transferCount) || transferCount < 0) {
    throw new RoutingBenchmarkInputError([
      `${path}.transferCount must be a non-negative integer`,
    ]);
  }
  const timing = parseTiming(input.timing, `${path}.timing`);
  const walking = parseWalking(input.walking, `${path}.walking`);
  const geometry = parseGeometry(input.geometry, `${path}.geometry`);
  const explanation = parseExplanation(
    input.explanation,
    `${path}.explanation`,
  );
  const limitation = parseLimitation(input.limitation, `${path}.limitation`);
  const facts: RouteFacts = {
    routeStatus,
    boardingAlighting,
    serviceDirection,
    transferCount,
    timing,
    walking,
    geometry,
    explanation,
    limitation,
  };
  if (requireExplanationLineage && !hasValidExplanationLineage(facts)) {
    throw new RoutingBenchmarkInputError([
      `${path}.explanation.sourceValues must reconstruct from route facts`,
    ]);
  }
  return facts;
}

function parseBoardingAlighting(
  value: unknown,
  path: string,
): BoardingAlightingFacts {
  const input = asRecord(value, path);
  const stopIds = parseStringArray(input.stopIds, `${path}.stopIds`);
  if (stopIds.length === 0) {
    throw new RoutingBenchmarkInputError([`${path}.stopIds must not be empty`]);
  }
  return {
    originStopId: requiredString(input.originStopId, `${path}.originStopId`),
    destinationStopId: requiredString(
      input.destinationStopId,
      `${path}.destinationStopId`,
    ),
    stopIds,
  };
}

function parseServiceDirection(
  value: unknown,
  path: string,
): ServiceDirectionFacts {
  const input = asRecord(value, path);
  const rawDirectionId = input.directionId;
  if (rawDirectionId !== undefined && !isInteger(rawDirectionId)) {
    throw new RoutingBenchmarkInputError([
      `${path}.directionId must be an integer`,
    ]);
  }
  const directionId = isInteger(rawDirectionId) ? rawDirectionId : undefined;
  return {
    routeId: requiredString(input.routeId, `${path}.routeId`),
    headsign: requiredString(input.headsign, `${path}.headsign`),
    ...(directionId === undefined ? {} : { directionId }),
  };
}

function parseTiming(value: unknown, path: string): TimingFacts {
  const input = asRecord(value, path);
  const semantics = input.semantics;
  if (
    semantics !== "exact" &&
    semantics !== "interval" &&
    semantics !== "estimate" &&
    semantics !== "unavailable"
  ) {
    throw new RoutingBenchmarkInputError([`${path}.semantics is invalid`]);
  }
  if (semantics === "unavailable") {
    return { semantics };
  }
  if (semantics === "exact") {
    return {
      semantics,
      departure: parseGtfsTimeValue(input.departure, `${path}.departure`),
      arrival: parseGtfsTimeValue(input.arrival, `${path}.arrival`),
    };
  }
  if (semantics === "interval") {
    const headwaySeconds = input.headwaySeconds;
    if (!isInteger(headwaySeconds) || headwaySeconds <= 0) {
      throw new RoutingBenchmarkInputError([
        `${path}.headwaySeconds must be a positive integer`,
      ]);
    }
    const interval: IntervalTimingFacts = {
      semantics,
      start: parseGtfsTimeValue(input.start, `${path}.start`),
      end: parseGtfsTimeValue(input.end, `${path}.end`),
      headwaySeconds,
    };
    if (
      interval.start.secondsSinceServiceDayStart >=
      interval.end.secondsSinceServiceDayStart
    ) {
      throw new RoutingBenchmarkInputError([
        `${path}.start must be before ${path}.end`,
      ]);
    }
    return interval;
  }
  const estimate: TimingFacts = {
    semantics,
    ...(input.departure === undefined
      ? {}
      : {
          departure: parseGtfsTimeValue(input.departure, `${path}.departure`),
        }),
    ...(input.arrival === undefined
      ? {}
      : { arrival: parseGtfsTimeValue(input.arrival, `${path}.arrival`) }),
  };
  return estimate;
}

function parseGtfsTimeValue(value: unknown, path: string): GtfsTime {
  const input = asRecord(value, path);
  const raw = requiredString(input.raw, `${path}.raw`);
  const parsed = parseGtfsTime(raw);
  if (
    input.secondsSinceServiceDayStart !== parsed.secondsSinceServiceDayStart
  ) {
    throw new RoutingBenchmarkInputError([
      `${path}.secondsSinceServiceDayStart does not match raw`,
    ]);
  }
  return parsed;
}

function parseWalking(value: unknown, path: string): WalkingFacts {
  const input = asRecord(value, path);
  if (
    !isFiniteNumber(input.totalDistanceMeters) ||
    input.totalDistanceMeters < 0
  ) {
    throw new RoutingBenchmarkInputError([
      `${path}.totalDistanceMeters must be non-negative`,
    ]);
  }
  const label = parseEvidenceState(input.label, `${path}.label`);
  if (!Array.isArray(input.legs)) {
    throw new RoutingBenchmarkInputError([`${path}.legs must be an array`]);
  }
  const legs = input.legs.map((value, index) => {
    const leg = asRecord(value, `${path}.legs[${index}]`);
    if (!isFiniteNumber(leg.distanceMeters) || leg.distanceMeters < 0) {
      throw new RoutingBenchmarkInputError([
        `${path}.legs[${index}].distanceMeters must be non-negative`,
      ]);
    }
    return {
      fromStopId: requiredString(
        leg.fromStopId,
        `${path}.legs[${index}].fromStopId`,
      ),
      toStopId: requiredString(leg.toStopId, `${path}.legs[${index}].toStopId`),
      distanceMeters: leg.distanceMeters,
      label: parseEvidenceState(leg.label, `${path}.legs[${index}].label`),
    };
  });
  return { totalDistanceMeters: input.totalDistanceMeters, label, legs };
}

function parseGeometry(value: unknown, path: string): GeometryFacts {
  const input = asRecord(value, path);
  if (
    input.continuity !== "continuous" &&
    input.continuity !== "disconnected" &&
    input.continuity !== "unavailable"
  ) {
    throw new RoutingBenchmarkInputError([`${path}.continuity is invalid`]);
  }
  if (!Array.isArray(input.legs)) {
    throw new RoutingBenchmarkInputError([`${path}.legs must be an array`]);
  }
  const legs: GeometryLegFacts[] = input.legs.map((value, index) => {
    const leg = asRecord(value, `${path}.legs[${index}]`);
    if (!Array.isArray(leg.coordinates) || leg.coordinates.length < 2) {
      throw new RoutingBenchmarkInputError([
        `${path}.legs[${index}].coordinates must contain at least two points`,
      ]);
    }
    const coordinates = leg.coordinates.map((coordinate, pointIndex) => {
      if (!isGeoCoordinate(coordinate)) {
        throw new RoutingBenchmarkInputError([
          `${path}.legs[${index}].coordinates[${pointIndex}] is not [longitude, latitude]`,
        ]);
      }
      return coordinate;
    });
    return {
      fromStopId: requiredString(
        leg.fromStopId,
        `${path}.legs[${index}].fromStopId`,
      ),
      toStopId: requiredString(leg.toStopId, `${path}.legs[${index}].toStopId`),
      coordinates,
    };
  });
  return { continuity: input.continuity, legs };
}

function parseExplanation(value: unknown, path: string): RouteExplanationFacts {
  const input = asRecord(value, path);
  const reasonCodes = parseStringArray(
    input.reasonCodes,
    `${path}.reasonCodes`,
  );
  const sourceFields = input.sourceFields;
  if (!Array.isArray(sourceFields) || sourceFields.length === 0) {
    throw new RoutingBenchmarkInputError([
      `${path}.sourceFields must be non-empty`,
    ]);
  }
  const parsedSourceFields = sourceFields.map((field, index) => {
    if (
      typeof field !== "string" ||
      !(EXPLANATION_SOURCE_FIELDS as readonly string[]).includes(field)
    ) {
      throw new RoutingBenchmarkInputError([
        `${path}.sourceFields[${index}] is invalid`,
      ]);
    }
    return field as RouteExplanationFacts["sourceFields"][number];
  });
  if (new Set(parsedSourceFields).size !== parsedSourceFields.length) {
    throw new RoutingBenchmarkInputError([
      `${path}.sourceFields must not duplicate fields`,
    ]);
  }
  const rawValues = asRecord(input.sourceValues, `${path}.sourceValues`);
  const sourceValues: Record<string, string> = {};
  for (const field of parsedSourceFields) {
    sourceValues[field] = requiredString(
      rawValues[field],
      `${path}.sourceValues.${field}`,
    );
  }
  return { reasonCodes, sourceFields: parsedSourceFields, sourceValues };
}

function parseLimitation(value: unknown, path: string): LimitationFacts {
  const input = asRecord(value, path);
  const freshness = input.freshness;
  if (
    freshness !== "current" &&
    freshness !== "aging" &&
    freshness !== "stale" &&
    freshness !== "unknown"
  ) {
    throw new RoutingBenchmarkInputError([`${path}.freshness is invalid`]);
  }
  const notes = parseStringArray(input.notes, `${path}.notes`);
  return {
    freshness,
    access: parseEvidenceState(input.access, `${path}.access`),
    notes,
  };
}

function parseEvidenceState(value: unknown, path: string): EvidenceState {
  if (
    value !== "Terverifikasi" &&
    value !== "limited" &&
    value !== "Perlu dicek" &&
    value !== "Unknown" &&
    value !== "Data terbatas"
  ) {
    throw new RoutingBenchmarkInputError([
      `${path} is not a valid evidence state`,
    ]);
  }
  return value === "Data terbatas" ? "limited" : value;
}
