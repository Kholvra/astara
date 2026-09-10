import type { GeoCoordinate } from "./geometry";
import type { RouteMapPayload } from "./routeGeometry";

export function getRouteMapBounds(
  payload: RouteMapPayload,
): readonly [GeoCoordinate, GeoCoordinate] | undefined {
  const coordinates: GeoCoordinate[] = [
    ...payload.selectedRoute.features.flatMap(
      (feature) => feature.geometry.coordinates,
    ),
    ...payload.decisionMarkers.features.map(
      (feature) => feature.geometry.coordinates,
    ),
  ];
  if (coordinates.length === 0) {
    return undefined;
  }

  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;
  for (const [longitude, latitude] of coordinates) {
    minLongitude = Math.min(minLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }
  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}
