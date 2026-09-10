import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";
import type { FIXED_SCORING_POLICY } from "~/core/timing/tripTiming";

import { selectPrimaryRoute } from "./routeEngine";
import {
  makeIntervalSnapshot,
  makePlanningInput,
  makeSnapshot,
  makeSnapshotWithInactiveRequestedDate,
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";

describe("selectPrimaryRoute", () => {
  it("returns an explainable direct journey with exact timing and lineage", () => {
    const result = selectPrimaryRoute({
      snapshot: makeSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
      config: {
        freshness: "current",
        routeRulesVersion: "test-v1",
        candidateConfigurationHash: "test-config-v1",
      },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary).toMatchObject({
      status: "routed",
      originStopId: "origin",
      destinationStopId: "destination",
      transferCount: 0,
      lineage: {
        snapshotId: "snapshot-test",
        sourceUrl: "https://example.test/gtfs.zip",
        freshness: "current",
      },
      timing: {
        semantics: "exact",
        departure: { raw: "08:00:00" },
        arrival: { raw: "08:20:00" },
      },
    });
    expect(result.primary.legs).toHaveLength(1);
    expect(result.primary.legs[0]).toMatchObject({
      kind: "transit",
      routeId: "route-1",
      tripId: "trip-1",
      fromStopId: "origin",
      toStopId: "destination",
      headsign: "Destination",
      geometry: {
        state: "supported",
        shapeId: "shape-1",
      },
    });
    expect(result.primary.explanation.decidingCriterion).toBe("only-eligible");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.journey.legs).toHaveLength(1);
  });

  it("does not route a service that is inactive on the requested date", () => {
    const result = selectPrimaryRoute({
      snapshot: makeSnapshotWithInactiveRequestedDate(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result).toMatchObject({
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
    });
    expect(result).not.toHaveProperty("primary");
  });

  it("selects an after-midnight trip from its originating service date", () => {
    const baseSnapshot = makeSnapshot();
    const snapshot = {
      ...baseSnapshot,
      stopTimes: baseSnapshot.stopTimes.map((stopTime) => {
        const raw = stopTime.stopId === "origin" ? "25:10:00" : "25:40:00";
        const parsed = parseGtfsTime(raw);
        return { ...stopTime, arrivalTime: parsed, departureTime: parsed };
      }),
    };
    const result = selectPrimaryRoute({
      snapshot,
      planning: makePlanningInput("2026-09-11", "01:10"),
      transferEdges: [],
      config: { freshness: "current" },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.routeId).toContain(":2026-09-10:");
    expect(result.primary.timing).toMatchObject({
      semantics: "exact",
      departure: { raw: "25:10:00" },
      arrival: { raw: "25:40:00" },
    });
  });

  it("preserves interval frequency semantics instead of claiming an exact departure", () => {
    const result = selectPrimaryRoute({
      snapshot: makeIntervalSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:05"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.timing).toMatchObject({
      semantics: "interval",
      start: { raw: "08:00:00" },
      end: { raw: "08:30:00" },
      headwaySeconds: 600,
    });
    expect(result.primary.timing).not.toHaveProperty("departure");
  });

  it("fails closed for missing snapshots, unresolved stops, wrong policy, and equal endpoints", () => {
    const missingSnapshot = selectPrimaryRoute({
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });
    const missingStop = selectPrimaryRoute({
      snapshot: makeSnapshot(),
      planning: {
        ...makePlanningInput("2026-09-11", "08:00"),
        originId: "not-a-stop",
      },
      transferEdges: [],
    });
    const wrongPolicy = selectPrimaryRoute({
      snapshot: makeSnapshot(),
      planning: {
        ...makePlanningInput("2026-09-11", "08:00"),
        scoringPolicy: "other-policy" as typeof FIXED_SCORING_POLICY,
      },
      transferEdges: [],
    });
    const sameStop = selectPrimaryRoute({
      snapshot: makeSnapshot(),
      planning: {
        ...makePlanningInput("2026-09-11", "08:00"),
        destinationId: "origin",
      },
      transferEdges: [],
    });

    expect(missingSnapshot).toMatchObject({
      state: "unavailable",
      code: "NO_ACTIVE_SNAPSHOT",
    });
    expect(missingStop).toMatchObject({
      state: "invalid-input",
      code: "UNKNOWN_STOP",
    });
    expect(wrongPolicy).toMatchObject({
      state: "invalid-input",
      code: "UNSUPPORTED_SCORING_POLICY",
    });
    expect(sameStop).toMatchObject({
      state: "no-route",
      code: "SAME_ORIGIN_DESTINATION",
    });
  });

  it("builds a transfer journey from routable prepared evidence and preserves limited status", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { freshness: "current" },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary).toMatchObject({
      status: "limited",
      transferCount: 1,
      walking: {
        totalDistanceMeters: 420,
        label: "limited",
      },
    });
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "walking",
      "transit",
    ]);
    expect(result.primary.legs[1]).toMatchObject({
      kind: "walking",
      edgeId: "edge-hub",
      fromStopId: "hub-a",
      toStopId: "hub-b",
      evidenceState: "limited",
    });
    expect(result.primary.limitation.notes).toContain(
      "Walking path detail is limited or unavailable.",
    );
  });

  it("keeps missing transfer duration unknown instead of scoring it as zero", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [
        makeTransferEdge({
          walkingPath: undefined,
          costs: {
            safetyBufferSeconds: 30,
            cognitiveDecisionCostSeconds: 45,
          },
          limitations: ["Walking duration is unknown."],
        }),
      ],
      config: { freshness: "current" },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.timing).toMatchObject({ semantics: "estimate" });
    expect(result.primary.timing).not.toHaveProperty("expectedDurationSeconds");
    expect(result.candidates[0]?.score).not.toHaveProperty(
      "expectedDurationSeconds",
    );
  });

  it("excludes no-edge and service-mismatched transfers without a fallback", () => {
    const noEdge = makeTransferEdge({
      connectionState: "no-edge",
      eligibleForRouting: false,
      evidenceState: "Unknown",
    });
    const wrongService = makeTransferEdge({
      from: { stopId: "hub-a", transitServiceId: "route-other" },
    });
    const unknownEvidence = makeTransferEdge({
      evidenceState: "Unknown",
    });

    const noEdgeResult = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [noEdge],
    });
    const wrongServiceResult = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [wrongService],
    });
    const unknownEvidenceResult = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [unknownEvidence],
    });

    expect(noEdgeResult).toMatchObject({
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
    });
    expect(wrongServiceResult).toMatchObject({
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
    });
    expect(unknownEvidenceResult).toMatchObject({
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
    });
  });

  it("fails closed when the bounded search cannot evaluate all branches", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { maxSearchStates: 1 },
    });

    expect(result).toMatchObject({
      state: "limited-data",
      code: "SEARCH_EXHAUSTED",
    });
    expect(result).not.toHaveProperty("primary");
  });

  it("preserves stale snapshot status and limitations on a selected route", () => {
    const snapshot = makeTransferSnapshot({
      coverage: "limited",
      limitations: ["Snapshot coverage is limited."],
    });
    const result = selectPrimaryRoute({
      snapshot,
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { freshness: "stale", staticDemoNote: "Static demo data." },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary).toMatchObject({
      status: "limited",
      lineage: { coverage: "limited", freshness: "stale" },
      limitation: { freshness: "stale" },
    });
    expect(result.primary.limitation.notes).toContain(
      "Snapshot coverage is limited.",
    );
    expect(result.primary.limitation.notes).toContain("Static demo data.");
  });
});
