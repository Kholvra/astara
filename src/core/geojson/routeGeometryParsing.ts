import type { GeometryState } from "~/core/ingestion/gtfsTypes";

import type { GeoCoordinate } from "./geometry";
import type {
  RouteMapAttribution,
  RouteMapContext,
  RouteMapContextFeature,
  RouteMapLeg,
  RouteMapMarker,
  RouteMapValidationIssue,
} from "./routeGeometry";
import {
  CONNECTION_STATES,
  EVIDENCE_STATES,
  GEOMETRY_STATES,
  MARKER_KINDS,
  asRecord,
  isDefined,
  readArray,
  readCoordinate,
  readCoordinates,
  readEnum,
  readOptionalEnum,
  readString,
} from "./routeGeometryParsingPrimitives";

export function parseLeg(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): RouteMapLeg | undefined {
  const record = asRecord(value);
  if (!record) {
    issues.push({ path, message: "Route leg must be an object." });
    return undefined;
  }
  const legId = readString(record.legId, `${path}.legId`, issues);
  const stepId = readString(record.stepId, `${path}.stepId`, issues);
  const mode = readEnum(
    record.mode,
    `${path}.mode`,
    ["transit", "walking"],
    issues,
  );
  const label = readString(record.label, `${path}.label`, issues);
  const geometryState = readEnum(
    record.geometryState,
    `${path}.geometryState`,
    GEOMETRY_STATES,
    issues,
  );
  const coordinates = readCoordinates(
    record.coordinates,
    `${path}.coordinates`,
    issues,
  );
  const evidenceState = readOptionalEnum(
    record.evidenceState,
    `${path}.evidenceState`,
    EVIDENCE_STATES,
    issues,
  );
  const connectionState = readOptionalEnum(
    record.connectionState,
    `${path}.connectionState`,
    CONNECTION_STATES,
    issues,
  );
  if (mode === "walking" && (!evidenceState || !connectionState)) {
    issues.push({
      path,
      message: "Walking legs require evidence and connection states.",
    });
  }
  if (geometryState && coordinates) {
    validateGeometryConsistency(geometryState, coordinates, path, issues);
  }
  if (!legId || !stepId || !mode || !label || !geometryState || !coordinates) {
    return undefined;
  }
  return {
    legId,
    stepId,
    mode,
    label,
    geometryState,
    coordinates,
    ...(evidenceState ? { evidenceState } : {}),
    ...(connectionState ? { connectionState } : {}),
  };
}

export function parseMarker(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): RouteMapMarker | undefined {
  const record = asRecord(value);
  if (!record) {
    issues.push({ path, message: "Map marker must be an object." });
    return undefined;
  }
  const markerId = readString(record.markerId, `${path}.markerId`, issues);
  const stepId = readString(record.stepId, `${path}.stepId`, issues);
  const kind = readEnum(record.kind, `${path}.kind`, MARKER_KINDS, issues);
  const label = readString(record.label, `${path}.label`, issues);
  const coordinate = readCoordinate(
    record.coordinate,
    `${path}.coordinate`,
    issues,
  );
  const geometryState = readEnum(
    record.geometryState,
    `${path}.geometryState`,
    GEOMETRY_STATES,
    issues,
  );
  const connectionState = readOptionalEnum(
    record.connectionState,
    `${path}.connectionState`,
    CONNECTION_STATES,
    issues,
  );
  if (
    !markerId ||
    !stepId ||
    !kind ||
    !label ||
    !coordinate ||
    !geometryState
  ) {
    return undefined;
  }
  return {
    markerId,
    stepId,
    kind,
    label,
    coordinate,
    geometryState,
    ...(connectionState ? { connectionState } : {}),
  };
}

export function parseAttribution(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): RouteMapAttribution | undefined {
  const record = asRecord(value);
  if (!record) {
    issues.push({ path, message: "Attribution must be an object." });
    return undefined;
  }
  const id = readString(record.id, `${path}.id`, issues);
  const label = readString(record.label, `${path}.label`, issues);
  const href = record.href;
  if (
    href !== undefined &&
    (typeof href !== "string" || !/^https:\/\//i.test(href))
  ) {
    issues.push({
      path: `${path}.href`,
      message: "Attribution links must use HTTPS.",
    });
  }
  if (!id || !label) {
    return undefined;
  }
  return {
    id,
    label,
    ...(typeof href === "string" ? { href } : {}),
  };
}

export function parseContext(
  value: unknown,
  routeId: string | undefined,
  issues: RouteMapValidationIssue[],
): RouteMapContext | undefined {
  if (value === undefined) {
    return undefined;
  }
  const path = "context";
  const record = asRecord(value);
  if (!record) {
    issues.push({ path, message: "Map context must be an object." });
    return undefined;
  }
  const contextRouteId = readString(record.routeId, `${path}.routeId`, issues);
  if (record.scope !== "selected-route-neighborhood") {
    issues.push({
      path: `${path}.scope`,
      message: "Context scope is unsupported.",
    });
  }
  const features = readArray(record.features, `${path}.features`, issues)
    ?.map((feature, index) =>
      parseContextFeature(feature, `${path}.features[${index}]`, issues),
    )
    .filter(isDefined);
  if (contextRouteId && routeId && contextRouteId !== routeId) {
    issues.push({
      path: `${path}.routeId`,
      message: "Context route ID does not match the selected route.",
    });
  }
  if (!contextRouteId || !features) {
    return undefined;
  }
  return {
    routeId: contextRouteId,
    scope: "selected-route-neighborhood",
    features,
  };
}

function parseContextFeature(
  value: unknown,
  path: string,
  issues: RouteMapValidationIssue[],
): RouteMapContextFeature | undefined {
  const record = asRecord(value);
  if (!record) {
    issues.push({ path, message: "Context feature must be an object." });
    return undefined;
  }
  const contextId = readString(record.contextId, `${path}.contextId`, issues);
  const mode = readEnum(
    record.mode,
    `${path}.mode`,
    ["transit", "walking"],
    issues,
  );
  const label = readString(record.label, `${path}.label`, issues);
  const geometryState = readEnum(
    record.geometryState,
    `${path}.geometryState`,
    GEOMETRY_STATES,
    issues,
  );
  const coordinates = readCoordinates(
    record.coordinates,
    `${path}.coordinates`,
    issues,
  );
  const evidenceState = readOptionalEnum(
    record.evidenceState,
    `${path}.evidenceState`,
    EVIDENCE_STATES,
    issues,
  );
  const connectionState = readOptionalEnum(
    record.connectionState,
    `${path}.connectionState`,
    CONNECTION_STATES,
    issues,
  );
  if (mode === "walking" && (!evidenceState || !connectionState)) {
    issues.push({
      path,
      message: "Walking context requires evidence and connection states.",
    });
  }
  if (geometryState && coordinates) {
    validateGeometryConsistency(geometryState, coordinates, path, issues);
  }
  if (!contextId || !mode || !label || !geometryState || !coordinates) {
    return undefined;
  }
  return {
    contextId,
    mode,
    label,
    geometryState,
    coordinates,
    ...(evidenceState ? { evidenceState } : {}),
    ...(connectionState ? { connectionState } : {}),
  };
}

function validateGeometryConsistency(
  geometryState: GeometryState,
  coordinates: readonly GeoCoordinate[],
  path: string,
  issues: RouteMapValidationIssue[],
): void {
  if (
    (geometryState === "supported" && coordinates.length < 2) ||
    ((geometryState === "unknown" || geometryState === "unavailable") &&
      coordinates.length > 0)
  ) {
    issues.push({
      path: `${path}.coordinates`,
      message: "Geometry state and coordinates do not agree.",
    });
  }
}
