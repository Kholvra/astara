import type { FilterSpecification, LayerSpecification } from "maplibre-gl";

import type { RouteMapPayload } from "~/core/geojson/routeGeometry";
import type { GeoCoordinate } from "~/core/geojson/geometry";

export const MAP_SOURCE_IDS = {
  selectedRoute: "astara-selected-route",
  context: "astara-route-context",
  decisionMarkers: "astara-decision-markers",
} as const;

export const MAP_LAYER_IDS = {
  contextLine: "astara-context-line",
  transitLine: "astara-transit-line",
  walkingLine: "astara-walking-line",
  activeTransitLine: "astara-active-transit-line",
  activeWalkingLine: "astara-active-walking-line",
  decisionMarker: "astara-decision-marker",
  decisionMarkerLabel: "astara-decision-marker-label",
  activeMarker: "astara-active-marker",
} as const;

export const MAP_LEGEND = [
  {
    id: "transit",
    label: "Transit — garis solid",
    lineStyle: "solid",
  },
  {
    id: "walking",
    label: "Jalan kaki — garis dashed",
    lineStyle: "dashed",
  },
  {
    id: "limited",
    label: "Data terbatas — detail perlu dicek",
    lineStyle: "limited",
  },
] as const;

const NO_ACTIVE_STEP = "__astara-no-active-step__";

export function createActiveStepFilter(stepId?: string): FilterSpecification {
  return ["==", ["get", "stepId"], stepId ?? NO_ACTIVE_STEP];
}

export function createActiveModeFilter(
  mode: "transit" | "walking",
  stepId?: string,
): FilterSpecification {
  return [
    "all",
    ["==", ["get", "mode"], mode],
    ["==", ["get", "stepId"], stepId ?? NO_ACTIVE_STEP],
  ];
}

export function createMapLayerSpecifications(): readonly LayerSpecification[] {
  const routeLineFilter = (
    mode: "transit" | "walking",
  ): FilterSpecification => [
    "all",
    ["==", ["get", "featureKind"], "route-leg"],
    ["==", ["get", "mode"], mode],
  ];
  return [
    {
      id: MAP_LAYER_IDS.contextLine,
      type: "line",
      source: MAP_SOURCE_IDS.context,
      paint: {
        "line-color": "#64748b",
        "line-width": 2,
        "line-opacity": 0.55,
        "line-dasharray": [1, 2],
      },
    },
    {
      id: MAP_LAYER_IDS.transitLine,
      type: "line",
      source: MAP_SOURCE_IDS.selectedRoute,
      filter: routeLineFilter("transit"),
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#0f766e"],
        "line-width": 5,
        "line-opacity": 0.95,
      },
    },
    {
      id: MAP_LAYER_IDS.walkingLine,
      type: "line",
      source: MAP_SOURCE_IDS.selectedRoute,
      filter: routeLineFilter("walking"),
      paint: {
        "line-color": "#334155",
        "line-width": 4,
        "line-opacity": 0.9,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: MAP_LAYER_IDS.activeTransitLine,
      type: "line",
      source: MAP_SOURCE_IDS.selectedRoute,
      filter: createActiveModeFilter("transit"),
      paint: {
        "line-color": "#f97316",
        "line-width": 8,
        "line-opacity": 0.85,
      },
    },
    {
      id: MAP_LAYER_IDS.activeWalkingLine,
      type: "line",
      source: MAP_SOURCE_IDS.selectedRoute,
      filter: createActiveModeFilter("walking"),
      paint: {
        "line-color": "#f97316",
        "line-width": 7,
        "line-opacity": 0.85,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: MAP_LAYER_IDS.decisionMarker,
      type: "circle",
      source: MAP_SOURCE_IDS.decisionMarkers,
      paint: {
        "circle-color": "#ffffff",
        "circle-radius": 8,
        "circle-stroke-color": "#0f766e",
        "circle-stroke-width": 3,
      },
    },
    {
      id: MAP_LAYER_IDS.decisionMarkerLabel,
      type: "symbol",
      source: MAP_SOURCE_IDS.decisionMarkers,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    },
    {
      id: MAP_LAYER_IDS.activeMarker,
      type: "circle",
      source: MAP_SOURCE_IDS.decisionMarkers,
      filter: createActiveStepFilter(),
      paint: {
        "circle-color": "#f97316",
        "circle-radius": 12,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
      },
    },
  ] satisfies readonly LayerSpecification[];
}

export function getMapFocusCoordinates(
  payload: RouteMapPayload,
  stepId?: string,
): readonly GeoCoordinate[] | undefined {
  if (!stepId) {
    return undefined;
  }
  const line = payload.selectedRoute.features.find(
    (feature) => feature.properties.stepId === stepId,
  );
  if (line) {
    return line.geometry.coordinates;
  }
  const marker = payload.decisionMarkers.features.find(
    (feature) => feature.properties.stepId === stepId,
  );
  return marker ? [marker.geometry.coordinates] : undefined;
}

export function getMapRouteStateLabel(
  state: RouteMapPayload["state"] | "invalid",
): string {
  switch (state) {
    case "supported":
      return "Rute tersedia";
    case "limited":
      return "Data peta terbatas";
    case "unavailable":
      return "Jalur peta belum tersedia";
    case "invalid":
      return "Geometri rute tidak dapat ditampilkan";
  }
}

export function getMapMarkerStatusLabel(
  geometryState: "supported" | "limited" | "unknown" | "unavailable",
  connectionState?: "routable" | "no-edge" | "review-only",
): string {
  if (connectionState === "no-edge" || connectionState === "review-only") {
    return "Koneksi belum tersedia";
  }
  if (geometryState === "unknown" || geometryState === "unavailable") {
    return "Lokasi perlu dicek";
  }
  if (geometryState === "limited") {
    return "Data terbatas";
  }
  return "Titik rute";
}
