import type { GtfsSnapshot, GtfsTransfer } from "~/core/ingestion/gtfsTypes";

import type {
  TransferEvaluation,
  TransferEvaluationRequest,
  TransferEvaluationSuccess,
  TransferEvidenceReference,
  TransferEvidenceSource,
  TransferWalkingEvidence,
} from "./transferTypes";
import {
  createCosts,
  createEdge,
  createEdgeId,
  failure,
  findExplicitTransfers,
  findStop,
  getMinimumTransferTime,
  getSharedStationEvidence,
  getUsableWalkingPath,
  isNonBlank,
  isReviewWalkingEvidence,
  isSameTransferBoundary,
  isSupportedWalkingEvidence,
  isValidEvidenceDate,
  NEGATIVE_TRANSFER_TYPE,
  proximityReviewCandidate,
  transferReference,
  validateCostPolicy,
  walkingReference,
  VALID_TRANSFER_TYPES,
} from "./transferGraphSupport";

export type {
  TransferBarrierState,
  TransferCostBreakdown,
  TransferCostPolicy,
  TransferEdge,
  TransferEndpoint,
  TransferEvaluation,
  TransferEvaluationErrorCode,
  TransferEvaluationFailure,
  TransferEvaluationRequest,
  TransferEvaluationSuccess,
  TransferEvidenceReference,
  TransferEvidenceSource,
  TransferProximityReviewCandidate,
  TransferReviewCandidate,
  TransferWalkingEvidence,
  TransferWalkingEvidenceStatus,
  TransferWalkingPath,
} from "./transferTypes";

export function evaluateTransfer(
  request: TransferEvaluationRequest,
): TransferEvaluation {
  const policyFailure = validateCostPolicy(request.costPolicy);
  if (policyFailure) {
    return policyFailure;
  }

  const snapshot = request.snapshot;
  if (!snapshot) {
    return failure(
      "NO_ACTIVE_SNAPSHOT",
      "No active transit snapshot is available for transfer evaluation.",
    );
  }

  const fromStop = findStop(snapshot, request.from, "from");
  if (fromStop.kind === "failure") {
    return fromStop.result;
  }
  const toStop = findStop(snapshot, request.to, "to");
  if (toStop.kind === "failure") {
    return toStop.result;
  }

  if (fromStop.stop.lineage.snapshotId !== snapshot.metadata.snapshotId) {
    return failure(
      "SNAPSHOT_MISMATCH",
      "The origin stop belongs to a different transit snapshot.",
      "from",
    );
  }
  if (toStop.stop.lineage.snapshotId !== snapshot.metadata.snapshotId) {
    return failure(
      "SNAPSHOT_MISMATCH",
      "The destination stop belongs to a different transit snapshot.",
      "to",
    );
  }

  const edgeId = createEdgeId(snapshot.metadata.snapshotId, request);
  if (isSameTransferBoundary(request.from, request.to)) {
    return createEdge(request, edgeId, {
      evidenceState: "Unknown",
      connectionState: "no-edge",
      barrierState: "unknown",
      evidenceReferences: [],
      costs: createCosts(request.costPolicy),
      limitations: [
        "The endpoints represent the same stop or transit service; no transfer is required.",
      ],
    });
  }

  const explicitTransfers = findExplicitTransfers(
    snapshot,
    request.from.stopId,
    request.to.stopId,
  );
  if (explicitTransfers.length > 0) {
    return evaluateExplicitEvidence(
      request,
      snapshot,
      edgeId,
      explicitTransfers,
    );
  }

  const sharedReferences = getSharedStationEvidence(
    fromStop.stop,
    toStop.stop,
    snapshot,
  );
  if (sharedReferences) {
    return evaluateSupportedEvidence(request, edgeId, {
      source: "shared-station-platform",
      references: sharedReferences,
      minimumTransferTimeSeconds: undefined,
    });
  }

  if (isReviewWalkingEvidence(request.walkingEvidence)) {
    return evaluateWalkingReview(request, edgeId, request.walkingEvidence);
  }

  if (isSupportedWalkingEvidence(request.walkingEvidence)) {
    return evaluateSupportedEvidence(request, edgeId, {
      source: "verified-walking-graph",
      references: [walkingReference(request.walkingEvidence)],
      minimumTransferTimeSeconds: undefined,
    });
  }

  return createEdge(request, edgeId, {
    evidenceState: "Unknown",
    connectionState: "no-edge",
    barrierState: "unknown",
    evidenceReferences: [],
    costs: createCosts(request.costPolicy),
    limitations: ["No approved transfer evidence supports this connection."],
    reviewCandidate: proximityReviewCandidate(request),
  });
}

function evaluateExplicitEvidence(
  request: TransferEvaluationRequest,
  snapshot: GtfsSnapshot,
  edgeId: string,
  transfers: readonly GtfsTransfer[],
): TransferEvaluationSuccess {
  const references = transfers
    .map((transfer) => transferReference(transfer, snapshot))
    .sort(compareReferences);
  const hasNegative = transfers.some(
    (transfer) => transfer.transferType === NEGATIVE_TRANSFER_TYPE,
  );
  const hasPositive = transfers.some((transfer) =>
    VALID_TRANSFER_TYPES.has(transfer.transferType),
  );
  const minimumTransferTimeSeconds = getMinimumTransferTime(transfers);

  if (hasNegative) {
    return createEdge(request, edgeId, {
      evidenceSource: "explicit-gtfs-transfer",
      evidenceReferences: references,
      evidenceState: hasPositive ? "Perlu dicek" : "Unknown",
      connectionState: "no-edge",
      barrierState: "unknown",
      costs: createCosts(
        request.costPolicy,
        undefined,
        minimumTransferTimeSeconds,
      ),
      limitations: [
        "The explicit GTFS transfer rule marks this connection as not possible.",
        ...(hasPositive
          ? ["Conflicting explicit transfer rules require review."]
          : []),
      ],
    });
  }

  return evaluateSupportedEvidence(request, edgeId, {
    source: "explicit-gtfs-transfer",
    references,
    minimumTransferTimeSeconds,
  });
}

function evaluateSupportedEvidence(
  request: TransferEvaluationRequest,
  edgeId: string,
  input: Readonly<{
    source: TransferEvidenceSource;
    references: readonly TransferEvidenceReference[];
    minimumTransferTimeSeconds: number | undefined;
  }>,
): TransferEvaluationSuccess {
  const walkingEvidence = request.walkingEvidence;
  const usablePath = getUsableWalkingPath(walkingEvidence);
  const hasWalkingSource = isNonBlank(walkingEvidence?.source);
  const hasWalkingDate = isValidEvidenceDate(walkingEvidence?.evidenceDate);
  const canUsePath =
    usablePath !== undefined &&
    hasWalkingSource &&
    hasWalkingDate &&
    (walkingEvidence?.status === "verified" ||
      walkingEvidence?.status === "limited");
  const limitations: string[] = [];

  if (walkingEvidence?.limitation && isNonBlank(walkingEvidence.limitation)) {
    limitations.push(walkingEvidence.limitation.trim());
  }
  if (walkingEvidence?.status === "stale") {
    limitations.push(
      "Walking evidence is stale and its geometry is not used as verified guidance.",
    );
  }
  if (walkingEvidence?.status === "contradictory") {
    limitations.push(
      "Walking evidence is contradictory and its geometry is not used as verified guidance.",
    );
  }
  if (walkingEvidence?.status === "unavailable") {
    limitations.push("The walking provider did not return a usable path.");
  }
  if (walkingEvidence?.status === "unknown") {
    limitations.push("Walking path details are unknown.");
  }
  if (walkingEvidence?.path && !usablePath) {
    limitations.push("Walking path data is invalid or incomplete.");
  }
  if (!canUsePath) {
    limitations.push("Walking path detail is limited or unavailable.");
  }
  if (
    walkingEvidence?.status === "verified" &&
    (!hasWalkingSource || !hasWalkingDate)
  ) {
    limitations.push(
      "Walking evidence is missing a valid source date, so verification is limited.",
    );
  }

  const barrierState = walkingEvidence?.barrierState ?? "unknown";
  if (barrierState === "unknown") {
    limitations.push("Barrier and access data is unknown.");
  }

  const verified =
    canUsePath &&
    walkingEvidence?.status === "verified" &&
    input.references.every((reference) =>
      isValidEvidenceDate(reference.evidenceDate),
    );

  return createEdge(request, edgeId, {
    evidenceSource: input.source,
    evidenceReferences: input.references,
    evidenceState: verified ? "Terverifikasi" : "limited",
    connectionState: barrierState === "present" ? "no-edge" : "routable",
    barrierState,
    walkingPath: canUsePath ? usablePath : undefined,
    costs: createCosts(
      request.costPolicy,
      canUsePath ? usablePath : undefined,
      input.minimumTransferTimeSeconds,
    ),
    limitations,
  });
}

function evaluateWalkingReview(
  request: TransferEvaluationRequest,
  edgeId: string,
  walkingEvidence: TransferWalkingEvidence,
): TransferEvaluationSuccess {
  const barrierState = walkingEvidence.barrierState ?? "unknown";
  return createEdge(request, edgeId, {
    evidenceSource: "verified-walking-graph",
    evidenceReferences: [walkingReference(walkingEvidence)],
    evidenceState: "Perlu dicek",
    connectionState: barrierState === "present" ? "no-edge" : "review-only",
    barrierState,
    costs: createCosts(request.costPolicy),
    limitations: [
      walkingEvidence.status === "stale"
        ? "Walking evidence is stale and requires review."
        : "Walking evidence is contradictory and requires review.",
      ...(walkingEvidence.limitation ? [walkingEvidence.limitation] : []),
      ...(barrierState === "unknown"
        ? ["Barrier and access data is unknown."]
        : []),
    ],
  });
}

function compareReferences(
  left: TransferEvidenceReference,
  right: TransferEvidenceReference,
): number {
  return `${left.source}:${left.referenceId}:${left.evidenceDate ?? ""}`.localeCompare(
    `${right.source}:${right.referenceId}:${right.evidenceDate ?? ""}`,
  );
}
