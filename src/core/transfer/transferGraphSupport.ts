import { isGeoCoordinate } from "~/core/geojson/geometry";
import type {
  GtfsSnapshot,
  GtfsStop,
  GtfsTransfer,
} from "~/core/ingestion/gtfsTypes";

import type {
  TransferBarrierState,
  TransferCostBreakdown,
  TransferCostPolicy,
  TransferEdge,
  TransferEndpoint,
  TransferEvaluationFailure,
  TransferEvaluationRequest,
  TransferEvaluationSuccess,
  TransferEvidenceReference,
  TransferEvidenceSource,
  TransferReviewCandidate,
  TransferWalkingEvidence,
  TransferWalkingPath,
} from "./transferTypes";

export const NEGATIVE_TRANSFER_TYPE = 3;
export const VALID_TRANSFER_TYPES = new Set([0, 1, 2, 4, 5]);

export type EdgeFields = Readonly<{
  evidenceSource?: TransferEvidenceSource;
  evidenceReferences: readonly TransferEvidenceReference[];
  evidenceState: TransferEdge["evidenceState"];
  connectionState: TransferEdge["connectionState"];
  barrierState: TransferBarrierState;
  walkingPath?: TransferWalkingPath;
  costs: TransferCostBreakdown;
  limitations: readonly string[];
  reviewCandidate?: TransferReviewCandidate;
}>;

export type StopLookup =
  | Readonly<{ kind: "stop"; stop: GtfsStop }>
  | Readonly<{ kind: "failure"; result: TransferEvaluationFailure }>;

export function createEdge(
  request: TransferEvaluationRequest,
  edgeId: string,
  fields: EdgeFields,
): TransferEvaluationSuccess {
  const edge: TransferEdge = {
    edgeId,
    from: request.from,
    to: request.to,
    evidenceReferences: [...fields.evidenceReferences].sort(compareReferences),
    evidenceState: fields.evidenceState,
    connectionState: fields.connectionState,
    eligibleForRouting: fields.connectionState === "routable",
    barrierState: fields.barrierState,
    costs: fields.costs,
    limitations: uniqueStrings(fields.limitations),
    ...(fields.evidenceSource === undefined
      ? {}
      : { evidenceSource: fields.evidenceSource }),
    ...(fields.walkingPath === undefined
      ? {}
      : { walkingPath: fields.walkingPath }),
    ...(fields.reviewCandidate === undefined
      ? {}
      : { reviewCandidate: fields.reviewCandidate }),
  };
  return { kind: "edge", edge };
}

export function validateCostPolicy(
  policy: TransferCostPolicy,
): TransferEvaluationFailure | undefined {
  if (
    !policy ||
    !isNonNegativeFinite(policy.safetyBufferSeconds) ||
    !isNonNegativeFinite(policy.cognitiveDecisionCostSeconds)
  ) {
    return failure(
      "INVALID_COST_POLICY",
      "Transfer cost policy values must be finite and non-negative.",
    );
  }
  return undefined;
}

export function failure(
  code: TransferEvaluationFailure["error"]["code"],
  message: string,
  endpoint?: "from" | "to",
): TransferEvaluationFailure {
  return {
    kind: "failure",
    error: {
      code,
      message,
      ...(endpoint === undefined ? {} : { endpoint }),
    },
  };
}

export function findStop(
  snapshot: GtfsSnapshot,
  endpoint: TransferEndpoint,
  endpointName: "from" | "to",
): StopLookup {
  const matches = snapshot.stops.filter((stop) => stop.id === endpoint.stopId);
  const stop = matches[0];
  if (!stop || matches.length !== 1) {
    return {
      kind: "failure",
      result: failure(
        "UNKNOWN_ENDPOINT",
        "The requested transfer endpoint is not a unique supported stop.",
        endpointName,
      ),
    };
  }
  return { kind: "stop", stop };
}

export function findExplicitTransfers(
  snapshot: GtfsSnapshot,
  fromStopId: string,
  toStopId: string,
): readonly GtfsTransfer[] {
  return snapshot.transfers
    .filter(
      (transfer) =>
        transfer.fromStopId === fromStopId &&
        transfer.toStopId === toStopId &&
        transfer.lineage.snapshotId === snapshot.metadata.snapshotId &&
        (transfer.transferType === NEGATIVE_TRANSFER_TYPE ||
          VALID_TRANSFER_TYPES.has(transfer.transferType)),
    )
    .sort(compareTransfers);
}

export function getMinimumTransferTime(
  transfers: readonly GtfsTransfer[],
): number | undefined {
  const values = transfers
    .map((transfer) => transfer.minimumTransferTimeSeconds)
    .filter(isNonNegativeFinite);
  return values.length > 0 ? Math.max(...values) : undefined;
}

export function getSharedStationEvidence(
  fromStop: GtfsStop,
  toStop: GtfsStop,
  snapshot: GtfsSnapshot,
): readonly TransferEvidenceReference[] | undefined {
  const fromStationId = stationIdentity(fromStop);
  const toStationId = stationIdentity(toStop);
  if (!fromStationId || fromStationId !== toStationId) {
    return undefined;
  }

  const evidenceDate = snapshot.metadata.acquiredAt.trim();
  return [fromStop, toStop]
    .map((stop) => ({
      source: "shared-station-platform" as const,
      referenceId: `${stop.lineage.fileName}:${stop.lineage.rowNumber}`,
      ...(evidenceDate ? { evidenceDate } : {}),
    }))
    .sort(compareReferences);
}

export function isSameTransferBoundary(
  from: TransferEndpoint,
  to: TransferEndpoint,
): boolean {
  return (
    from.stopId === to.stopId ||
    (isNonBlank(from.transitServiceId) &&
      from.transitServiceId === to.transitServiceId)
  );
}

export function isSupportedWalkingEvidence(
  evidence: TransferWalkingEvidence | undefined,
): evidence is TransferWalkingEvidence {
  return (
    evidence !== undefined &&
    isNonBlank(evidence.source) &&
    (evidence.status === "verified" || evidence.status === "limited")
  );
}

export function isReviewWalkingEvidence(
  evidence: TransferWalkingEvidence | undefined,
): evidence is TransferWalkingEvidence {
  return (
    evidence !== undefined &&
    isNonBlank(evidence.source) &&
    (evidence.status === "stale" || evidence.status === "contradictory")
  );
}

export function getUsableWalkingPath(
  evidence: TransferWalkingEvidence | undefined,
): TransferWalkingPath | undefined {
  const path = evidence?.path;
  if (
    !path ||
    !isNonBlank(path.pathId) ||
    !Array.isArray(path.coordinates) ||
    path.coordinates.length < 2 ||
    path.coordinates.some((coordinate) => !isGeoCoordinate(coordinate)) ||
    !isNonNegativeFinite(path.distanceMeters) ||
    !isNonNegativeFinite(path.durationSeconds)
  ) {
    return undefined;
  }
  return path;
}

export function createCosts(
  policy: TransferCostPolicy,
  path?: TransferWalkingPath,
  minimumTransferTimeSeconds?: number,
): TransferCostBreakdown {
  return {
    ...(path
      ? {
          walkingDistanceMeters: path.distanceMeters,
          walkingDurationSeconds: path.durationSeconds,
          transferDurationSeconds:
            path.durationSeconds + policy.safetyBufferSeconds,
        }
      : {}),
    safetyBufferSeconds: policy.safetyBufferSeconds,
    cognitiveDecisionCostSeconds: policy.cognitiveDecisionCostSeconds,
    ...(minimumTransferTimeSeconds === undefined
      ? {}
      : { minimumTransferTimeSeconds }),
  };
}

export function transferReference(
  transfer: GtfsTransfer,
  snapshot: GtfsSnapshot,
): TransferEvidenceReference {
  const evidenceDate = snapshot.metadata.acquiredAt.trim();
  return {
    source: "explicit-gtfs-transfer",
    referenceId: `${transfer.lineage.fileName}:${transfer.lineage.rowNumber}`,
    ...(evidenceDate ? { evidenceDate } : {}),
  };
}

export function walkingReference(
  evidence: TransferWalkingEvidence,
): TransferEvidenceReference {
  const source = evidence.source?.trim() ?? "walking-graph";
  const pathId = evidence.path?.pathId.trim();
  const referenceId = firstNonBlank(pathId, `walking:${source}`);
  return {
    source: "verified-walking-graph",
    referenceId,
    ...(evidence.evidenceDate
      ? { evidenceDate: evidence.evidenceDate.trim() }
      : {}),
  };
}

export function proximityReviewCandidate(
  request: TransferEvaluationRequest,
): TransferReviewCandidate | undefined {
  const candidate = request.proximityCandidate;
  if (!candidate || !isNonNegativeFinite(candidate.distanceMeters)) {
    return undefined;
  }
  return {
    kind: "proximity",
    fromStopId: request.from.stopId,
    toStopId: request.to.stopId,
    distanceMeters: candidate.distanceMeters,
    ...(candidate.source && isNonBlank(candidate.source)
      ? { source: candidate.source.trim() }
      : {}),
    eligibleForRouting: false,
    reason: "Proximity alone is not approved transfer evidence.",
  };
}

export function createEdgeId(
  snapshotId: string,
  request: TransferEvaluationRequest,
): string {
  return [
    "transfer",
    snapshotId,
    request.from.stopId,
    request.from.transitServiceId ?? "",
    request.to.stopId,
    request.to.transitServiceId ?? "",
  ]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

export function compareReferences(
  left: TransferEvidenceReference,
  right: TransferEvidenceReference,
): number {
  return `${left.source}:${left.referenceId}:${left.evidenceDate ?? ""}`.localeCompare(
    `${right.source}:${right.referenceId}:${right.evidenceDate ?? ""}`,
  );
}

export function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function isNonNegativeFinite(
  value: number | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidEvidenceDate(value: string | undefined): boolean {
  return isNonBlank(value) && Number.isFinite(Date.parse(value));
}

function firstNonBlank(value: string | undefined, fallback: string): string {
  return isNonBlank(value) ? value : fallback;
}

function compareTransfers(left: GtfsTransfer, right: GtfsTransfer): number {
  return (
    left.lineage.rowNumber - right.lineage.rowNumber ||
    left.transferType - right.transferType ||
    (left.minimumTransferTimeSeconds ?? -1) -
      (right.minimumTransferTimeSeconds ?? -1)
  );
}

function stationIdentity(stop: GtfsStop): string | undefined {
  const parentStationId = stop.parentStationId?.trim();
  if (parentStationId) {
    return parentStationId;
  }
  return stop.locationType === 1 ? stop.id : undefined;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(isNonBlank).map((value) => value.trim()))];
}
