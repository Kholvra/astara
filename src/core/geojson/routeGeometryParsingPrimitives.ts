import type {
  ConnectionState,
  EvidenceState,
  GeometryState,
} from "~/core/ingestion/gtfsTypes";

import { isGeoCoordinate, type GeoCoordinate } from "./geometry";
import type {
  RouteMapMarkerKind,
  RouteMapValidationIssue,
} from "./routeGeometry";

export const EVIDENCE_STATES: readonly EvidenceState[] = [
  "Terverifikasi",
  "limited",
  "Perlu dicek",
  "Unknown",
];

export const CONNECTION_STATES: readonly ConnectionState[] = [
  "routable",
  "no-edge",
  "review-only",
];

export const GEOMETRY_STATES: readonly GeometryState[] = [
  "supported",
  "limited",
  "unknown",
  "unavailable",
];

export const MARKER_KINDS: readonly RouteMapMarkerKind[] = [
  "origin",
  "boarding",
  "transfer",
  "alighting",
  "destination",
  "waypoint",
];

export function readCoordinates(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): GeoCoordinate[] | undefined {
  const values = readArray(value, path, issues);
  if (!values) {
    return undefined;
  }
  const coordinates: GeoCoordinate[] = [];
  values.forEach((coordinate, index) => {
    if (!isGeoCoordinate(coordinate)) {
      issues.push({
        path: `${path}[${index}]`,
        message: "Coordinate must be [longitude, latitude] within bounds.",
      });
      return;
    }
    coordinates.push(coordinate);
  });
  return coordinates;
}

export function readCoordinate(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): GeoCoordinate | undefined {
  if (!isGeoCoordinate(value)) {
    issues.push({
      path,
      message: "Coordinate must be [longitude, latitude] within bounds.",
    });
    return undefined;
  }
  return value;
}

export function readString(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "A non-empty string is required." });
    return undefined;
  }
  return value;
}

export function readArray(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "An array is required." });
    return undefined;
  }
  const values: unknown[] = [];
  for (const entry of value) {
    values.push(entry as unknown);
  }
  return values;
}

export function readEnum<T extends string>(
  value: unknown,
  path: string,
  values: readonly T[],
  issues: RouteMapValidationIssue[],
): T | undefined {
  if (typeof value !== "string" || !values.includes(value as T)) {
    issues.push({
      path,
      message: "Value is outside the supported map contract.",
    });
    return undefined;
  }
  return value as T;
}

export function readOptionalEnum<T extends string>(
  value: unknown,
  path: string,
  values: readonly T[],
  issues: RouteMapValidationIssue[],
): T | undefined {
  return value === undefined
    ? undefined
    : readEnum(value, path, values, issues);
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
