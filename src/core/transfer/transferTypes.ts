import type { GeoCoordinate } from "~/core/geojson/geometry";
import type {
  ConnectionState,
  EvidenceState,
  GtfsSnapshot,
} from "~/core/ingestion/gtfsTypes";

export type TransferEndpoint = Readonly<{
  stopId: string;
  transitServiceId?: string;
}>;

export type TransferCostPolicy = Readonly<{
  safetyBufferSeconds: number;
  cognitiveDecisionCostSeconds: number;
}>;

export type TransferWalkingPath = Readonly<{
  pathId: string;
  coordinates: readonly GeoCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
}>;

export type TransferBarrierState = "clear" | "unknown" | "present";

export type TransferWalkingEvidenceStatus =
  | "verified"
  | "limited"
  | "unknown"
  | "stale"
  | "contradictory"
  | "unavailable";

export type TransferWalkingEvidence = Readonly<{
  source?: string;
  evidenceDate?: string;
  status: TransferWalkingEvidenceStatus;
  path?: TransferWalkingPath;
  barrierState?: TransferBarrierState;
  limitation?: string;
}>;

export type TransferProximityReviewCandidate = Readonly<{
  distanceMeters: number;
  source?: string;
}>;

export type TransferEvidenceSource =
  | "explicit-gtfs-transfer"
  | "shared-station-platform"
  | "verified-walking-graph";

export type TransferEvidenceReference = Readonly<{
  source: TransferEvidenceSource;
  referenceId: string;
  evidenceDate?: string;
}>;

export type TransferCostBreakdown = Readonly<{
  walkingDistanceMeters?: number;
  walkingDurationSeconds?: number;
  safetyBufferSeconds: number;
  transferDurationSeconds?: number;
  cognitiveDecisionCostSeconds: number;
  minimumTransferTimeSeconds?: number;
}>;

export type TransferReviewCandidate = Readonly<{
  kind: "proximity";
  fromStopId: string;
  toStopId: string;
  distanceMeters: number;
  source?: string;
  eligibleForRouting: false;
  reason: string;
}>;

export type TransferEdge = Readonly<{
  edgeId: string;
  from: TransferEndpoint;
  to: TransferEndpoint;
  evidenceSource?: TransferEvidenceSource;
  evidenceReferences: readonly TransferEvidenceReference[];
  evidenceState: EvidenceState;
  connectionState: ConnectionState;
  eligibleForRouting: boolean;
  barrierState: TransferBarrierState;
  walkingPath?: TransferWalkingPath;
  costs: TransferCostBreakdown;
  limitations: readonly string[];
  reviewCandidate?: TransferReviewCandidate;
}>;

export type TransferEvaluationRequest = Readonly<{
  snapshot: GtfsSnapshot | undefined;
  from: TransferEndpoint;
  to: TransferEndpoint;
  walkingEvidence?: TransferWalkingEvidence;
  proximityCandidate?: TransferProximityReviewCandidate;
  costPolicy: TransferCostPolicy;
}>;

export type TransferEvaluationErrorCode =
  | "NO_ACTIVE_SNAPSHOT"
  | "UNKNOWN_ENDPOINT"
  | "SNAPSHOT_MISMATCH"
  | "INVALID_COST_POLICY";

export type TransferEvaluationFailure = Readonly<{
  kind: "failure";
  error: Readonly<{
    code: TransferEvaluationErrorCode;
    message: string;
    endpoint?: "from" | "to";
  }>;
}>;

export type TransferEvaluationSuccess = Readonly<{
  kind: "edge";
  edge: TransferEdge;
}>;

export type TransferEvaluation =
  TransferEvaluationFailure | TransferEvaluationSuccess;
