import type {
  RouteMapContext,
  RouteMapData,
  RouteMapLeg,
  RouteMapMarker,
  RouteMapValidationIssue,
  RouteMapValidationResult,
} from "./routeGeometry";
import {
  asRecord,
  isDefined,
  readArray,
  readString,
} from "./routeGeometryParsingPrimitives";
import {
  parseAttribution,
  parseContext,
  parseLeg,
  parseMarker,
} from "./routeGeometryParsing";

export function validateRouteMapData(input: unknown): RouteMapValidationResult {
  const issues: RouteMapValidationIssue[] = [];
  const record = asRecord(input);
  if (!record) {
    return invalidResult([
      { path: "route", message: "Route map data must be an object." },
    ]);
  }

  const routeId = readString(record.routeId, "routeId", issues);
  const legs = readArray(record.legs, "legs", issues)
    ?.map((value, index) => parseLeg(value, `legs[${index}]`, issues))
    .filter(isDefined);
  const markers = readArray(record.markers, "markers", issues)
    ?.map((value, index) => parseMarker(value, `markers[${index}]`, issues))
    .filter(isDefined);
  const attributions = readArray(record.attributions, "attributions", issues)
    ?.map((value, index) =>
      parseAttribution(value, `attributions[${index}]`, issues),
    )
    .filter(isDefined);
  const context = parseContext(record.context, routeId, issues);

  if (!routeId || !legs || !markers || !attributions) {
    return invalidResult(issues);
  }
  if (legs.length === 0) {
    issues.push({
      path: "legs",
      message: "At least one route leg is required.",
    });
  }
  validateIdentities(routeId, legs, markers, context, issues);
  if (issues.length > 0) {
    return invalidResult(issues);
  }

  const data: RouteMapData = {
    routeId,
    legs,
    markers,
    attributions,
    ...(context ? { context } : {}),
  };
  return { state: "valid", data };
}

function validateIdentities(
  routeId: string,
  legs: readonly RouteMapLeg[],
  markers: readonly RouteMapMarker[],
  context: RouteMapContext | undefined,
  issues: RouteMapValidationIssue[],
): void {
  assertUnique(
    legs.map((leg) => leg.legId),
    "legs.legId",
    issues,
  );
  assertUnique(
    legs.map((leg) => leg.stepId),
    "legs.stepId",
    issues,
  );
  assertUnique(
    markers.map((marker) => marker.markerId),
    "markers.markerId",
    issues,
  );
  assertUnique(
    context?.features.map((feature) => feature.contextId) ?? [],
    "context.features.contextId",
    issues,
  );
  assertUnique(
    [
      ...legs.map((leg) => leg.legId),
      ...markers.map((marker) => marker.markerId),
      ...(context?.features.map((feature) => feature.contextId) ?? []),
    ],
    "feature IDs",
    issues,
  );
  const stepIds = new Set(legs.map((leg) => leg.stepId));
  markers.forEach((marker, index) => {
    if (!stepIds.has(marker.stepId)) {
      issues.push({
        path: `markers[${index}].stepId`,
        message: "Marker step ID must reference a route leg.",
      });
    }
  });
  if (!routeId.trim()) {
    issues.push({ path: "routeId", message: "Route ID is required." });
  }
}

function assertUnique(
  values: readonly string[],
  path: string,
  issues: RouteMapValidationIssue[],
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push({
        path: `${path}[${index}]`,
        message: "Identity must be unique.",
      });
    }
    seen.add(value);
  });
}

function invalidResult(
  issues: readonly RouteMapValidationIssue[],
): Extract<RouteMapValidationResult, { state: "invalid" }> {
  return {
    state: "invalid",
    issues,
    message: "Data rute untuk peta tidak dapat ditampilkan.",
    recoveryAction: "Muat ulang rute atau gunakan instruksi rute pada kartu.",
  };
}
