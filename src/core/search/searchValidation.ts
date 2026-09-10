import { isGeoCoordinate } from "~/core/geojson/geometry";
import type {
  LocationType,
  PlatformChoice,
  SearchResultItem,
} from "./search.types";

const LOCATION_TYPES = new Set<LocationType>([
  "stop_or_route",
  "place_or_address",
  "current_location",
]);
const LOCAL_SOURCES = new Set(["gtfs_local", "alias"]);
const VERIFICATION_STATUSES = new Set([
  "Terverifikasi",
  "Data terbatas",
  "Perlu dicek",
]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);

export function isSearchResultItem(value: unknown): value is SearchResultItem {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    typeof value.type === "string" &&
    LOCATION_TYPES.has(value.type as LocationType) &&
    isGeoCoordinate(value.coordinates) &&
    typeof value.source === "string" &&
    LOCAL_SOURCES.has(value.source) &&
    typeof value.verification === "string" &&
    VERIFICATION_STATUSES.has(value.verification) &&
    typeof value.confidence === "string" &&
    CONFIDENCE_LEVELS.has(value.confidence)
  );
}

export function isPlatformChoice(value: unknown): value is PlatformChoice {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.label) &&
    isGeoCoordinate(value.coordinates)
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
