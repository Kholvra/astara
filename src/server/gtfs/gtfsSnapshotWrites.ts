import type { Prisma } from "../../../generated/prisma";

import { isPublishableGtfsCandidate } from "~/core/ingestion/gtfsLifecycle";
import type {
  GtfsSnapshotMetadata,
  GtfsValidationResult,
} from "~/core/ingestion/gtfsTypes";

import {
  writeNormalizedSnapshot,
  writeValidationIssues,
} from "./gtfsSnapshotWriteRows";

export type GtfsSnapshotWriteInput = Readonly<{
  metadata: GtfsSnapshotMetadata;
  serviceDate: string;
  rawStorageKey: string;
  validationCompletedAt: string;
  candidate: GtfsValidationResult;
}>;

export async function persistGtfsSnapshot(
  transaction: Prisma.TransactionClient,
  input: GtfsSnapshotWriteInput,
): Promise<void> {
  const snapshot = input.candidate.snapshot;
  await transaction.gtfsSnapshot.create({
    data: {
      snapshotId: input.metadata.snapshotId,
      sourceUrl: input.metadata.sourceUrl,
      acquiredAt: input.metadata.acquiredAt,
      contentHash: input.metadata.contentHash,
      httpEtag: input.metadata.httpMetadata?.etag ?? null,
      httpLastModified: input.metadata.httpMetadata?.lastModified ?? null,
      feedVersion: input.metadata.feedVersion ?? null,
      serviceDate: input.serviceDate,
      coverage: snapshot?.coverage === "complete" ? "COMPLETE" : "LIMITED",
      limitations: [...input.candidate.limitations],
      rawStorageKey: input.rawStorageKey,
      validationState: isPublishableGtfsCandidate(input.candidate)
        ? "ACCEPTED"
        : "REJECTED",
      validationCompletedAt: input.validationCompletedAt,
    },
  });

  await writeValidationIssues(
    transaction,
    input.metadata.snapshotId,
    input.candidate.issues,
  );
  if (snapshot) {
    await writeNormalizedSnapshot(transaction, snapshot);
  }
}
