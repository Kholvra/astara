import { describe, expect, it } from "vitest";

import {
  evaluateTransfer,
  type TransferEvaluation,
  type TransferEvaluationErrorCode,
} from "./transferGraph";
import {
  COST_POLICY,
  expectEdge,
  FROM_ENDPOINT,
  makeSnapshot,
  makeStationStops,
  makeStop,
  makeTransfer,
  TO_ENDPOINT,
  VERIFIED_PATH,
  VERIFIED_WALK,
} from "./transferGraphTestFixtures";

describe("evaluateTransfer boundary behavior", () => {
  it("returns typed failures for invalid snapshots, endpoints, lineage, and cost policy", () => {
    expectFailure(
      evaluateTransfer({
        snapshot: undefined,
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
      "NO_ACTIVE_SNAPSHOT",
    );

    expectFailure(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: { stopId: "missing-stop" },
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
      "UNKNOWN_ENDPOINT",
      "from",
    );

    expectFailure(
      evaluateTransfer({
        snapshot: makeSnapshot({
          stops: [
            makeStop("from-stop", {}, "other-snapshot"),
            makeStop("to-stop"),
          ],
        }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: COST_POLICY,
      }),
      "SNAPSHOT_MISMATCH",
    );

    expectFailure(
      evaluateTransfer({
        snapshot: makeSnapshot(),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        costPolicy: { ...COST_POLICY, safetyBufferSeconds: -1 },
      }),
      "INVALID_COST_POLICY",
    );
  });

  it("does not emit an edge for the same endpoint or a same-service loop", () => {
    const sameStop = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ stops: [makeStop("same-stop")] }),
        from: { stopId: "same-stop" },
        to: { stopId: "same-stop" },
        costPolicy: COST_POLICY,
      }),
    );

    expect(sameStop.connectionState).toBe("no-edge");
    expect(sameStop.evidenceSource).toBeUndefined();
    expect(sameStop.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining("same")]),
    );

    const loop = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ stops: makeStationStops() }),
        from: { ...FROM_ENDPOINT, transitServiceId: "route-1" },
        to: { ...TO_ENDPOINT, transitServiceId: "route-1" },
        costPolicy: COST_POLICY,
      }),
    );

    expect(loop.connectionState).toBe("no-edge");
    expect(loop.evidenceSource).toBeUndefined();
  });

  it("is deterministic when equivalent explicit rows are reordered", () => {
    const transfers = [makeTransfer(0, 2), makeTransfer(0, 1)];
    const first = evaluateTransfer({
      snapshot: makeSnapshot({ transfers }),
      from: FROM_ENDPOINT,
      to: TO_ENDPOINT,
      walkingEvidence: VERIFIED_WALK,
      costPolicy: COST_POLICY,
    });
    const second = evaluateTransfer({
      snapshot: makeSnapshot({ transfers: [...transfers].reverse() }),
      from: FROM_ENDPOINT,
      to: TO_ENDPOINT,
      walkingEvidence: VERIFIED_WALK,
      costPolicy: COST_POLICY,
    });

    expect(second).toEqual(first);
  });

  it("does not use malformed walking paths as verified geometry or costs", () => {
    const edge = expectEdge(
      evaluateTransfer({
        snapshot: makeSnapshot({ transfers: [makeTransfer()] }),
        from: FROM_ENDPOINT,
        to: TO_ENDPOINT,
        walkingEvidence: {
          ...VERIFIED_WALK,
          path: {
            ...VERIFIED_PATH,
            coordinates: [
              [106.82, -91],
              [106.821, -6.181],
            ] as const,
            distanceMeters: -10,
          },
        },
        costPolicy: COST_POLICY,
      }),
    );

    expect(edge.evidenceState).toBe("limited");
    expect(edge.connectionState).toBe("routable");
    expect(edge.walkingPath).toBeUndefined();
    expect(edge.costs.walkingDistanceMeters).toBeUndefined();
    expect(edge.costs.transferDurationSeconds).toBeUndefined();
  });
});

function expectFailure(
  result: TransferEvaluation,
  code: TransferEvaluationErrorCode,
  endpoint?: "from" | "to",
): void {
  expect(result.kind).toBe("failure");
  if (result.kind !== "failure") {
    return;
  }
  expect(result.error.code).toBe(code);
  if (endpoint !== undefined) {
    expect(result.error.endpoint).toBe(endpoint);
  }
}
