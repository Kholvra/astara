export type LocationType = "stop_or_route" | "place_or_address" | "current_location";
export type VerificationStatus = "Terverifikasi" | "Data terbatas" | "Perlu dicek";
export type ConfidenceLevel = "high" | "medium" | "low";

// Kontrak objek yang siap diteruskan ke REQ-001 (ARCH-01 & INV-02)
export type RoutableLocation = {
  id: string;
  name: string;
  coordinates: [number, number]; // Strictly GeoJSON [lng, lat]
  source: "gtfs_local" | "alias" | "session_gps";
  confidence: ConfidenceLevel;
  verification: VerificationStatus;
  platformCode?: string; // Untuk membedakan peron arah jika ambigu (INV-04)
};

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  type: LocationType;
  coordinates: [number, number];
  routes?: string[];
  walkTimeMinutes?: number;
  walkDistanceMeters?: number;
  verification: VerificationStatus;
  confidence: ConfidenceLevel;
  requiresPlatformChoice?: boolean; // Pemicu state confirmation (INV-04)
  platforms?: Array<{
    id: string;
    label: string; // Misal: "Peron 1: Arah Kota" vs "Peron 2: Arah Blok M"
    coordinates: [number, number];
  }>;
};

export type SearchSessionState =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "results"; query: string; results: SearchResultItem[] }
  | { state: "ambiguous_confirmation"; item: SearchResultItem }
  | { state: "no_result"; query: string; alternatives: string[] }
  | { state: "selected"; location: RoutableLocation };