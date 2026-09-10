import {
  getGtfsConsumerStatus,
  getUnavailableGtfsStatus,
} from "~/core/ingestion/gtfsLifecycle";
import type {
  FreshnessPolicy,
  GtfsConsumerStatus,
} from "~/core/ingestion/gtfsTypes";

import {
  evaluateGtfsAccessEvidence,
  type GtfsAccessEvidenceStatus,
} from "./gtfsAccessEvidence";
import type { GtfsSnapshotRepository } from "./gtfsSnapshotRepository";

export type GtfsStatusView = Readonly<{
  status: GtfsConsumerStatus;
  accessEvidence: GtfsAccessEvidenceStatus;
  snapshot?: Readonly<{
    snapshotId: string;
    sourceUrl: string;
    acquiredAt: string;
    serviceDate: string;
    contentHash: string;
    feedVersion?: string;
  }>;
}>;

export type GtfsStatusServiceDependencies = Readonly<{
  repository: GtfsSnapshotRepository;
  policy: FreshnessPolicy;
  now?: () => string;
}>;

export type GtfsStatusService = Readonly<{
  getStatus(): Promise<GtfsStatusView>;
}>;

export function createGtfsStatusService(
  dependencies: GtfsStatusServiceDependencies,
): GtfsStatusService {
  const now = dependencies.now ?? (() => new Date().toISOString());
  return {
    getStatus: async () => {
      const facts = await dependencies.repository.getActiveStatusFacts();
      if (!facts) {
        return {
          status: getUnavailableGtfsStatus(
            "No valid snapshot is active; manual recovery is required.",
          ),
          accessEvidence: evaluateGtfsAccessEvidence(undefined, undefined),
        };
      }

      const accessEvidence = evaluateGtfsAccessEvidence(
        facts.metadata.snapshotId,
        facts.accessEvidence,
      );
      const baseStatus = getGtfsConsumerStatus(
        facts,
        now(),
        dependencies.policy,
      );
      const status: GtfsConsumerStatus = {
        ...baseStatus,
        evidenceState: accessEvidence.evidenceState,
        accessEvidenceVersionId: accessEvidence.evidenceVersionId,
        accessEvidenceTransitSnapshotId: accessEvidence.transitSnapshotId,
      };

      return {
        status,
        accessEvidence,
        ...(status.networkAvailability === "available"
          ? { snapshot: toSnapshotSummary(facts) }
          : {}),
      };
    },
  };
}

function toSnapshotSummary(
  facts: Parameters<typeof getGtfsConsumerStatus>[0],
): NonNullable<GtfsStatusView["snapshot"]> {
  return {
    snapshotId: facts.metadata.snapshotId,
    sourceUrl: facts.metadata.sourceUrl,
    acquiredAt: facts.metadata.acquiredAt,
    serviceDate: facts.serviceDate,
    contentHash: facts.metadata.contentHash,
    ...(facts.metadata.feedVersion
      ? { feedVersion: facts.metadata.feedVersion }
      : {}),
  };
}
