import { evaluateGtfsAccessEvidence } from "./gtfsEvidence";
import { isBlockingIssue } from "./gtfsValidation";
import {
  isAcceptedWarningCode,
  type Freshness,
  type FreshnessPolicy,
  type GtfsConsumerStatus,
  type GtfsSnapshot,
  type GtfsStatusFacts,
  type GtfsValidationIssue,
  type GtfsValidationResult,
  type PublicationDecision,
} from "./gtfsTypes";

export function classifyFreshness(
  acquiredAt: string,
  now: string,
  policy: FreshnessPolicy,
): Freshness {
  const acquiredTimestamp = Date.parse(acquiredAt);
  const nowTimestamp = Date.parse(now);
  if (
    !Number.isFinite(acquiredTimestamp) ||
    !Number.isFinite(nowTimestamp) ||
    !isFreshnessPolicyValid(policy)
  ) {
    return "unknown";
  }

  const ageHours = Math.max(0, nowTimestamp - acquiredTimestamp) / 3_600_000;
  if (ageHours < policy.agingAfterHours) {
    return "current";
  }
  if (ageHours < policy.staleAfterHours) {
    return "aging";
  }
  return "stale";
}

export function decidePublication(
  candidate: GtfsValidationResult,
  current: GtfsSnapshot | undefined,
  now: string,
  policy: FreshnessPolicy,
): PublicationDecision {
  const decision = decidePublicationFromStatusFacts(
    candidate,
    current ? statusFactsFromSnapshot(current) : undefined,
    now,
    policy,
  );

  if (decision.outcome === "fallback" && current) {
    return { ...decision, activeSnapshot: current };
  }
  return decision;
}

export function isPublishableGtfsCandidate(
  candidate: GtfsValidationResult,
): boolean {
  return (
    candidate.accepted &&
    candidate.snapshot !== undefined &&
    !candidate.issues.some(isBlockingIssue)
  );
}

export function decidePublicationFromStatusFacts(
  candidate: GtfsValidationResult,
  current: GtfsStatusFacts | undefined,
  now: string,
  policy: FreshnessPolicy,
): PublicationDecision {
  if (isPublishableGtfsCandidate(candidate)) {
    const snapshot = candidate.snapshot;
    if (!snapshot) {
      return unavailableDecision(
        candidate,
        "Candidate did not contain a snapshot.",
      );
    }

    const status = getGtfsConsumerStatus(
      statusFactsFromSnapshot(snapshot),
      now,
      policy,
    );
    if (status.freshness === "stale" && !isStaleDemoPermitted(policy)) {
      return unavailableDecision(
        candidate,
        "The candidate is stale and stale demo use is not permitted.",
        [],
      );
    }

    return {
      outcome: "published",
      activeSnapshot: snapshot,
      rejectionIssues: [],
      status,
    };
  }

  const rejectionIssues = getRejectionIssues(candidate);
  if (!current) {
    return unavailableDecision(
      { ...candidate, issues: rejectionIssues },
      "No valid snapshot is active; manual recovery is required.",
    );
  }

  const currentStatus = getGtfsConsumerStatus(current, now, policy);
  if (currentStatus.freshness === "stale" && !isStaleDemoPermitted(policy)) {
    return {
      outcome: "unavailable",
      rejectionIssues,
      rejectedCandidateId: candidate.candidateSnapshotId,
      status: {
        ...currentStatus,
        networkAvailability: "unavailable",
        activeSnapshotId: undefined,
        operatorReason:
          "The active snapshot is stale; manual recovery is required.",
      },
    };
  }

  return {
    outcome: "fallback",
    rejectedCandidateId: candidate.candidateSnapshotId,
    rejectionIssues,
    status: currentStatus,
  };
}

export function getGtfsConsumerStatus(
  facts: GtfsStatusFacts,
  now: string,
  policy: FreshnessPolicy,
): GtfsConsumerStatus {
  const freshness = classifyFreshness(facts.metadata.acquiredAt, now, policy);
  const accessEvidence = evaluateGtfsAccessEvidence(
    facts.metadata.snapshotId,
    facts.accessEvidence,
  );
  const staticDemoNote =
    freshness === "stale" && isStaleDemoPermitted(policy)
      ? policy.staleDemoNote
      : undefined;
  const staleUseBlocked =
    freshness === "stale" && !isStaleDemoPermitted(policy);

  return {
    networkAvailability: staleUseBlocked ? "unavailable" : "available",
    freshness,
    coverage: facts.coverage,
    evidenceState: accessEvidence.evidenceState,
    connectionState: "no-edge",
    timingSemantics: facts.hasIntervalFrequencies ? "interval" : "exact",
    geometryState: facts.hasShapeGeometry ? "supported" : "limited",
    activeSnapshotId: staleUseBlocked ? undefined : facts.metadata.snapshotId,
    accessEvidenceVersionId: accessEvidence.evidenceVersionId,
    accessEvidenceTransitSnapshotId: accessEvidence.transitSnapshotId,
    limitations: facts.limitations,
    staticDemoNote,
    operatorReason: staleUseBlocked
      ? "The active snapshot is stale; manual recovery is required."
      : undefined,
  };
}

function statusFactsFromSnapshot(snapshot: GtfsSnapshot): GtfsStatusFacts {
  return {
    metadata: snapshot.metadata,
    serviceDate: snapshot.serviceDate,
    coverage: snapshot.coverage,
    limitations: snapshot.limitations,
    hasIntervalFrequencies: snapshot.frequencies.some(
      (frequency) => frequency.timingSemantics === "interval",
    ),
    hasShapeGeometry: snapshot.shapes.length > 0,
  };
}

function unavailableDecision(
  candidate: GtfsValidationResult,
  reason: string,
  rejectionIssues: readonly GtfsValidationIssue[] = getRejectionIssues(
    candidate,
  ),
): PublicationDecision {
  return {
    outcome: "unavailable",
    rejectedCandidateId: candidate.candidateSnapshotId,
    rejectionIssues,
    status: getUnavailableGtfsStatus(reason),
  };
}

export function getUnavailableGtfsStatus(reason: string): GtfsConsumerStatus {
  return {
    networkAvailability: "unavailable",
    freshness: "unknown",
    coverage: "unknown",
    evidenceState: "Unknown",
    connectionState: "no-edge",
    timingSemantics: "unavailable",
    geometryState: "unavailable",
    activeSnapshotId: undefined,
    limitations: [],
    operatorReason: reason,
  };
}

function getRejectionIssues(
  candidate: GtfsValidationResult,
): readonly GtfsValidationIssue[] {
  const issues = [...candidate.issues];
  const hasUnknownFinding = issues.some(
    (issue) =>
      !isAcceptedWarningCode(issue.code) && issue.classification !== "blocker",
  );
  const hasHardBlocker = issues.some(
    (issue) => issue.classification === "blocker",
  );
  const hasGateIssue = issues.some((issue) => issue.code === "DATA-HARD-999");

  if (
    (issues.length === 0 ||
      hasUnknownFinding ||
      (!candidate.accepted && !hasHardBlocker)) &&
    !hasGateIssue
  ) {
    issues.push({
      code: "DATA-HARD-999",
      classification: "blocker",
      message:
        "Candidate failed closed because its validation decision was incomplete.",
    });
  }

  return issues;
}

function isFreshnessPolicyValid(policy: FreshnessPolicy): boolean {
  return (
    Number.isFinite(policy.agingAfterHours) &&
    Number.isFinite(policy.staleAfterHours) &&
    policy.agingAfterHours >= 0 &&
    policy.staleAfterHours > policy.agingAfterHours &&
    typeof policy.allowStaleDemo === "boolean" &&
    typeof policy.staleDemoNote === "string"
  );
}

function isStaleDemoPermitted(policy: FreshnessPolicy): boolean {
  return policy.allowStaleDemo && policy.staleDemoNote.trim().length > 0;
}
