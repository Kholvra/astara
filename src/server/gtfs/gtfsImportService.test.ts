import { describe, expect, it, vi } from "vitest";

import type {
  FreshnessPolicy,
  GtfsAccessEvidenceAssociation,
  GtfsSnapshot,
  GtfsValidationResult,
  PublicationDecision,
} from "~/core/ingestion/gtfsTypes";
import type { GtfsArchive } from "~/data/gtfs/readGtfsArchive";

import {
  createGtfsImportService,
  GtfsImportServiceError,
} from "./gtfsImportService";
import type { GtfsSnapshotRepository } from "./gtfsSnapshotRepository";

const policy: FreshnessPolicy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data statis demo; jadwal dapat berubah.",
};

const status: PublicationDecision["status"] = {
  networkAvailability: "available",
  freshness: "current",
  coverage: "limited",
  evidenceState: "limited",
  connectionState: "no-edge",
  timingSemantics: "interval",
  geometryState: "supported",
  activeSnapshotId: "snapshot-1",
  limitations: ["calendar_dates.txt is absent"],
};

function createArchive(): GtfsArchive {
  return {
    archiveBytes: new Uint8Array([1, 2, 3]),
    files: { "agency.txt": "agency_id\nA1\n" },
    memberNames: ["agency.txt"],
    contentHash: "a".repeat(64),
  };
}

function createSnapshot(): GtfsSnapshot {
  return {
    metadata: {
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.test/feed.zip",
      acquiredAt: "2026-09-09T00:00:00.000Z",
      contentHash: "a".repeat(64),
    },
    serviceDate: "2026-09-09",
    coverage: "limited",
    limitations: ["calendar_dates.txt is absent"],
    agencies: [],
    routes: [],
    stops: [],
    trips: [],
    stopTimes: [],
    calendars: [],
    calendarDates: [],
    frequencies: [],
    transfers: [],
    shapes: [],
    fareAttributes: [],
    fareRules: [],
  };
}

function createRepository(
  decision: PublicationDecision,
): GtfsSnapshotRepository {
  return {
    persistCandidate: vi.fn(async () => decision),
    getActiveSnapshot: vi.fn(async () => undefined),
    getActiveStatusFacts: vi.fn(async () => undefined),
    getRecoveryRecord: vi.fn(async () => undefined),
    activateStoredSnapshot: vi.fn(async () => decision),
    saveAccessEvidenceAssociation: vi.fn(
      async (input: GtfsAccessEvidenceAssociation) => input,
    ),
  };
}

function createAcceptedCandidate(): GtfsValidationResult {
  const snapshot = createSnapshot();
  return {
    candidateSnapshotId: snapshot.metadata.snapshotId,
    accepted: true,
    snapshot,
    issues: [],
    limitations: snapshot.limitations,
  };
}

describe("createGtfsImportService", () => {
  it("stores the raw bytes before persisting the normalized publication decision", async () => {
    const events: string[] = [];
    const repository = createRepository({
      outcome: "published",
      activeSnapshot: createSnapshot(),
      rejectionIssues: [],
      status,
    });
    const service = createGtfsImportService({
      readArchive: vi.fn(async () => {
        events.push("read");
        return createArchive();
      }),
      storage: {
        write: vi.fn(async () => {
          events.push("store");
          return `${"a".repeat(64)}.zip`;
        }),
        read: vi.fn(async () => new Uint8Array([1, 2, 3])),
      },
      repository: {
        ...repository,
        persistCandidate: vi.fn(async (): Promise<PublicationDecision> => {
          events.push("persist");
          return {
            outcome: "published",
            activeSnapshot: createSnapshot(),
            rejectionIssues: [],
            status,
          };
        }),
      },
      now: () => "2026-09-09T01:00:00.000Z",
      normalize: vi.fn(() => createAcceptedCandidate()),
    });

    const result = await service.importSnapshot({
      archivePath: "/imports/feed.zip",
      metadata: {
        snapshotId: "snapshot-1",
        sourceUrl: "https://example.test/feed.zip",
        acquiredAt: "2026-09-09T00:00:00.000Z",
      },
      validationConfig: {
        serviceDate: "2026-09-09",
        approvedSourceHosts: ["example.test"],
      },
      policy,
    });

    expect(events).toEqual(["read", "store", "persist"]);
    expect(result).toEqual(
      expect.objectContaining({
        snapshotId: "snapshot-1",
        contentHash: "a".repeat(64),
        accepted: true,
        outcome: "published",
      }),
    );
  });

  it("returns a rejected candidate with the repository fallback state", async () => {
    const rejected: GtfsValidationResult = {
      candidateSnapshotId: "snapshot-1",
      accepted: false,
      issues: [
        {
          code: "DATA-HARD-003",
          classification: "blocker",
          message: "Reference is missing.",
        },
      ],
      limitations: [],
    };
    const repository = createRepository({
      outcome: "fallback",
      rejectionIssues: rejected.issues,
      status,
    });
    const service = createGtfsImportService({
      readArchive: vi.fn(async () => createArchive()),
      storage: {
        write: vi.fn(async () => `${"a".repeat(64)}.zip`),
        read: vi.fn(async () => new Uint8Array([1, 2, 3])),
      },
      repository,
      normalize: () => rejected,
      now: () => "2026-09-09T01:00:00.000Z",
    });

    const result = await service.importSnapshot({
      archivePath: "/imports/feed.zip",
      metadata: {
        snapshotId: "snapshot-1",
        sourceUrl: "https://example.test/feed.zip",
        acquiredAt: "2026-09-09T00:00:00.000Z",
      },
      validationConfig: {
        serviceDate: "2026-09-09",
        approvedSourceHosts: ["example.test"],
      },
      policy,
    });

    expect(result.accepted).toBe(false);
    expect(result.outcome).toBe("fallback");
    expect(result.issues).toEqual(rejected.issues);
  });

  it("verifies the stored bytes before recovery activation", async () => {
    const events: string[] = [];
    const decision: PublicationDecision = {
      outcome: "published",
      rejectionIssues: [],
      status,
    };
    const repository: GtfsSnapshotRepository = {
      persistCandidate: vi.fn(async () => decision),
      getActiveSnapshot: vi.fn(async () => undefined),
      getActiveStatusFacts: vi.fn(async () => undefined),
      getRecoveryRecord: vi.fn(async () => {
        events.push("record");
        return {
          snapshotId: "snapshot-1",
          metadata: {
            snapshotId: "snapshot-1",
            sourceUrl: "https://example.test/feed.zip",
            acquiredAt: "2026-09-09T00:00:00.000Z",
            contentHash: "a".repeat(64),
          },
          serviceDate: "2026-09-09",
          rawStorageKey: `${"a".repeat(64)}.zip`,
          validationState: "accepted" as const,
        };
      }),
      activateStoredSnapshot: vi.fn(async () => {
        events.push("activate");
        return decision;
      }),
      saveAccessEvidenceAssociation: vi.fn(
        async (input: GtfsAccessEvidenceAssociation) => input,
      ),
    };
    const service = createGtfsImportService({
      readArchive: vi.fn(async () => createArchive()),
      storage: {
        write: vi.fn(async () => `${"a".repeat(64)}.zip`),
        read: vi.fn(async () => {
          events.push("verify");
          return new Uint8Array([1, 2, 3]);
        }),
      },
      repository,
      now: () => "2026-09-09T01:00:00.000Z",
    });

    const result = await service.recoverSnapshot("snapshot-1", policy);

    expect(events).toEqual(["record", "verify", "activate"]);
    expect(result.outcome).toBe("published");
  });

  it("does not read storage when the requested recovery record is absent", async () => {
    const read = vi.fn(async () => new Uint8Array());
    const service = createGtfsImportService({
      readArchive: vi.fn(async () => createArchive()),
      storage: {
        write: vi.fn(async () => `${"a".repeat(64)}.zip`),
        read,
      },
      repository: createRepository({
        outcome: "unavailable",
        rejectionIssues: [],
        status: {
          ...status,
          networkAvailability: "unavailable",
        },
      }),
    });

    await expect(service.recoverSnapshot("missing", policy)).rejects.toEqual(
      expect.any(GtfsImportServiceError),
    );
    expect(read).not.toHaveBeenCalled();
  });
});
