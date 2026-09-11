import { isGeoCoordinate, type GeoCoordinate } from "~/core/geojson/geometry";

import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import {
  type CurrentLocationReading,
  type CurrentLocationResolution,
  type DistanceBasis,
  type SearchResultItem,
} from "./search.types";
import { isRecord, isSearchResultItem } from "./searchValidation";

export const MAX_CURRENT_LOCATION_ACCURACY_METERS = 200;
export const MAX_CURRENT_LOCATION_DISTANCE_METERS = 1_500;

export type CurrentLocationResolutionOptions = {
  maxAccuracyMeters?: number;
  maxDistanceMeters?: number;
  walkingDistanceMetersByStopId?: Readonly<Record<string, number>>;
};

type NearbyCandidate = {
  item: SearchResultItem;
  straightLineMeters: number;
  walkingMeters?: number;
};

export function resolveCurrentLocation(
  value: unknown,
  items: readonly SearchResultItem[] = MOCK_SEARCH_ITEMS,
  options: CurrentLocationResolutionOptions = {},
): CurrentLocationResolution {
  if (!isCurrentLocationReading(value)) {
    return {
      state: "invalid",
      message:
        "Lokasi perangkat tidak terbaca. Coba lagi atau pilih halte langsung.",
    };
  }

  const maxAccuracy = finiteNonNegativeOrDefault(
    options.maxAccuracyMeters,
    MAX_CURRENT_LOCATION_ACCURACY_METERS,
  );
  if (value.accuracyMeters > maxAccuracy) {
    return {
      state: "imprecise",
      message:
        "Akurasi GPS agak meleset (>200m). Pastikan posisimu atau pilih halte langsung.",
    };
  }

  const maxDistance = finiteNonNegativeOrDefault(
    options.maxDistanceMeters,
    MAX_CURRENT_LOCATION_DISTANCE_METERS,
  );
  const nearby = items
    .filter(isAutoSelectableStop)
    .map((item) => ({
      item,
      straightLineMeters: calculateDistanceMeters(
        value.coordinates,
        item.coordinates,
      ),
    }))
    .filter((candidate) => candidate.straightLineMeters <= maxDistance);

  if (nearby.length === 0) {
    return {
      state: "no_nearby_stop",
      message:
        "Belum ada halte TransJakarta terdekat (<1,5 km) dari posisimu saat ini.",
    };
  }

  const walkingCandidates: Array<NearbyCandidate & { walkingMeters: number }> =
    nearby.flatMap((candidate) => {
      const walkingDistance =
        options.walkingDistanceMetersByStopId?.[candidate.item.id];
      if (
        typeof walkingDistance !== "number" ||
        !Number.isFinite(walkingDistance) ||
        walkingDistance < 0
      ) {
        return [];
      }

      return [{ ...candidate, walkingMeters: walkingDistance }];
    });
  const hasWalkingEvidence = walkingCandidates.length > 0;
  const ranked: readonly NearbyCandidate[] = hasWalkingEvidence
    ? walkingCandidates
    : nearby;
  const selected = [...ranked].sort((left, right) => {
    const leftDistance = hasWalkingEvidence
      ? (left.walkingMeters ?? Infinity)
      : left.straightLineMeters;
    const rightDistance = hasWalkingEvidence
      ? (right.walkingMeters ?? Infinity)
      : right.straightLineMeters;

    return (
      leftDistance - rightDistance ||
      left.straightLineMeters - right.straightLineMeters ||
      left.item.id.localeCompare(right.item.id)
    );
  })[0];

  if (!selected) {
    return {
      state: "no_nearby_stop",
      message:
        "Belum ada halte TransJakarta terdekat (<1,5 km) dari posisimu saat ini.",
    };
  }

  const distanceBasis: DistanceBasis = hasWalkingEvidence
    ? "walking_evidence"
    : "straight_line_only";
  const distanceMeters = hasWalkingEvidence
    ? (selected.walkingMeters ?? selected.straightLineMeters)
    : selected.straightLineMeters;

  return {
    state: "selected",
    location: {
      id: selected.item.id,
      name: selected.item.title,
      type: "current_location",
      coordinates: selected.item.coordinates,
      source: "session_gps",
      confidence: "medium",
      verification: selected.item.verification,
      distanceBasis,
    },
    distanceMeters,
    distanceBasis,
  };
}

export function calculateDistanceMeters(
  first: GeoCoordinate,
  second: GeoCoordinate,
): number {
  const earthRadiusMeters = 6_371_008.8;
  const latitudeDelta = toRadians(second[1] - first[1]);
  const longitudeDelta = toRadians(second[0] - first[0]);
  const firstLatitude = toRadians(first[1]);
  const secondLatitude = toRadians(second[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function isCurrentLocationReading(
  value: unknown,
): value is CurrentLocationReading {
  if (!isRecord(value)) return false;

  return (
    isGeoCoordinate(value.coordinates) &&
    typeof value.accuracyMeters === "number" &&
    Number.isFinite(value.accuracyMeters) &&
    value.accuracyMeters >= 0
  );
}

function isAutoSelectableStop(value: SearchResultItem): boolean {
  return (
    isSearchResultItem(value) &&
    value.type === "stop_or_route" &&
    value.confidence !== "low" &&
    value.requiresPlatformChoice !== true &&
    (value.platforms?.length ?? 0) === 0
  );
}

function finiteNonNegativeOrDefault(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
