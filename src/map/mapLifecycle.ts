import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  NavigationControl,
  type Map as MapLibreMap,
} from "maplibre-gl";

import {
  getRouteMapBounds,
  type RouteMapPayload,
} from "~/core/geojson/routeGeometry";
import type { GeoCoordinate } from "~/core/geojson/geometry";
import {
  createActiveModeFilter,
  createActiveStepFilter,
  createMapLayerSpecifications,
  getMapFocusCoordinates,
  MAP_LAYER_IDS,
  MAP_SOURCE_IDS,
} from "./mapPresentation";

export const EMPTY_MAP_PAYLOAD = {
  routeId: "",
  state: "unavailable",
  selectedRoute: { type: "FeatureCollection", features: [] },
  decisionMarkers: { type: "FeatureCollection", features: [] },
  context: { type: "FeatureCollection", features: [] },
  attributions: [],
  limitations: [],
} satisfies RouteMapPayload;

const sourceSyncQueues = new WeakMap<MapLibreMap, Promise<void>>();

export function installMapSourcesAndLayers(
  map: MapLibreMap,
  payload: RouteMapPayload,
): void {
  map.addControl(new AttributionControl({ compact: true }), "bottom-right");
  map.addControl(new NavigationControl({ showCompass: false }), "top-right");
  map.addSource(MAP_SOURCE_IDS.selectedRoute, {
    type: "geojson",
    data: toMapGeoJson(payload.selectedRoute),
  });
  map.addSource(MAP_SOURCE_IDS.context, {
    type: "geojson",
    data: toMapGeoJson(payload.context),
  });
  map.addSource(MAP_SOURCE_IDS.decisionMarkers, {
    type: "geojson",
    data: toMapGeoJson(payload.decisionMarkers),
  });
  for (const layer of createMapLayerSpecifications()) {
    map.addLayer(layer);
  }
}

export async function syncMapSources(
  map: MapLibreMap,
  payload: RouteMapPayload,
  canApply: () => boolean = () => true,
): Promise<void> {
  const previous = sourceSyncQueues.get(map) ?? Promise.resolve();
  const queued = previous
    .catch(() => undefined)
    .then(() => updateMapSources(map, payload, canApply));
  sourceSyncQueues.set(map, queued);
  void queued
    .finally(() => {
      if (sourceSyncQueues.get(map) === queued) {
        sourceSyncQueues.delete(map);
      }
    })
    .catch(() => undefined);
  return queued;
}

async function updateMapSources(
  map: MapLibreMap,
  payload: RouteMapPayload,
  canApply: () => boolean,
): Promise<void> {
  const updates = [
    { id: MAP_SOURCE_IDS.selectedRoute, data: payload.selectedRoute },
    { id: MAP_SOURCE_IDS.context, data: payload.context },
    { id: MAP_SOURCE_IDS.decisionMarkers, data: payload.decisionMarkers },
  ] as const;
  for (const update of updates) {
    if (!canApply()) {
      return;
    }
    const source = map.getSource(update.id);
    if (!(source instanceof GeoJSONSource)) {
      throw new Error("Map source is unavailable.");
    }
    await source.setData(toMapGeoJson(update.data));
  }
}

export function applyActiveStep(
  map: MapLibreMap,
  activeStepId: string | undefined,
): void {
  map.setFilter(
    MAP_LAYER_IDS.activeTransitLine,
    createActiveModeFilter("transit", activeStepId),
  );
  map.setFilter(
    MAP_LAYER_IDS.activeWalkingLine,
    createActiveModeFilter("walking", activeStepId),
  );
  map.setFilter(
    MAP_LAYER_IDS.activeMarker,
    createActiveStepFilter(activeStepId),
  );
}

export function selectMapStep(
  stepId: string,
  payload: RouteMapPayload | undefined,
  map: MapLibreMap | null,
  mapLoaded: boolean,
  onStepSelect: ((stepId: string) => void) | undefined,
): void {
  if (!payload || !getMapFocusCoordinates(payload, stepId)) {
    return;
  }
  onStepSelect?.(stepId);
  if (!map || !mapLoaded) {
    return;
  }
  applyActiveStep(map, stepId);
  const coordinates = getMapFocusCoordinates(payload, stepId);
  if (coordinates) {
    focusMap(map, coordinates);
  }
}

export function focusPayload(map: MapLibreMap, payload: RouteMapPayload): void {
  const bounds = getRouteMapBounds(payload);
  if (!bounds) {
    return;
  }
  const [southWest, northEast] = bounds;
  if (southWest[0] === northEast[0] && southWest[1] === northEast[1]) {
    focusMap(map, [southWest]);
    return;
  }
  map.fitBounds(
    new LngLatBounds(
      toMutableCoordinate(southWest),
      toMutableCoordinate(northEast),
    ),
    {
      padding: 48,
      maxZoom: 15,
      duration: prefersReducedMotion() ? 0 : 300,
    },
  );
}

export function focusMap(
  map: MapLibreMap,
  coordinates: readonly GeoCoordinate[],
): void {
  const first = coordinates[0];
  if (!first) {
    return;
  }
  if (coordinates.length === 1) {
    map.easeTo({
      center: toMutableCoordinate(first),
      duration: prefersReducedMotion() ? 0 : 300,
    });
    return;
  }
  const firstPoint = toMutableCoordinate(first);
  const bounds = new LngLatBounds(firstPoint, firstPoint);
  for (const coordinate of coordinates.slice(1)) {
    bounds.extend(toMutableCoordinate(coordinate));
  }
  map.fitBounds(bounds, {
    padding: 48,
    maxZoom: 16,
    duration: prefersReducedMotion() ? 0 : 300,
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function toMutableCoordinate(coordinate: GeoCoordinate): [number, number] {
  return [coordinate[0], coordinate[1]];
}

function toMapGeoJson(
  collection:
    RouteMapPayload["selectedRoute"] | RouteMapPayload["decisionMarkers"],
): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry:
      | { type: "LineString"; coordinates: number[][] }
      | { type: "Point"; coordinates: number[] };
    properties: Record<string, unknown>;
  }>;
} {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      type: "Feature",
      id: feature.id,
      geometry:
        feature.geometry.type === "LineString"
          ? {
              type: "LineString",
              coordinates: feature.geometry.coordinates.map(
                ([longitude, latitude]) => [longitude, latitude],
              ),
            }
          : {
              type: "Point",
              coordinates: [
                feature.geometry.coordinates[0],
                feature.geometry.coordinates[1],
              ],
            },
      properties: { ...feature.properties },
    })),
  };
}
