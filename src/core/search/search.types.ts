import type { GeoCoordinate } from "~/core/geojson/geometry";

export type LocationType =
  "stop_or_route" | "place_or_address" | "current_location";

export type SearchContext = "origin" | "destination";

export type SearchSource = "gtfs_local" | "alias" | "session_gps";
export type LocalSearchSource = Exclude<SearchSource, "session_gps">;

export type SearchMatchKind =
  | "title_exact"
  | "alias_exact"
  | "route_exact"
  | "title_prefix"
  | "alias_prefix"
  | "route_prefix"
  | "text_contains";

export type VerificationStatus =
  "Terverifikasi" | "Data terbatas" | "Perlu dicek";
export type ConfidenceLevel = "high" | "medium" | "low";

export type PlatformChoice = {
  id: string;
  code: string;
  label: string;
  coordinates: GeoCoordinate;
};

export type PlaceConversion = {
  stopId: string;
  distanceMeters: number;
  walkingEvidence: "supported" | "unverified";
};

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  type: LocationType;
  coordinates: GeoCoordinate;
  source: LocalSearchSource;
  aliases?: readonly string[];
  routes?: readonly string[];
  walkTimeMinutes?: number;
  walkDistanceMeters?: number;
  verification: VerificationStatus;
  confidence: ConfidenceLevel;
  requiresPlatformChoice?: boolean;
  platforms?: readonly PlatformChoice[];
  placeConversion?: PlaceConversion;
};

export type RankedSearchResult = SearchResultItem & {
  matchKind: SearchMatchKind;
};

export type SearchIndex = {
  available: boolean;
  items: readonly SearchResultItem[];
  fallbackItems?: readonly SearchResultItem[];
};

export type SearchQueryOutcome =
  | { state: "idle"; query: ""; results: readonly [] }
  | {
      state: "results";
      query: string;
      results: readonly RankedSearchResult[];
    }
  | {
      state: "no_result";
      query: string;
      alternatives: readonly SearchResultItem[];
    }
  | {
      state: "index_unavailable";
      query: string;
      alternatives: readonly SearchResultItem[];
    };

export type RoutableLocation = {
  id: string;
  name: string;
  type: LocationType;
  coordinates: GeoCoordinate;
  source: SearchSource;
  confidence: ConfidenceLevel;
  verification: VerificationStatus;
  platformCode?: string;
  convertedFromId?: string;
  distanceBasis?: DistanceBasis;
};

export type SearchResolutionOutcome =
  | { state: "selected"; location: RoutableLocation }
  | { state: "platform_confirmation"; item: SearchResultItem }
  | {
      state: "place_conversion_required";
      item: SearchResultItem;
      suggestedStop: SearchResultItem;
      distanceMeters: number;
      walkingEvidence: "supported" | "unverified";
    }
  | { state: "low_confidence_confirmation"; item: SearchResultItem }
  | {
      state: "not_routable";
      item?: SearchResultItem;
      reason:
        | "invalid_identity"
        | "invalid_coordinates"
        | "invalid_platform"
        | "place_conversion_unavailable";
      message: string;
    };

export type CurrentLocationReading = {
  coordinates: GeoCoordinate;
  accuracyMeters: number;
};

export type DistanceBasis = "walking_evidence" | "straight_line_only";

export type CurrentLocationResolution =
  | {
      state: "selected";
      location: RoutableLocation;
      distanceMeters: number;
      distanceBasis: DistanceBasis;
    }
  | { state: "imprecise"; message: string }
  | { state: "invalid"; message: string }
  | { state: "no_nearby_stop"; message: string };

export type SearchEndpointState = {
  origin: RoutableLocation | null;
  destination: RoutableLocation | null;
};

export type SearchSessionState = SearchQueryOutcome | SearchResolutionOutcome;
