import type { GeoCoordinate } from "~/core/geojson/geometry";
import type { GtfsTime } from "~/core/ingestion/gtfsTime";
import type {
  ConnectionState,
  EvidenceState,
  Freshness,
  GtfsCoverage,
  GtfsRecordLineage,
  GtfsSnapshot,
} from "~/core/ingestion/gtfsTypes";
import type { TripPlanningInput } from "~/core/timing/tripTiming";
import type { TransferEdge } from "~/core/transfer/transferTypes";

export const DEFAULT_SUPPORTED_ROUTE_TYPES = [3] as const;
export const DEFAULT_MAX_TRANSFERS = 3;
export const DEFAULT_MAX_SEARCH_STATES = 5_000;
export const DEFAULT_ROUTE_RULES_VERSION = "route-engine-v1";
export const DEFAULT_CANDIDATE_CONFIGURATION_HASH = "route-engine-default-v1";

export type RouteEvidenceRank = "complete" | "limited" | "unknown";

export type RouteRankingCriterion =
  | "transfer-count"
  | "decision-points"
  | "walking-distance"
  | "expected-duration"
  | "evidence-rank"
  | "route-id"
  | "only-eligible";

export type RouteLineage = Readonly<{
  snapshotId: string;
  sourceUrl: string;
  acquiredAt: string;
  contentHash: string;
  coverage: GtfsCoverage;
  freshness: Freshness;
  feedVersion?: string;
  staticDemoNote?: string;
}>;

export type RouteGeometryReference = Readonly<{
  state: "supported" | "limited" | "unavailable";
  shapeId?: string;
  coordinates: readonly GeoCoordinate[];
  fromStopSequence: number;
  toStopSequence: number;
}>;

export type RouteLegTiming =
  | Readonly<{
      semantics: "exact";
      departure: GtfsTime;
      arrival: GtfsTime;
    }>
  | Readonly<{
      semantics: "interval";
      start: GtfsTime;
      end: GtfsTime;
      headwaySeconds: number;
    }>
  | Readonly<{
      semantics: "unavailable";
    }>;

export type TransitRouteLeg = Readonly<{
  kind: "transit";
  legId: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  tripId: string;
  serviceId: string;
  headsign?: string;
  directionId?: number;
  fromStopId: string;
  toStopId: string;
  stopIds: readonly string[];
  timing: RouteLegTiming;
  durationSeconds?: number;
  geometry: RouteGeometryReference;
  lineage: readonly GtfsRecordLineage[];
}>;

export type WalkingRouteLeg = Readonly<{
  kind: "walking";
  legId: string;
  edgeId: string;
  fromStopId: string;
  toStopId: string;
  distanceMeters?: number;
  durationSeconds?: number;
  pathId?: string;
  coordinates: readonly GeoCoordinate[];
  evidenceState: EvidenceState;
  connectionState: ConnectionState;
  evidenceReferences: readonly string[];
  limitations: readonly string[];
}>;

export type RouteLeg = TransitRouteLeg | WalkingRouteLeg;

export type JourneyTiming =
  | Readonly<{
      semantics: "exact";
      departure: GtfsTime;
      arrival: GtfsTime;
      expectedDurationSeconds: number;
    }>
  | Readonly<{
      semantics: "interval";
      start: GtfsTime;
      end: GtfsTime;
      headwaySeconds: number;
      expectedDurationSeconds?: number;
    }>
  | Readonly<{
      semantics: "estimate";
      expectedDurationSeconds?: number;
    }>
  | Readonly<{
      semantics: "unavailable";
    }>;

export type JourneyWalkingFacts = Readonly<{
  totalDistanceMeters?: number;
  label: EvidenceState;
  legs: readonly WalkingRouteLeg[];
}>;

export type JourneyGeometryFacts = Readonly<{
  state: "supported" | "limited" | "unavailable";
  legs: readonly RouteGeometryReference[];
}>;

export type ServiceDirectionFact = Readonly<{
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  headsign?: string;
  directionId?: number;
}>;

export type BoardingAlightingFacts = Readonly<{
  originStopId: string;
  destinationStopId: string;
  stopIds: readonly string[];
}>;

export type JourneyLimitationFacts = Readonly<{
  freshness: Freshness;
  access: EvidenceState;
  notes: readonly string[];
}>;

export type JourneyExplanation = Readonly<{
  decidingCriterion: RouteRankingCriterion;
  tieBreakApplied: boolean;
  reasonCodes: readonly string[];
  sourceFields: readonly string[];
  sourceValues: Readonly<Record<string, string>>;
}>;

export type JourneyRoute = Readonly<{
  routeId: string;
  status: "routed" | "limited";
  originStopId: string;
  destinationStopId: string;
  legs: readonly RouteLeg[];
  boardingAlighting: BoardingAlightingFacts;
  serviceDirections: readonly ServiceDirectionFact[];
  transferCount: number;
  decisionPointCount: number;
  walking: JourneyWalkingFacts;
  timing: JourneyTiming;
  geometry: JourneyGeometryFacts;
  evidenceRank: RouteEvidenceRank;
  accessEvidence: EvidenceState;
  limitation: JourneyLimitationFacts;
  lineage: RouteLineage;
  explanation: JourneyExplanation;
}>;

export type RouteScore = Readonly<{
  routeId: string;
  transferCount: number;
  decisionPointCount: number;
  walkingDistanceMeters?: number;
  expectedDurationSeconds?: number;
  evidenceRank: RouteEvidenceRank;
}>;

export type RouteCandidate = Readonly<{
  journey: JourneyRoute;
  score: RouteScore;
}>;

export type RouteEngineConfig = Readonly<{
  supportedRouteTypes?: readonly number[];
  maxTransfers?: number;
  maxSearchStates?: number;
  routeRulesVersion?: string;
  candidateConfigurationHash?: string;
  freshness?: Freshness;
  staticDemoNote?: string;
}>;

export type RouteSelectionRequest = Readonly<{
  snapshot?: GtfsSnapshot;
  planning: TripPlanningInput;
  transferEdges: readonly TransferEdge[];
  config?: RouteEngineConfig;
}>;

export type RouteSelectionErrorCode =
  | "NO_ACTIVE_SNAPSHOT"
  | "INVALID_PLANNING_INPUT"
  | "UNKNOWN_STOP"
  | "SAME_ORIGIN_DESTINATION"
  | "UNSUPPORTED_SCORING_POLICY"
  | "SNAPSHOT_MISMATCH"
  | "UNSUPPORTED_NETWORK"
  | "NO_ELIGIBLE_JOURNEY"
  | "SEARCH_EXHAUSTED";

export type RouteSelectionFailure = Readonly<{
  state:
    | "invalid-input"
    | "unavailable"
    | "unsupported"
    | "no-route"
    | "limited-data";
  code: RouteSelectionErrorCode;
  message: string;
  recoveryAction: string;
}>;

export type RouteSelectionReason = Readonly<{
  policy: "fixed-explainable-v1";
  decidingCriterion: RouteRankingCriterion;
  tieBreakApplied: boolean;
  comparedAgainstRouteId?: string;
  score: RouteScore;
  reasonCodes: readonly string[];
  sourceFields: readonly string[];
  sourceValues: Readonly<Record<string, string>>;
}>;

export type RouteSelectionSuccess = Readonly<{
  state: "selected";
  primary: JourneyRoute;
  candidates: readonly RouteCandidate[];
  reason: RouteSelectionReason;
  lineage: RouteLineage;
  configuration: Readonly<{
    routeRulesVersion: string;
    candidateConfigurationHash: string;
  }>;
}>;

export type RouteSelectionResult =
  RouteSelectionSuccess | RouteSelectionFailure;

export type RouteCandidateBuildResult =
  | Readonly<{
      state: "ready";
      candidates: readonly RouteCandidate[];
      lineage: RouteLineage;
    }>
  | Readonly<{
      state: "failed";
      failure: RouteSelectionFailure;
    }>;

export type RouteEngineIndex = Readonly<{
  snapshot: GtfsSnapshot;
  stopsById: ReadonlyMap<string, GtfsSnapshot["stops"][number]>;
  routesById: ReadonlyMap<string, GtfsSnapshot["routes"][number]>;
  tripsById: ReadonlyMap<string, GtfsSnapshot["trips"][number]>;
  stopTimesByTrip: ReadonlyMap<
    string,
    readonly GtfsSnapshot["stopTimes"][number][]
  >;
  frequenciesByTrip: ReadonlyMap<
    string,
    readonly GtfsSnapshot["frequencies"][number][]
  >;
}>;
