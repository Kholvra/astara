import { FIXED_SCORING_POLICY } from "~/core/timing/tripTiming";

import type {
  JourneyExplanation,
  JourneyRoute,
  RouteCandidate,
  RouteRankingCriterion,
  RouteScore,
  RouteSelectionReason,
} from "./routingTypes";

const EVIDENCE_ORDER: Readonly<Record<RouteScore["evidenceRank"], number>> = {
  complete: 0,
  limited: 1,
  unknown: 2,
};

export function createRouteScore(journey: JourneyRoute): RouteScore {
  return {
    routeId: journey.routeId,
    transferCount: journey.transferCount,
    decisionPointCount: journey.decisionPointCount,
    ...(journey.walking.totalDistanceMeters === undefined
      ? {}
      : { walkingDistanceMeters: journey.walking.totalDistanceMeters }),
    ...(getExpectedDuration(journey) === undefined
      ? {}
      : { expectedDurationSeconds: getExpectedDuration(journey) }),
    evidenceRank: journey.evidenceRank,
  };
}

export function compareRouteCandidates(
  left: RouteCandidate,
  right: RouteCandidate,
): number {
  return (
    left.score.transferCount - right.score.transferCount ||
    left.score.decisionPointCount - right.score.decisionPointCount ||
    compareOptionalNumbers(
      left.score.walkingDistanceMeters,
      right.score.walkingDistanceMeters,
    ) ||
    compareOptionalNumbers(
      left.score.expectedDurationSeconds,
      right.score.expectedDurationSeconds,
    ) ||
    EVIDENCE_ORDER[left.score.evidenceRank] -
      EVIDENCE_ORDER[right.score.evidenceRank] ||
    compareOrdinal(left.score.routeId, right.score.routeId)
  );
}

export function rankRouteCandidates(
  candidates: readonly RouteCandidate[],
): readonly RouteCandidate[] {
  return [...candidates].sort(compareRouteCandidates);
}

export function createRouteSelectionReason(
  rankedCandidates: readonly RouteCandidate[],
): RouteSelectionReason | undefined {
  const primary = rankedCandidates[0];
  if (!primary) {
    return undefined;
  }
  const runnerUp = rankedCandidates[1];
  const decidingCriterion = runnerUp
    ? firstDifferentCriterion(primary.score, runnerUp.score)
    : "only-eligible";
  const tieBreakApplied = decidingCriterion === "route-id";
  const reasonCodes = createReasonCodes(decidingCriterion, primary);

  return {
    policy: FIXED_SCORING_POLICY,
    decidingCriterion,
    tieBreakApplied,
    ...(runnerUp ? { comparedAgainstRouteId: runnerUp.score.routeId } : {}),
    score: primary.score,
    reasonCodes,
    sourceFields: [
      "transferCount",
      "decisionPointCount",
      "walkingDistanceMeters",
      "expectedDurationSeconds",
      "evidenceRank",
      "routeId",
    ],
    sourceValues: {
      transferCount: String(primary.score.transferCount),
      decisionPointCount: String(primary.score.decisionPointCount),
      walkingDistanceMeters: serializeOptional(
        primary.score.walkingDistanceMeters,
      ),
      expectedDurationSeconds: serializeOptional(
        primary.score.expectedDurationSeconds,
      ),
      evidenceRank: primary.score.evidenceRank,
      routeId: primary.score.routeId,
    },
  };
}

export function withJourneyExplanation(
  journey: JourneyRoute,
  reason: RouteSelectionReason,
): JourneyRoute {
  const explanation: JourneyExplanation = {
    decidingCriterion: reason.decidingCriterion,
    tieBreakApplied: reason.tieBreakApplied,
    reasonCodes: reason.reasonCodes,
    sourceFields: reason.sourceFields,
    sourceValues: reason.sourceValues,
  };
  return { ...journey, explanation };
}

function firstDifferentCriterion(
  left: RouteScore,
  right: RouteScore,
): RouteRankingCriterion {
  if (left.transferCount !== right.transferCount) {
    return "transfer-count";
  }
  if (left.decisionPointCount !== right.decisionPointCount) {
    return "decision-points";
  }
  if (
    compareOptionalNumbers(
      left.walkingDistanceMeters,
      right.walkingDistanceMeters,
    ) !== 0
  ) {
    return "walking-distance";
  }
  if (
    compareOptionalNumbers(
      left.expectedDurationSeconds,
      right.expectedDurationSeconds,
    ) !== 0
  ) {
    return "expected-duration";
  }
  if (left.evidenceRank !== right.evidenceRank) {
    return "evidence-rank";
  }
  return "route-id";
}

function createReasonCodes(
  criterion: RouteRankingCriterion,
  primary: RouteCandidate,
): readonly string[] {
  const reason =
    criterion === "only-eligible"
      ? "only-eligible-route"
      : criterion === "transfer-count"
        ? "fewer-transfers"
        : criterion === "decision-points"
          ? "fewer-decision-points"
          : criterion === "walking-distance"
            ? "less-supported-walking"
            : criterion === "expected-duration"
              ? "shorter-expected-duration"
              : criterion === "evidence-rank"
                ? "stronger-evidence"
                : "stable-route-id-tie-break";
  return [
    reason,
    ...(primary.journey.status === "limited" ? ["limited-data-preserved"] : []),
  ];
}

function getExpectedDuration(journey: JourneyRoute): number | undefined {
  return journey.timing.semantics === "unavailable"
    ? undefined
    : journey.timing.expectedDurationSeconds;
}

function compareOptionalNumbers(
  left: number | undefined,
  right: number | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }
  return left - right;
}

function serializeOptional(value: number | undefined): string {
  return value === undefined ? "unknown" : String(value);
}

function compareOrdinal(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return left.length - right.length;
}
