import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "../../../generated/prisma";
import type {
  FreshnessPolicy,
  GtfsSnapshot,
  GtfsValidationResult,
} from "~/core/ingestion/gtfsTypes";

import {
  createGtfsSnapshotRepository,
  GtfsSnapshotConflictError,
} from "./gtfsSnapshotRepository";
import { runSerializableTransaction } from "./gtfsSnapshotRepositorySupport";

const policy: FreshnessPolicy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data statis demo; jadwal dapat berubah.",
};

type FakeState = {
  snapshots: Map<
    string,
    { contentHash: string; validationState: "ACCEPTED" | "REJECTED" }
  >;
  activeSnapshotId: string | undefined;
  publicationDecisions: Array<{ candidateSnapshotId: string; outcome: string }>;
};

function createFakeDatabase(initialActiveSnapshotId?: string): {
  database: PrismaClient;
  state: FakeState;
} {
  const state: FakeState = {
    snapshots: new Map(),
    activeSnapshotId: initialActiveSnapshotId,
    publicationDecisions: [],
  };
  const statusRows = new Map<string, object>();
  if (initialActiveSnapshotId) {
    statusRows.set(
      initialActiveSnapshotId,
      createStatusRow(initialActiveSnapshotId),
    );
  }
  const database = {
    $transaction: vi.fn(
      async (work: (transaction: unknown) => Promise<unknown>) =>
        work(database),
    ),
    gtfsActiveSnapshot: {
      findUnique: vi.fn(async () =>
        state.activeSnapshotId ? { snapshotId: state.activeSnapshotId } : null,
      ),
      upsert: vi.fn(async (args: { create: { snapshotId: string } }) => {
        state.activeSnapshotId = args.create.snapshotId;
        return { snapshotId: state.activeSnapshotId };
      }),
    },
    gtfsSnapshot: {
      findUnique: vi.fn(
        async (args: {
          where: { snapshotId: string };
          select?: Record<string, unknown>;
        }) => {
          const snapshotId = args.where.snapshotId;
          if (args.select?.publicationDecisions) {
            const stored = state.snapshots.get(snapshotId);
            if (!stored) {
              return null;
            }
            return {
              snapshotId,
              sourceUrl: "https://example.test/feed.zip",
              acquiredAt: "2026-09-09T00:00:00.000Z",
              contentHash: stored.contentHash,
              httpEtag: null,
              httpLastModified: null,
              feedVersion: null,
              serviceDate: "2026-09-09",
              rawStorageKey: `${stored.contentHash}.zip`,
              validationIssues: [],
              publicationDecisions: state.publicationDecisions
                .filter(
                  (decision) => decision.candidateSnapshotId === snapshotId,
                )
                .map((decision) => ({
                  outcome:
                    decision.outcome === "published" ||
                    decision.outcome === "PUBLISHED"
                      ? "PUBLISHED"
                      : decision.outcome === "fallback" ||
                          decision.outcome === "FALLBACK"
                        ? "FALLBACK"
                        : "UNAVAILABLE",
                })),
            };
          }
          if (args.select?.frequencies) {
            return statusRows.get(snapshotId) ?? null;
          }
          return null;
        },
      ),
      create: vi.fn(
        async (args: {
          data: {
            snapshotId: string;
            contentHash: string;
            validationState: "ACCEPTED" | "REJECTED";
          };
        }) => {
          state.snapshots.set(args.data.snapshotId, {
            contentHash: args.data.contentHash,
            validationState: args.data.validationState,
          });
          statusRows.set(
            args.data.snapshotId,
            createStatusRow(args.data.snapshotId),
          );
          return args.data;
        },
      ),
    },
    gtfsPublicationDecision: {
      create: vi.fn(
        async (args: {
          data: { candidateSnapshotId: string; outcome: string };
        }) => {
          state.publicationDecisions.push(args.data);
          return args.data;
        },
      ),
    },
    gtfsValidationIssue: { createMany: vi.fn() },
    gtfsAgency: { createMany: vi.fn() },
    gtfsRoute: { createMany: vi.fn() },
    gtfsStop: { createMany: vi.fn() },
    gtfsTrip: { createMany: vi.fn() },
    gtfsStopTime: { createMany: vi.fn() },
    gtfsCalendar: { createMany: vi.fn() },
    gtfsCalendarDate: { createMany: vi.fn() },
    gtfsFrequency: { createMany: vi.fn() },
    gtfsTransfer: { createMany: vi.fn() },
    gtfsShapePoint: { createMany: vi.fn() },
    gtfsFareAttribute: { createMany: vi.fn() },
    gtfsFareRule: { createMany: vi.fn() },
    gtfsAccessEvidenceAssociation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;
  return { database, state };
}

function createStatusRow(snapshotId: string): object {
  return {
    snapshotId,
    sourceUrl: "https://example.test/feed.zip",
    acquiredAt: "2026-09-09T00:00:00.000Z",
    contentHash: "a".repeat(64),
    httpEtag: null,
    httpLastModified: null,
    feedVersion: null,
    serviceDate: "2026-09-09",
    coverage: "LIMITED",
    limitations: [],
    frequencies: [],
    shapes: [],
    accessEvidenceAssociations: [],
  };
}

function createSnapshot(
  snapshotId: string,
  contentHash = "a".repeat(64),
): GtfsSnapshot {
  return {
    metadata: {
      snapshotId,
      sourceUrl: "https://example.test/feed.zip",
      acquiredAt: "2026-09-09T00:00:00.000Z",
      contentHash,
    },
    serviceDate: "2026-09-09",
    coverage: "limited",
    limitations: [],
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

function createCandidate(
  snapshotId: string,
  accepted: boolean,
  contentHash = "a".repeat(64),
): GtfsValidationResult {
  const snapshot = createSnapshot(snapshotId, contentHash);
  return {
    candidateSnapshotId: snapshotId,
    accepted,
    ...(accepted ? { snapshot } : {}),
    issues: accepted
      ? []
      : [
          {
            code: "DATA-HARD-003",
            classification: "blocker",
            message: "Reference is missing.",
          },
        ],
    limitations: [],
  };
}

function createInput(
  candidate: GtfsValidationResult,
  contentHash = "a".repeat(64),
) {
  return {
    candidate,
    metadata: {
      snapshotId: candidate.candidateSnapshotId,
      sourceUrl: "https://example.test/feed.zip",
      acquiredAt: "2026-09-09T00:00:00.000Z",
      contentHash,
    },
    serviceDate: "2026-09-09",
    rawStorageKey: `${contentHash}.zip`,
    now: "2026-09-09T01:00:00.000Z",
    policy,
  };
}

describe("createGtfsSnapshotRepository", () => {
  it("publishes an accepted candidate and makes the replay idempotent", async () => {
    const { database, state } = createFakeDatabase();
    const repository = createGtfsSnapshotRepository(database);
    const input = createInput(createCandidate("snapshot-1", true));

    const first = await repository.persistCandidate(input);
    const second = await repository.persistCandidate(input);

    expect(first.outcome).toBe("published");
    expect(second.outcome).toBe("published");
    expect(state.activeSnapshotId).toBe("snapshot-1");
    expect(state.snapshots.size).toBe(1);
    expect(state.publicationDecisions).toHaveLength(1);
  });

  it("keeps the active snapshot when a candidate is rejected", async () => {
    const { database, state } = createFakeDatabase("current");
    const repository = createGtfsSnapshotRepository(database);
    state.snapshots.set("current", {
      contentHash: "b".repeat(64),
      validationState: "ACCEPTED",
    });

    const decision = await repository.persistCandidate(
      createInput(createCandidate("rejected", false)),
    );

    expect(decision.outcome).toBe("fallback");
    expect(decision.status.activeSnapshotId).toBe("current");
    expect(state.activeSnapshotId).toBe("current");
    expect(state.snapshots.get("rejected")?.validationState).toBe("REJECTED");
  });

  it("fails closed when an accepted candidate has no normalized snapshot", async () => {
    const { database, state } = createFakeDatabase();
    const repository = createGtfsSnapshotRepository(database);
    const candidate: GtfsValidationResult = {
      candidateSnapshotId: "broken",
      accepted: true,
      issues: [],
      limitations: [],
    };

    const decision = await repository.persistCandidate(createInput(candidate));

    expect(decision.outcome).toBe("unavailable");
    expect(state.snapshots.get("broken")?.validationState).toBe("REJECTED");
    expect(state.activeSnapshotId).toBeUndefined();
    expect(decision.rejectionIssues).toEqual([
      expect.objectContaining({ code: "DATA-HARD-999" }),
    ]);
  });

  it("rejects a replay with a different content hash before mutation", async () => {
    const { database, state } = createFakeDatabase();
    const repository = createGtfsSnapshotRepository(database);
    await repository.persistCandidate(
      createInput(createCandidate("snapshot-1", true)),
    );
    const createCalls = (
      database.gtfsSnapshot.create as unknown as {
        mock: { calls: unknown[][] };
      }
    ).mock.calls.length;

    await expect(
      repository.persistCandidate(
        createInput(
          createCandidate("snapshot-1", true, "b".repeat(64)),
          "b".repeat(64),
        ),
      ),
    ).rejects.toBeInstanceOf(GtfsSnapshotConflictError);

    expect(
      (
        database.gtfsSnapshot.create as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock.calls,
    ).toHaveLength(createCalls);
    expect(state.publicationDecisions).toHaveLength(1);
  });

  it("rejects a replay with changed provenance before mutation", async () => {
    const { database } = createFakeDatabase();
    const repository = createGtfsSnapshotRepository(database);
    const input = createInput(createCandidate("snapshot-1", true));
    await repository.persistCandidate(input);

    await expect(
      repository.persistCandidate({
        ...input,
        metadata: {
          ...input.metadata,
          sourceUrl: "https://other.example.test/feed.zip",
        },
      }),
    ).rejects.toBeInstanceOf(GtfsSnapshotConflictError);
  });

  it("retries a concurrent unique-key race within the transaction budget", async () => {
    let attempts = 0;
    const database = {
      $transaction: vi.fn(
        async (work: (transaction: unknown) => Promise<unknown>) => {
          attempts += 1;
          if (attempts === 1) {
            throw new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed.",
              { code: "P2002", clientVersion: "test" },
            );
          }
          return work({});
        },
      ),
    } as unknown as PrismaClient;

    await expect(
      runSerializableTransaction(database, async () => "committed"),
    ).resolves.toBe("committed");
    expect(attempts).toBe(2);
  });
});
