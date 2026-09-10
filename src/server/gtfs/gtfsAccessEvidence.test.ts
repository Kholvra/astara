import { describe, expect, it } from "vitest";

import { evaluateGtfsAccessEvidence } from "./gtfsAccessEvidence";

const association = {
  evidenceVersionId: "access-v1",
  transitSnapshotId: "snapshot-1",
  recordedAt: "2026-09-09T00:00:00.000Z",
} as const;

describe("evaluateGtfsAccessEvidence", () => {
  it("verifies an association only when its transit snapshot matches", () => {
    expect(evaluateGtfsAccessEvidence("snapshot-1", association)).toEqual({
      evidenceState: "Terverifikasi",
      evidenceVersionId: "access-v1",
      transitSnapshotId: "snapshot-1",
      reason: "Access evidence is associated with the active transit snapshot.",
    });
  });

  it("keeps absent and mismatched evidence limited without blocking transit", () => {
    expect(evaluateGtfsAccessEvidence("snapshot-1", undefined)).toEqual(
      expect.objectContaining({ evidenceState: "limited" }),
    );
    expect(
      evaluateGtfsAccessEvidence("snapshot-1", {
        ...association,
        transitSnapshotId: "snapshot-old",
      }),
    ).toEqual(
      expect.objectContaining({
        evidenceState: "limited",
        transitSnapshotId: "snapshot-old",
      }),
    );
  });

  it("returns unknown when no transit snapshot is active", () => {
    expect(evaluateGtfsAccessEvidence(undefined, association)).toEqual(
      expect.objectContaining({ evidenceState: "Unknown" }),
    );
  });
});
