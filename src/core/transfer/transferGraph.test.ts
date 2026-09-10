import { describe, expect, it } from "vitest";

import { evaluateTransfer } from "./transferGraph";
import {
  ACQUIRED_AT,
  COST_POLICY,
  expectEdge,
  FROM_ENDPOINT,
  makeSnapshot,
  makeStationStops,
  makeStop,
  makeTransfer,
  TO_ENDPOINT,
  VERIFIED_WALK,
} from "./transferGraphTestFixtures";

describe("evaluateTransfer", () => {
  it("prefers an explicit transfer and exposes separate cost components", () => {
    const result = evaluateTransfer({
      snapshot: makeSnapshot({ transfers: [makeTransfer(0, 4, 240)] }),
      from: FROM_ENDPOINT,
      to: TO_ENDPOINT,
      walkingEvidence: VERIFIED_WALK,
      costPolicy: COST_POLICY,
    });

    const edge = expectEdge(result);
    expect(edge.evidenceSource).toBe("explicit-gtfs-transfer");
    expect(edge.evidenceState).toBe("Terverifikasi");
    expect(edge.connectionState).toBe("routable");
    expect(edge.eligibleForRouting).toBe(true);
    expect(edge.costs).toEqual({
      walkingDistanceMeters: 420,
      walkingDurationSeconds: 300,
      safetyBufferSeconds: 30,
      transferDurationSeconds: 330,
      cognitiveDecisionCostSeconds: 45,
      minimumTransferTimeSeconds: 240,
    });
    expect(edge.evidenceReferences).toContainEqual({
      source: "explicit-gtfs-transfer",
      referenceId: "transfers.txt:4",
      evidenceDate: ACQUIRED_AT,
    });
  });

  it("keeps stronger explicit evidence ahead of weaker data and blocks explicit prohibitions", () => {
    const supported = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({
          stops: makeStationStops(),
          transfers: [makeTransfer(0, 2)],
        }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: {
          ...VERIFIED_WALK,
          status: "stale",
          path: undefined,
        },
        proximityCandidate: { distanceMeters: 18 },
        costPolicy: COST_POLICY,
      }),
    );

    expect(supported.evidenceSource).toBe("explicit-gtfs-transfer");
    expect(supported.connectionState).toBe("routable");
    expect(supported.walkingPath).toBeUndefined();
    expect(supported.evidenceState).toBe("limited");
    expect(supported.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining("stale")]),
    );

    const prohibited = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ transfers: [makeTransfer(3, 3)] }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: VERIFIED_WALK,
        costPolicy: COST_POLICY,
      }),
    );

    expect(prohibited.evidenceSource).toBe("explicit-gtfs-transfer");
    expect(prohibited.connectionState).toBe("no-edge");
    expect(prohibited.eligibleForRouting).toBe(false);

    const conflicting = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({
          transfers: [makeTransfer(0, 1), makeTransfer(3, 2)],
        }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
    );

    expect(conflicting.evidenceState).toBe("Perlu dicek");
    expect(conflicting.connectionState).toBe("no-edge");
  });

  it("uses a shared parent station as connection evidence but does not match names alone", () => {
    const shared = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ stops: makeStationStops() }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
    );

    expect(shared.evidenceSource).toBe("shared-station-platform");
    expect(shared.evidenceState).toBe("limited");
    expect(shared.connectionState).toBe("routable");
    expect(shared.walkingPath).toBeUndefined();
    expect(
      shared.limitations.some((limitation) =>
        limitation.toLowerCase().includes("walking"),
      ),
    ).toBe(true);

    const nameOnly = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({
          stops: [makeStop("from-stop"), makeStop("to-stop")],
        }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
    );

    expect(nameOnly.evidenceSource).toBeUndefined();
    expect(nameOnly.connectionState).toBe("no-edge");
    expect(nameOnly.evidenceState).toBe("Unknown");
  });

  it("accepts a verified walking graph when no stronger evidence exists", () => {
    const edge = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: VERIFIED_WALK,
        costPolicy: COST_POLICY,
      }),
    );

    expect(edge.evidenceSource).toBe("verified-walking-graph");
    expect(edge.evidenceState).toBe("Terverifikasi");
    expect(edge.connectionState).toBe("routable");
    expect(edge.walkingPath).toEqual(VERIFIED_WALK.path);
    expect(edge.costs.transferDurationSeconds).toBe(330);
  });

  it("keeps proximity-only matches as non-routable review candidates", () => {
    const edge = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        proximityCandidate: {
          distanceMeters: 12,
          source: "coordinate-index",
        },
        costPolicy: COST_POLICY,
      }),
    );

    expect(edge.evidenceState).toBe("Unknown");
    expect(edge.connectionState).toBe("no-edge");
    expect(edge.eligibleForRouting).toBe(false);
    expect(edge.walkingPath).toBeUndefined();
    expect(edge.reviewCandidate).toMatchObject({
      kind: "proximity",
      fromStopId: "from-stop",
      toStopId: "to-stop",
      distanceMeters: 12,
      source: "coordinate-index",
      eligibleForRouting: false,
    });
    expect(edge.reviewCandidate?.reason.toLowerCase()).toContain("proximity");
  });

  it("degrades supported connections when the walking provider or path is unavailable", () => {
    const edge = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ transfers: [makeTransfer()] }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: {
          source: "walking-provider",
          status: "unavailable",
          limitation: "Provider timeout.",
        },
        costPolicy: COST_POLICY,
      }),
    );

    expect(edge.evidenceState).toBe("limited");
    expect(edge.connectionState).toBe("routable");
    expect(edge.walkingPath).toBeUndefined();
    expect(edge.costs.walkingDurationSeconds).toBeUndefined();
    expect(edge.costs.transferDurationSeconds).toBeUndefined();
    expect(edge.costs.cognitiveDecisionCostSeconds).toBe(45);
    expect(edge.limitations).toContain("Provider timeout.");
  });

  it("keeps selected stale or contradictory evidence in review-only state", () => {
    for (const status of ["stale", "contradictory"] as const) {
      const edge = expectEdge(
        evaluateTransfer({
          snapshot: makeSnapshot(),
          from: FROM_ENDPOINT,
          to: TO_ENDPOINT,
          walkingEvidence: {
            ...VERIFIED_WALK,
            status,
          },
          costPolicy: COST_POLICY,
        }),
      );

      expect(edge.evidenceSource).toBe("verified-walking-graph");
      expect(edge.evidenceState).toBe("Perlu dicek");
      expect(edge.connectionState).toBe("review-only");
      expect(edge.eligibleForRouting).toBe(false);
    }
  });

  it("blocks an explicitly barred path without claiming accessibility for unknown barriers", () => {
    const barred = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: { ...VERIFIED_WALK, barrierState: "present" },
        costPolicy: COST_POLICY,
      }),
    );

    expect(barred.barrierState).toBe("present");
    expect(barred.connectionState).toBe("no-edge");
    expect(barred.eligibleForRouting).toBe(false);

    const unknown = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: { ...VERIFIED_WALK, barrierState: undefined },
        costPolicy: COST_POLICY,
      }),
    );

    expect(unknown.barrierState).toBe("unknown");
    expect(unknown.connectionState).toBe("routable");
    expect(
      unknown.limitations.some((limitation) =>
        limitation.toLowerCase().includes("barrier"),
      ),
    ).toBe(true);
    expect("accessible" in unknown).toBe(false);
  });
});
