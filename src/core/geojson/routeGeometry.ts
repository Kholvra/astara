import type {
  ConnectionState,
  EvidenceState,
  GeometryState,
} from "~/core/ingestion/gtfsTypes";

import type { GeoCoordinate } from "./geometry";
import { validateRouteMapData } from "./routeGeometryValidation";

export { getRouteMapBounds } from "./routeGeometryBounds";

export type RouteMapMode = "transit" | "walking";

export type RouteMapMarkerKind =
  "origin" | "boarding" | "transfer" | "alighting" | "destination" | "waypoint";

export type RouteMapLeg = Readonly<{
  legId: string;
  stepId: string;
  mode: RouteMapMode;
  label: string;
  geometryState: GeometryState;
  coordinates: readonly GeoCoordinate[];
  color?: string;
  evidenceState?: EvidenceState;
  connectionState?: ConnectionState;
}>;

export type RouteMapMarker = Readonly<{
  markerId: string;
  stepId: string;
  kind: RouteMapMarkerKind;
  label: string;
  coordinate: GeoCoordinate;
  geometryState: GeometryState;
  connectionState?: ConnectionState;
}>;

export type RouteMapContextFeature = Readonly<{
  contextId: string;
  mode: RouteMapMode;
  label: string;
  geometryState: GeometryState;
  coordinates: readonly GeoCoordinate[];
  evidenceState?: EvidenceState;
  connectionState?: ConnectionState;
}>;

export type RouteMapContext = Readonly<{
  routeId: string;
  scope: "selected-route-neighborhood";
  features: readonly RouteMapContextFeature[];
}>;

export type RouteMapAttribution = Readonly<{
  id: string;
  label: string;
  href?: string;
}>;

export type RouteMapData = Readonly<{
  routeId: string;
  legs: readonly RouteMapLeg[];
  markers: readonly RouteMapMarker[];
  attributions: readonly RouteMapAttribution[];
  context?: RouteMapContext;
}>;

export type RouteMapLineProperties = Readonly<{
  featureKind: "route-leg" | "context";
  routeId: string;
  stepId?: string;
  legId?: string;
  contextId?: string;
  mode: RouteMapMode;
  geometryState: GeometryState;
  lineStyle: "solid" | "dashed";
  label: string;
  color?: string;
  evidenceState?: EvidenceState;
  connectionState?: ConnectionState;
}>;

export type RouteMapMarkerProperties = Readonly<{
  featureKind: "decision-marker";
  routeId: string;
  markerId: string;
  stepId: string;
  kind: RouteMapMarkerKind;
  geometryState: GeometryState;
  connectionState?: ConnectionState;
  label: string;
}>;

export type RouteMapLineFeature = Readonly<{
  type: "Feature";
  id: string;
  geometry: Readonly<{
    type: "LineString";
    coordinates: readonly GeoCoordinate[];
  }>;
  properties: RouteMapLineProperties;
}>;

export type RouteMapMarkerFeature = Readonly<{
  type: "Feature";
  id: string;
  geometry: Readonly<{
    type: "Point";
    coordinates: GeoCoordinate;
  }>;
  properties: RouteMapMarkerProperties;
}>;

export type RouteMapFeatureCollection<TFeature> = Readonly<{
  type: "FeatureCollection";
  features: readonly TFeature[];
}>;

export type RouteMapLimitationCode =
  | "geometry-unavailable"
  | "geometry-limited"
  | "walking-geometry-unavailable"
  | "walking-not-routable"
  | "marker-unavailable"
  | "context-geometry-unavailable";

export type RouteMapLimitation = Readonly<{
  code: RouteMapLimitationCode;
  label: string;
  stepId?: string;
  markerId?: string;
  contextId?: string;
}>;

export type RouteMapPayload = Readonly<{
  routeId: string;
  state: "supported" | "limited" | "unavailable";
  selectedRoute: RouteMapFeatureCollection<RouteMapLineFeature>;
  decisionMarkers: RouteMapFeatureCollection<RouteMapMarkerFeature>;
  context: RouteMapFeatureCollection<RouteMapLineFeature>;
  attributions: readonly RouteMapAttribution[];
  limitations: readonly RouteMapLimitation[];
}>;

export type RouteMapValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type RouteMapValidationResult =
  | Readonly<{ state: "valid"; data: RouteMapData }>
  | Readonly<{
      state: "invalid";
      issues: readonly RouteMapValidationIssue[];
      message: string;
      recoveryAction: string;
    }>;

export type RouteMapPreparation =
  | Readonly<{
      state: "valid";
      data: RouteMapData;
      payload: RouteMapPayload;
    }>
  | Readonly<{
      state: "invalid";
      issues: readonly RouteMapValidationIssue[];
      message: string;
      recoveryAction: string;
    }>;

export { validateRouteMapData };

export function prepareRouteMapData(input: unknown): RouteMapPreparation {
  const validation = validateRouteMapData(input);
  if (validation.state === "invalid") {
    return validation;
  }
  return {
    state: "valid",
    data: validation.data,
    payload: createRouteMapPayload(validation.data),
  };
}

export function createRouteMapPayload(data: RouteMapData): RouteMapPayload {
  const selectedFeatures: RouteMapLineFeature[] = [];
  const markerFeatures: RouteMapMarkerFeature[] = [];
  const contextFeatures: RouteMapLineFeature[] = [];
  const limitations: RouteMapLimitation[] = [];

  for (const leg of data.legs) {
    if (isRenderableLeg(leg)) {
      selectedFeatures.push({
        type: "Feature",
        id: `leg:${data.routeId}:${leg.legId}`,
        geometry: { type: "LineString", coordinates: leg.coordinates },
        properties: {
          featureKind: "route-leg",
          routeId: data.routeId,
          stepId: leg.stepId,
          legId: leg.legId,
          mode: leg.mode,
          geometryState: leg.geometryState,
          lineStyle: leg.mode === "transit" ? "solid" : "dashed",
          label: leg.label,
          ...(leg.color ? { color: leg.color } : {}),
          ...(leg.evidenceState ? { evidenceState: leg.evidenceState } : {}),
          ...(leg.connectionState
            ? { connectionState: leg.connectionState }
            : {}),
        },
      });
      if (leg.geometryState === "limited") {
        limitations.push({
          code: "geometry-limited",
          label: leg.label,
          stepId: leg.stepId,
        });
      }
      continue;
    }

    limitations.push({
      code: getLegLimitationCode(leg),
      label: leg.label,
      stepId: leg.stepId,
    });
  }

  for (const marker of data.markers) {
    if (
      marker.geometryState === "supported" ||
      marker.geometryState === "limited"
    ) {
      markerFeatures.push({
        type: "Feature",
        id: `marker:${data.routeId}:${marker.markerId}`,
        geometry: { type: "Point", coordinates: marker.coordinate },
        properties: {
          featureKind: "decision-marker",
          routeId: data.routeId,
          markerId: marker.markerId,
          stepId: marker.stepId,
          kind: marker.kind,
          geometryState: marker.geometryState,
          ...(marker.connectionState
            ? { connectionState: marker.connectionState }
            : {}),
          label: marker.label,
        },
      });
    } else {
      limitations.push({
        code: "marker-unavailable",
        label: marker.label,
        markerId: marker.markerId,
        stepId: marker.stepId,
      });
    }
  }

  for (const feature of data.context?.features ?? []) {
    if (isRenderableContextFeature(feature)) {
      contextFeatures.push({
        type: "Feature",
        id: `context:${data.routeId}:${feature.contextId}`,
        geometry: { type: "LineString", coordinates: feature.coordinates },
        properties: {
          featureKind: "context",
          routeId: data.routeId,
          contextId: feature.contextId,
          mode: feature.mode,
          geometryState: feature.geometryState,
          lineStyle: feature.mode === "transit" ? "solid" : "dashed",
          label: feature.label,
          ...(feature.evidenceState
            ? { evidenceState: feature.evidenceState }
            : {}),
          ...(feature.connectionState
            ? { connectionState: feature.connectionState }
            : {}),
        },
      });
    } else {
      limitations.push({
        code: "context-geometry-unavailable",
        label: feature.label,
        contextId: feature.contextId,
      });
    }
  }

  const hasLimitedFeature = selectedFeatures.some(
    (feature) => feature.properties.geometryState === "limited",
  );
  const state =
    selectedFeatures.length === 0
      ? "unavailable"
      : limitations.length > 0 || hasLimitedFeature
        ? "limited"
        : "supported";
  return {
    routeId: data.routeId,
    state,
    selectedRoute: { type: "FeatureCollection", features: selectedFeatures },
    decisionMarkers: { type: "FeatureCollection", features: markerFeatures },
    context: { type: "FeatureCollection", features: contextFeatures },
    attributions: data.attributions,
    limitations,
  };
}

function isRenderableLeg(leg: RouteMapLeg): boolean {
  if (
    (leg.geometryState !== "supported" && leg.geometryState !== "limited") ||
    leg.coordinates.length < 2
  ) {
    return false;
  }
  if (
    leg.connectionState === "no-edge" ||
    leg.connectionState === "review-only"
  ) {
    return false;
  }
  return (
    leg.mode !== "walking" ||
    (leg.connectionState === "routable" &&
      leg.evidenceState !== "Unknown" &&
      leg.evidenceState !== "Perlu dicek")
  );
}

function isRenderableContextFeature(feature: RouteMapContextFeature): boolean {
  if (
    (feature.geometryState !== "supported" &&
      feature.geometryState !== "limited") ||
    feature.coordinates.length < 2
  ) {
    return false;
  }
  if (
    feature.connectionState === "no-edge" ||
    feature.connectionState === "review-only"
  ) {
    return false;
  }
  return (
    feature.mode !== "walking" ||
    (feature.connectionState === "routable" &&
      feature.evidenceState !== "Unknown" &&
      feature.evidenceState !== "Perlu dicek")
  );
}

function getLegLimitationCode(leg: RouteMapLeg): RouteMapLimitationCode {
  if (leg.mode === "walking") {
    if (
      leg.geometryState === "unknown" ||
      leg.geometryState === "unavailable" ||
      leg.coordinates.length < 2
    ) {
      return "walking-geometry-unavailable";
    }
    if (
      leg.evidenceState === "Unknown" ||
      leg.evidenceState === "Perlu dicek" ||
      leg.connectionState !== "routable"
    ) {
      return "walking-not-routable";
    }
  }
  return "geometry-unavailable";
}
