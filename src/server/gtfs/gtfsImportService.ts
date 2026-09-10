import {
  normalizeGtfsFiles,
  type GtfsNormalizationInput,
} from "~/core/ingestion/gtfsNormalizer";
import type {
  FreshnessPolicy,
  GtfsConsumerStatus,
  GtfsSnapshotMetadata,
  GtfsValidationConfig,
  GtfsValidationIssue,
  GtfsValidationResult,
} from "~/core/ingestion/gtfsTypes";
import type { GtfsArchive } from "~/data/gtfs/readGtfsArchive";
import type { GtfsRawSnapshotStorage } from "~/data/gtfs/gtfsRawSnapshotStorage";

import type { GtfsSnapshotRepository } from "./gtfsSnapshotRepository";

export type GtfsImportInput = Readonly<{
  archivePath: string;
  metadata: Omit<GtfsSnapshotMetadata, "contentHash">;
  validationConfig: GtfsValidationConfig;
  policy: FreshnessPolicy;
}>;

export type GtfsImportResult = Readonly<{
  snapshotId: string;
  contentHash: string;
  rawStorageKey: string;
  accepted: boolean;
  outcome: "published" | "fallback" | "unavailable";
  status: GtfsConsumerStatus;
  issues: readonly GtfsValidationIssue[];
  limitations: readonly string[];
}>;

export type GtfsImportServiceDependencies = Readonly<{
  readArchive: (archivePath: string) => Promise<GtfsArchive>;
  storage: GtfsRawSnapshotStorage;
  repository: GtfsSnapshotRepository;
  now?: () => string;
  normalize?: (input: GtfsNormalizationInput) => GtfsValidationResult;
}>;

export class GtfsImportServiceError extends Error {
  public readonly cause: unknown;

  public constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GtfsImportServiceError";
    this.cause = cause;
  }
}

export type GtfsImportService = Readonly<{
  importSnapshot(input: GtfsImportInput): Promise<GtfsImportResult>;
  recoverSnapshot(
    snapshotId: string,
    policy: FreshnessPolicy,
  ): Promise<GtfsImportResult>;
}>;

export function createGtfsImportService(
  dependencies: GtfsImportServiceDependencies,
): GtfsImportService {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const normalize = dependencies.normalize ?? normalizeGtfsFiles;

  return {
    importSnapshot: (input) =>
      importSnapshot(dependencies, normalize, now, input),
    recoverSnapshot: (snapshotId, policy) =>
      recoverSnapshot(dependencies, now, snapshotId, policy),
  };
}

async function importSnapshot(
  dependencies: GtfsImportServiceDependencies,
  normalize: (input: GtfsNormalizationInput) => GtfsValidationResult,
  now: () => string,
  input: GtfsImportInput,
): Promise<GtfsImportResult> {
  assertImportInput(input);
  const archive = await dependencies.readArchive(input.archivePath);
  const metadata: GtfsSnapshotMetadata = {
    ...input.metadata,
    contentHash: archive.contentHash,
  };
  const rawStorageKey = await dependencies.storage.write(
    archive.contentHash,
    archive.archiveBytes,
  );
  const candidate = normalize({
    files: archive.files,
    metadata,
    config: input.validationConfig,
  });
  const decision = await dependencies.repository.persistCandidate({
    candidate,
    metadata,
    serviceDate:
      candidate.snapshot?.serviceDate ?? input.validationConfig.serviceDate,
    rawStorageKey,
    now: now(),
    policy: input.policy,
  });

  return {
    snapshotId: metadata.snapshotId,
    contentHash: metadata.contentHash,
    rawStorageKey,
    accepted: candidate.accepted,
    outcome: decision.outcome,
    status: decision.status,
    issues:
      decision.rejectionIssues.length > 0
        ? decision.rejectionIssues
        : candidate.issues,
    limitations: candidate.limitations,
  };
}

async function recoverSnapshot(
  dependencies: GtfsImportServiceDependencies,
  now: () => string,
  snapshotId: string,
  policy: FreshnessPolicy,
): Promise<GtfsImportResult> {
  if (snapshotId.trim().length === 0) {
    throw new GtfsImportServiceError("A snapshot ID is required for recovery.");
  }
  const record = await dependencies.repository.getRecoveryRecord(snapshotId);
  if (!record) {
    throw new GtfsImportServiceError(
      "The requested snapshot is not installed; manual re-import is required.",
    );
  }

  await dependencies.storage.read(
    record.rawStorageKey,
    record.metadata.contentHash,
  );
  const decision = await dependencies.repository.activateStoredSnapshot(
    snapshotId,
    now(),
    policy,
  );

  return {
    snapshotId,
    contentHash: record.metadata.contentHash,
    rawStorageKey: record.rawStorageKey,
    accepted: record.validationState === "accepted",
    outcome: decision.outcome,
    status: decision.status,
    issues: [],
    limitations: decision.status.limitations,
  };
}

function assertImportInput(input: GtfsImportInput): void {
  if (
    input.archivePath.trim().length === 0 ||
    input.metadata.snapshotId.trim().length === 0 ||
    input.metadata.sourceUrl.trim().length === 0 ||
    input.metadata.acquiredAt.trim().length === 0
  ) {
    throw new GtfsImportServiceError(
      "Archive path and snapshot provenance fields are required.",
    );
  }
}
