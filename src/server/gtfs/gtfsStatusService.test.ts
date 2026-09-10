import { describe, expect, it, vi } from "vitest";

import type { FreshnessPolicy } from "~/core/ingestion/gtfsTypes";

import type { GtfsSnapshotRepository } from "./gtfsSnapshotRepository";
import { createGtfsStatusService } from "./gtfsStatusService";

const policy: FreshnessPolicy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data statis demo; jadwal dapat berubah.",
};

function createRepository(
  facts: Awaited<ReturnType<GtfsSnapshotRepository["getActiveStatusFacts"]>>,
): GtfsSnapshotRepository {
  return {
    getActiveStatusFacts: vi.fn(async () => facts),
    getActiveSnapshot: vi.fn(async () => undefined),
    persistCandidate: vi.fn(),
    getRecoveryRecord: vi.fn(),
    activateStoredSnapshot: vi.fn(),
    saveAccessEvidenceAssociation: vi.fn(),
  };
}

describe("createGtfsStatusService", () => {
  it("returns a summary without normalized records or raw bytes", async () => {
    const repository = createRepository({
      metadata: {
        snapshotId: "snapshot-1",
        sourceUrl: "https://example.test/feed.zip",
        acquiredAt: "2026-09-09T00:00:00.000Z",
        contentHash: "a".repeat(64),
        feedVersion: "v1",
      },
      serviceDate: "2026-09-09",
      coverage: "limited",
      limitations: ["calendar_dates.txt is absent"],
      hasIntervalFrequencies: true,
      hasShapeGeometry: true,
      accessEvidence: {
        evidenceVersionId: "access-v1",
        transitSnapshotId: "snapshot-1",
        recordedAt: "2026-09-09T00:00:00.000Z",
      },
    });
    const service = createGtfsStatusService({
      repository,
      policy,
      now: () => "2026-09-09T01:00:00.000Z",
    });

    const result = await service.getStatus();

    expect(result.status).toEqual(
      expect.objectContaining({
        networkAvailability: "available",
        activeSnapshotId: "snapshot-1",
        evidenceState: "Terverifikasi",
        timingSemantics: "interval",
      }),
    );
    expect(result.accessEvidence).toEqual(
      expect.objectContaining({
        evidenceVersionId: "access-v1",
        transitSnapshotId: "snapshot-1",
      }),
    );
    expect(result.snapshot).toEqual(
      expect.objectContaining({ serviceDate: "2026-09-09" }),
    );
    expect(result).not.toHaveProperty("stops");
    expect(result).not.toHaveProperty("archiveBytes");
  });

  it("returns explicit unavailable state when no active snapshot exists", async () => {
    const service = createGtfsStatusService({
      repository: createRepository(undefined),
      policy,
      now: () => "2026-09-09T01:00:00.000Z",
    });

    const result = await service.getStatus();

    expect(result.status.networkAvailability).toBe("unavailable");
    expect(result.status.operatorReason).toContain("manual recovery");
    expect(result.snapshot).toBeUndefined();
    expect(result.accessEvidence.evidenceState).toBe("Unknown");
  });
});
