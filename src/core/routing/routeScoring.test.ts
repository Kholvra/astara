import { describe, expect, it } from "vitest";

import {
  compareRouteCandidates,
  createRouteSelectionReason,
  rankRouteCandidates,
  withJourneyExplanation,
} from "./routeScoring";
import { makeCandidate } from "./routeScoringTestFixtures";

describe("route candidate scoring", () => {
  it("prioritizes fewer transfers and decision points before duration", () => {
    const direct = makeCandidate({
      routeId: "route-direct",
      transferCount: 0,
      decisionPointCount: 1,
      expectedDurationSeconds: 2_400,
    });
    const transfer = makeCandidate({
      routeId: "route-transfer",
      transferCount: 1,
      decisionPointCount: 3,
      expectedDurationSeconds: 1_200,
    });

    expect(compareRouteCandidates(direct, transfer)).toBeLessThan(0);
    expect(rankRouteCandidates([transfer, direct])).toEqual([direct, transfer]);
    expect(createRouteSelectionReason([direct, transfer])).toMatchObject({
      decidingCriterion: "transfer-count",
      tieBreakApplied: false,
      score: direct.score,
    });
  });

  it("sorts unknown walking and duration after every finite value", () => {
    const finite = makeCandidate({
      routeId: "route-finite",
      walkingDistanceMeters: 900,
      expectedDurationSeconds: 5_400,
    });
    const unknownWalking = makeCandidate({
      routeId: "route-unknown-walk",
      walkingDistanceMeters: undefined,
      expectedDurationSeconds: 300,
    });
    const unknownDuration = makeCandidate({
      routeId: "route-unknown-duration",
      walkingDistanceMeters: 900,
      expectedDurationSeconds: undefined,
    });

    expect(rankRouteCandidates([unknownWalking, finite])).toEqual([
      finite,
      unknownWalking,
    ]);
    expect(rankRouteCandidates([unknownDuration, finite])).toEqual([
      finite,
      unknownDuration,
    ]);
    expect(unknownWalking.score.walkingDistanceMeters).toBeUndefined();
    expect(unknownDuration.score.expectedDurationSeconds).toBeUndefined();
  });

  it("uses evidence completeness only after earlier route trade-offs are equal", () => {
    const complete = makeCandidate({
      routeId: "route-complete",
      evidenceRank: "complete",
      transferCount: 1,
      decisionPointCount: 3,
      walkingDistanceMeters: 500,
      expectedDurationSeconds: 3_000,
    });
    const limited = makeCandidate({
      routeId: "route-limited",
      evidenceRank: "limited",
      transferCount: 1,
      decisionPointCount: 3,
      walkingDistanceMeters: 500,
      expectedDurationSeconds: 3_000,
    });

    expect(rankRouteCandidates([limited, complete])).toEqual([
      complete,
      limited,
    ]);
    expect(createRouteSelectionReason([complete, limited])).toMatchObject({
      decidingCriterion: "evidence-rank",
      reasonCodes: ["stronger-evidence"],
    });
  });

  it("resolves equal score keys by stable ordinal route ID and reconstructs the explanation", () => {
    const routeA = makeCandidate({
      routeId: "route-a",
      transferCount: 0,
      decisionPointCount: 1,
      walkingDistanceMeters: 100,
      expectedDurationSeconds: 2_000,
      evidenceRank: "complete",
    });
    const routeB = makeCandidate({
      routeId: "route-b",
      transferCount: 0,
      decisionPointCount: 1,
      walkingDistanceMeters: 100,
      expectedDurationSeconds: 2_000,
      evidenceRank: "complete",
    });

    const first = rankRouteCandidates([routeB, routeA]);
    const second = rankRouteCandidates([routeA, routeB]);
    const reason = createRouteSelectionReason(first);
    const explained = reason
      ? withJourneyExplanation(first[0]!.journey, reason)
      : undefined;

    expect(first).toEqual(second);
    expect(first[0]?.score.routeId).toBe("route-a");
    expect(reason).toMatchObject({
      decidingCriterion: "route-id",
      tieBreakApplied: true,
      comparedAgainstRouteId: "route-b",
    });
    expect(explained?.explanation).toMatchObject({
      decidingCriterion: "route-id",
      tieBreakApplied: true,
      reasonCodes: ["stable-route-id-tie-break"],
    });
  });
});
