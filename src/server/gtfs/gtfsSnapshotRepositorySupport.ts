import { Prisma, type GtfsPublicationOutcome } from "../../../generated/prisma";
import type { PrismaClient } from "../../../generated/prisma";

import {
  getGtfsConsumerStatus,
  getUnavailableGtfsStatus,
} from "~/core/ingestion/gtfsLifecycle";
import type {
  GtfsAccessEvidenceAssociation,
  GtfsSnapshotMetadata,
  GtfsStatusFacts,
  GtfsValidationIssue,
  GtfsValidationResult,
  PublicationDecision,
} from "~/core/ingestion/gtfsTypes";

import { mapAccessEvidenceAssociation } from "./gtfsSnapshotMapper";
import type {
  GtfsCandidatePersistenceInput,
  GtfsRecoveryRecord,
} from "./gtfsSnapshotRepository";
import { GtfsSnapshotRepositoryError } from "./gtfsSnapshotRepositoryErrors";

export const ACTIVE_SLOT = 1;
const TRANSACTION_MAX_WAIT_MS = 5_000;
const TRANSACTION_TIMEOUT_MS = 120_000;
const MAX_SERIALIZATION_RETRIES = 2;

export async function readActiveStatusFacts(
  database: PrismaClient | Prisma.TransactionClient,
): Promise<GtfsStatusFacts | undefined> {
  const pointer = await database.gtfsActiveSnapshot.findUnique({
    where: { slot: ACTIVE_SLOT },
    select: { snapshotId: true },
  });
  return pointer ? readStatusFacts(database, pointer.snapshotId) : undefined;
}

export async function readStatusFacts(
  database: PrismaClient | Prisma.TransactionClient,
  snapshotId: string,
): Promise<GtfsStatusFacts | undefined> {
  const row = await database.gtfsSnapshot.findUnique({
    where: { snapshotId },
    select: statusSelect,
  });
  return row ? mapStatusFacts(row) : undefined;
}

export function mapStatusFacts(row: StatusRow): GtfsStatusFacts {
  const metadata: GtfsSnapshotMetadata = {
    snapshotId: row.snapshotId,
    sourceUrl: row.sourceUrl,
    acquiredAt: row.acquiredAt,
    contentHash: row.contentHash,
    ...(row.httpEtag || row.httpLastModified
      ? {
          httpMetadata: {
            etag: row.httpEtag ?? undefined,
            lastModified: row.httpLastModified ?? undefined,
          },
        }
      : {}),
    ...(row.feedVersion ? { feedVersion: row.feedVersion } : {}),
  };
  return {
    metadata,
    serviceDate: row.serviceDate,
    coverage: row.coverage === "COMPLETE" ? "complete" : "limited",
    limitations: row.limitations,
    hasIntervalFrequencies: row.frequencies.length > 0,
    hasShapeGeometry: row.shapes.length > 0,
    accessEvidence: row.accessEvidenceAssociations[0]
      ? mapAccessEvidenceAssociation(row.accessEvidenceAssociations[0])
      : undefined,
  };
}

export function mapRecoveryRecord(row: RecoveryRow): GtfsRecoveryRecord {
  const facts = mapStatusFacts(row);
  return {
    snapshotId: row.snapshotId,
    metadata: facts.metadata,
    serviceDate: row.serviceDate,
    rawStorageKey: row.rawStorageKey,
    validationState:
      row.validationState === "ACCEPTED" ? "accepted" : "rejected",
  };
}

export function withPersistedDecisionIssues(
  candidate: GtfsValidationResult,
  decisionIssues: readonly GtfsValidationIssue[],
): GtfsValidationResult {
  if (decisionIssues.length === 0) {
    return candidate;
  }
  const existingKeys = new Set(
    candidate.issues.map((issue) => issueKey(issue)),
  );
  const issues = [...candidate.issues];
  for (const issue of decisionIssues) {
    if (!existingKeys.has(issueKey(issue))) {
      issues.push(issue);
    }
  }
  return { ...candidate, issues };
}

export async function setActiveSnapshot(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  now: string,
): Promise<void> {
  await transaction.gtfsActiveSnapshot.upsert({
    where: { slot: ACTIVE_SLOT },
    create: {
      slot: ACTIVE_SLOT,
      snapshotId,
      activatedAt: toDate(now, "activation time"),
    },
    update: {
      snapshotId,
      activatedAt: toDate(now, "activation time"),
    },
  });
}

export async function writePublicationDecision(
  transaction: Prisma.TransactionClient,
  input: GtfsCandidatePersistenceInput,
  decision: PublicationDecision,
): Promise<void> {
  await transaction.gtfsPublicationDecision.create({
    data: {
      candidateSnapshotId: input.metadata.snapshotId,
      outcome: toPublicationOutcome(decision.outcome),
      activeSnapshotId: decision.status.activeSnapshotId ?? null,
      decidedAt: toDate(input.now, "publication decision time"),
      operatorReason: decision.status.operatorReason ?? null,
    },
  });
}

export async function rebuildStoredDecision(
  database: Prisma.TransactionClient,
  input: GtfsCandidatePersistenceInput,
  existing: ExistingRow,
): Promise<PublicationDecision> {
  const storedDecision = existing.publicationDecisions[0];
  if (!storedDecision) {
    throw new GtfsSnapshotRepositoryError(
      "Stored snapshot has no publication decision; manual inspection is required.",
    );
  }
  const current = await readActiveStatusFacts(database);
  const status = current
    ? getGtfsConsumerStatus(current, input.now, input.policy)
    : getUnavailableGtfsStatus(
        "No valid snapshot is active; manual recovery is required.",
      );
  const outcome = fromPublicationOutcome(storedDecision.outcome);
  return {
    outcome,
    activeSnapshot: undefined,
    rejectedCandidateId:
      outcome === "published" ? undefined : input.metadata.snapshotId,
    rejectionIssues:
      outcome === "published" ? [] : existing.validationIssues.map(mapIssue),
    status,
  };
}

export function unavailableRecoveryDecision(
  reason: string,
): PublicationDecision {
  return {
    outcome: "unavailable",
    rejectedCandidateId: undefined,
    rejectionIssues: [],
    status: getUnavailableGtfsStatus(reason),
  };
}

export function assertCandidateInput(
  input: GtfsCandidatePersistenceInput,
): void {
  const snapshot = input.candidate.snapshot;
  if (
    input.candidate.candidateSnapshotId !== input.metadata.snapshotId ||
    (snapshot?.metadata.snapshotId !== undefined &&
      snapshot.metadata.snapshotId !== input.metadata.snapshotId) ||
    (snapshot?.metadata.contentHash !== undefined &&
      snapshot.metadata.contentHash !== input.metadata.contentHash)
  ) {
    throw new GtfsSnapshotRepositoryError(
      "Candidate and metadata lineage do not match.",
    );
  }
  if (!/^[a-f0-9]{64}$/.test(input.metadata.contentHash)) {
    throw new GtfsSnapshotRepositoryError("Snapshot content hash is invalid.");
  }
  if (
    input.rawStorageKey.trim().length === 0 ||
    input.serviceDate.trim().length === 0 ||
    input.rawStorageKey !== `${input.metadata.contentHash.toLowerCase()}.zip`
  ) {
    throw new GtfsSnapshotRepositoryError(
      "Snapshot storage key and service date are required.",
    );
  }
}

export function assertEvidenceInput(
  input: GtfsAccessEvidenceAssociation,
): void {
  if (
    input.evidenceVersionId.trim().length === 0 ||
    input.transitSnapshotId.trim().length === 0
  ) {
    throw new GtfsSnapshotRepositoryError(
      "Evidence and transit snapshot IDs are required.",
    );
  }
}

export function toDate(value: string, label: string): Date {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new GtfsSnapshotRepositoryError(`Invalid ${label}.`);
  }
  return new Date(timestamp);
}

export function toPublicationOutcome(
  outcome: PublicationDecision["outcome"],
): GtfsPublicationOutcome {
  return outcome === "published"
    ? "PUBLISHED"
    : outcome === "fallback"
      ? "FALLBACK"
      : "UNAVAILABLE";
}

export function fromPublicationOutcome(
  outcome: GtfsPublicationOutcome,
): PublicationDecision["outcome"] {
  return outcome === "PUBLISHED"
    ? "published"
    : outcome === "FALLBACK"
      ? "fallback"
      : "unavailable";
}

export function mapIssue(
  row: ExistingRow["validationIssues"][number],
): GtfsValidationIssue {
  return {
    code: row.code,
    classification: row.classification === "BLOCKER" ? "blocker" : "warning",
    message: row.message,
    fileName: row.fileName ?? undefined,
    rowNumber: row.rowNumber ?? undefined,
    fieldName: row.fieldName ?? undefined,
  };
}

export function isKnownRequestError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export async function runSerializableTransaction<T>(
  database: PrismaClient,
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await database.$transaction(work, {
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryableConflict =
        isKnownRequestError(error, "P2034") ||
        isKnownRequestError(error, "P2002");
      if (!retryableConflict || attempt === MAX_SERIALIZATION_RETRIES) {
        throw error;
      }
    }
  }
  throw new GtfsSnapshotRepositoryError(
    "Transaction retry budget was exhausted.",
  );
}

function issueKey(issue: GtfsValidationIssue): string {
  return [
    issue.code,
    issue.fileName ?? "",
    issue.rowNumber ?? "",
    issue.fieldName ?? "",
    issue.message,
  ].join("|");
}

export const statusSelect = {
  snapshotId: true,
  sourceUrl: true,
  acquiredAt: true,
  contentHash: true,
  httpEtag: true,
  httpLastModified: true,
  feedVersion: true,
  serviceDate: true,
  coverage: true,
  limitations: true,
  frequencies: {
    where: { timingSemantics: "INTERVAL" },
    select: { snapshotId: true },
    take: 1,
  },
  shapes: { select: { snapshotId: true }, take: 1 },
  accessEvidenceAssociations: {
    orderBy: { recordedAt: "desc" },
    select: {
      evidenceVersionId: true,
      transitSnapshotId: true,
      recordedAt: true,
    },
    take: 1,
  },
} satisfies Prisma.GtfsSnapshotSelect;

export const recoverySelect = {
  ...statusSelect,
  serviceDate: true,
  rawStorageKey: true,
  validationState: true,
  validationIssues: true,
} satisfies Prisma.GtfsSnapshotSelect;

export type StatusRow = Prisma.GtfsSnapshotGetPayload<{
  select: typeof statusSelect;
}>;
export type RecoveryRow = Prisma.GtfsSnapshotGetPayload<{
  select: typeof recoverySelect;
}>;
export type ExistingRow = Prisma.GtfsSnapshotGetPayload<{
  select: {
    snapshotId: true;
    sourceUrl: true;
    acquiredAt: true;
    contentHash: true;
    httpEtag: true;
    httpLastModified: true;
    feedVersion: true;
    serviceDate: true;
    rawStorageKey: true;
    validationIssues: true;
    publicationDecisions: {
      orderBy: { decidedAt: "desc" };
      take: 1;
    };
  };
}>;
