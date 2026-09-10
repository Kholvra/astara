import type { Prisma, PrismaClient } from "../../../generated/prisma";

import {
  decidePublicationFromStatusFacts,
  getGtfsConsumerStatus,
} from "~/core/ingestion/gtfsLifecycle";
import type {
  FreshnessPolicy,
  GtfsAccessEvidenceAssociation,
  GtfsSnapshot,
  GtfsSnapshotMetadata,
  GtfsStatusFacts,
  GtfsValidationResult,
  PublicationDecision,
} from "~/core/ingestion/gtfsTypes";

import {
  gtfsSnapshotInclude,
  mapAccessEvidenceAssociation,
  mapGtfsSnapshotRow,
} from "./gtfsSnapshotMapper";
import {
  assertCandidateInput,
  assertEvidenceInput,
  ACTIVE_SLOT,
  isKnownRequestError,
  mapRecoveryRecord,
  mapStatusFacts,
  readActiveStatusFacts,
  recoverySelect,
  rebuildStoredDecision,
  runSerializableTransaction,
  setActiveSnapshot,
  toDate,
  unavailableRecoveryDecision,
  withPersistedDecisionIssues,
  writePublicationDecision,
} from "./gtfsSnapshotRepositorySupport";
import {
  GtfsSnapshotConflictError,
  GtfsSnapshotRepositoryError,
} from "./gtfsSnapshotRepositoryErrors";
import {
  persistGtfsSnapshot,
  type GtfsSnapshotWriteInput,
} from "./gtfsSnapshotWrites";

export type GtfsCandidatePersistenceInput = Readonly<{
  candidate: GtfsValidationResult;
  metadata: GtfsSnapshotMetadata;
  serviceDate: string;
  rawStorageKey: string;
  now: string;
  policy: FreshnessPolicy;
}>;

export type GtfsRecoveryRecord = Readonly<{
  snapshotId: string;
  metadata: GtfsSnapshotMetadata;
  serviceDate: string;
  rawStorageKey: string;
  validationState: "accepted" | "rejected";
}>;

export type GtfsSnapshotRepository = Readonly<{
  persistCandidate(
    input: GtfsCandidatePersistenceInput,
  ): Promise<PublicationDecision>;
  getActiveSnapshot(): Promise<GtfsSnapshot | undefined>;
  getActiveStatusFacts(): Promise<GtfsStatusFacts | undefined>;
  getRecoveryRecord(
    snapshotId: string,
  ): Promise<GtfsRecoveryRecord | undefined>;
  activateStoredSnapshot(
    snapshotId: string,
    now: string,
    policy: FreshnessPolicy,
  ): Promise<PublicationDecision>;
  saveAccessEvidenceAssociation(
    input: GtfsAccessEvidenceAssociation,
  ): Promise<GtfsAccessEvidenceAssociation>;
}>;

export { GtfsSnapshotConflictError, GtfsSnapshotRepositoryError };

export function createGtfsSnapshotRepository(
  database: PrismaClient,
): GtfsSnapshotRepository {
  return {
    persistCandidate: (input) => persistCandidate(database, input),
    getActiveSnapshot: () => getActiveSnapshot(database),
    getActiveStatusFacts: () => readActiveStatusFacts(database),
    getRecoveryRecord: (snapshotId) => getRecoveryRecord(database, snapshotId),
    activateStoredSnapshot: (snapshotId, now, policy) =>
      activateStoredSnapshot(database, snapshotId, now, policy),
    saveAccessEvidenceAssociation: (input) =>
      saveAccessEvidenceAssociation(database, input),
  };
}

async function persistCandidate(
  database: PrismaClient,
  input: GtfsCandidatePersistenceInput,
): Promise<PublicationDecision> {
  assertCandidateInput(input);
  return runSerializableTransaction(database, (transaction) =>
    persistCandidateInTransaction(transaction, input),
  );
}

async function persistCandidateInTransaction(
  transaction: Prisma.TransactionClient,
  input: GtfsCandidatePersistenceInput,
): Promise<PublicationDecision> {
  const existing = await transaction.gtfsSnapshot.findUnique({
    where: { snapshotId: input.metadata.snapshotId },
    select: {
      snapshotId: true,
      sourceUrl: true,
      acquiredAt: true,
      contentHash: true,
      httpEtag: true,
      httpLastModified: true,
      feedVersion: true,
      serviceDate: true,
      rawStorageKey: true,
      validationIssues: true,
      publicationDecisions: {
        orderBy: { decidedAt: "desc" },
        take: 1,
      },
    },
  });

  if (existing) {
    if (existing.contentHash !== input.metadata.contentHash) {
      throw new GtfsSnapshotConflictError(
        "Snapshot ID already exists with a different content hash.",
      );
    }
    assertReplayMetadata(existing, input);
    return rebuildStoredDecision(transaction, input, existing);
  }

  const current = await readActiveStatusFacts(transaction);
  const decision = decidePublicationFromStatusFacts(
    input.candidate,
    current,
    input.now,
    input.policy,
  );
  const candidateToStore = withPersistedDecisionIssues(
    input.candidate,
    decision.rejectionIssues,
  );
  const writeInput: GtfsSnapshotWriteInput = {
    metadata: input.metadata,
    serviceDate: input.serviceDate,
    rawStorageKey: input.rawStorageKey,
    validationCompletedAt: input.now,
    candidate: candidateToStore,
  };

  await persistGtfsSnapshot(transaction, writeInput);
  if (decision.outcome === "published") {
    await setActiveSnapshot(transaction, input.metadata.snapshotId, input.now);
    activeSnapshotCache = null;
  }
  await writePublicationDecision(transaction, input, decision);
  return decision;
}

function assertReplayMetadata(
  existing: {
    snapshotId: string;
    sourceUrl: string;
    acquiredAt: string;
    contentHash: string;
    httpEtag: string | null;
    httpLastModified: string | null;
    feedVersion: string | null;
    serviceDate: string;
    rawStorageKey: string;
  },
  input: GtfsCandidatePersistenceInput,
): void {
  const matches =
    existing.snapshotId === input.metadata.snapshotId &&
    existing.sourceUrl === input.metadata.sourceUrl &&
    existing.acquiredAt === input.metadata.acquiredAt &&
    existing.contentHash === input.metadata.contentHash &&
    existing.httpEtag === (input.metadata.httpMetadata?.etag ?? null) &&
    existing.httpLastModified ===
      (input.metadata.httpMetadata?.lastModified ?? null) &&
    existing.feedVersion === (input.metadata.feedVersion ?? null) &&
    existing.serviceDate === input.serviceDate &&
    existing.rawStorageKey === input.rawStorageKey;
  if (!matches) {
    throw new GtfsSnapshotConflictError(
      "Snapshot ID already exists with different provenance or storage metadata.",
    );
  }
}

let activeSnapshotCache: { snapshotId: string; snapshot: GtfsSnapshot } | null =
  null;

export function clearActiveSnapshotCache(): void {
  activeSnapshotCache = null;
}

async function getActiveSnapshot(
  database: PrismaClient,
): Promise<GtfsSnapshot | undefined> {
  const pointer = await database.gtfsActiveSnapshot.findUnique({
    where: { slot: ACTIVE_SLOT },
    select: { snapshotId: true },
  });
  if (!pointer) {
    activeSnapshotCache = null;
    return undefined;
  }
  if (activeSnapshotCache?.snapshotId === pointer.snapshotId) {
    return activeSnapshotCache.snapshot;
  }

  const row = await database.gtfsSnapshot.findUnique({
    where: { snapshotId: pointer.snapshotId },
    include: gtfsSnapshotInclude,
  });
  if (!row) {
    activeSnapshotCache = null;
    return undefined;
  }
  const snapshot = mapGtfsSnapshotRow(row);
  activeSnapshotCache = { snapshotId: pointer.snapshotId, snapshot };
  return snapshot;
}

async function getRecoveryRecord(
  database: PrismaClient,
  snapshotId: string,
): Promise<GtfsRecoveryRecord | undefined> {
  const row = await database.gtfsSnapshot.findUnique({
    where: { snapshotId },
    select: recoverySelect,
  });
  return row ? mapRecoveryRecord(row) : undefined;
}

async function activateStoredSnapshot(
  database: PrismaClient,
  snapshotId: string,
  now: string,
  policy: FreshnessPolicy,
): Promise<PublicationDecision> {
  if (snapshotId.trim().length === 0) {
    return unavailableRecoveryDecision(
      "A snapshot ID is required for recovery.",
    );
  }

  return runSerializableTransaction(database, (transaction) =>
    activateStoredSnapshotInTransaction(transaction, snapshotId, now, policy),
  );
}

async function activateStoredSnapshotInTransaction(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  now: string,
  policy: FreshnessPolicy,
): Promise<PublicationDecision> {
  const row = await transaction.gtfsSnapshot.findUnique({
    where: { snapshotId },
    select: recoverySelect,
  });
  if (!row) {
    return unavailableRecoveryDecision(
      "The requested snapshot is not installed; manual re-import is required.",
    );
  }
  if (row.validationState !== "ACCEPTED") {
    return unavailableRecoveryDecision(
      "The requested snapshot failed validation and cannot be activated.",
    );
  }

  const status = getGtfsConsumerStatus(mapStatusFacts(row), now, policy);
  if (status.networkAvailability === "unavailable") {
    return {
      outcome: "unavailable",
      rejectionIssues: [],
      rejectedCandidateId: snapshotId,
      status,
    };
  }

  const currentPointer = await transaction.gtfsActiveSnapshot.findUnique({
    where: { slot: ACTIVE_SLOT },
    select: { snapshotId: true },
  });
  if (currentPointer?.snapshotId !== snapshotId) {
    await setActiveSnapshot(transaction, snapshotId, now);
    activeSnapshotCache = null;
    await transaction.gtfsPublicationDecision.create({
      data: {
        candidateSnapshotId: snapshotId,
        outcome: "PUBLISHED",
        activeSnapshotId: snapshotId,
        decidedAt: toDate(now, "recovery decision time"),
        operatorReason: "Manual recovery activated a stored valid snapshot.",
      },
    });
  }

  return {
    outcome: "published",
    activeSnapshot: undefined,
    rejectionIssues: [],
    status,
  };
}

async function saveAccessEvidenceAssociation(
  database: PrismaClient,
  input: GtfsAccessEvidenceAssociation,
): Promise<GtfsAccessEvidenceAssociation> {
  assertEvidenceInput(input);
  const recordedAt = toDate(input.recordedAt, "evidence record time");
  try {
    const row = await database.gtfsAccessEvidenceAssociation.create({
      data: {
        evidenceVersionId: input.evidenceVersionId,
        transitSnapshotId: input.transitSnapshotId,
        recordedAt,
      },
    });
    return mapAccessEvidenceAssociation(row);
  } catch (error) {
    if (!isKnownRequestError(error, "P2002")) {
      throw new GtfsSnapshotRepositoryError(
        "Could not save access-evidence association.",
        error,
      );
    }

    const existing = await database.gtfsAccessEvidenceAssociation.findUnique({
      where: { evidenceVersionId: input.evidenceVersionId },
    });
    if (
      existing?.transitSnapshotId !== input.transitSnapshotId ||
      existing?.recordedAt.getTime() !== recordedAt.getTime()
    ) {
      throw new GtfsSnapshotConflictError(
        "Access-evidence version already points to a different snapshot.",
      );
    }
    return mapAccessEvidenceAssociation(existing);
  }
}
