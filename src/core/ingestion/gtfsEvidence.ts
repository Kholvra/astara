import type { EvidenceState, GtfsAccessEvidenceAssociation } from "./gtfsTypes";

export type GtfsAccessEvidenceEvaluation = Readonly<{
  evidenceState: EvidenceState;
  evidenceVersionId?: string;
  transitSnapshotId?: string;
  reason: string;
}>;

export function evaluateGtfsAccessEvidence(
  activeTransitSnapshotId: string | undefined,
  association: GtfsAccessEvidenceAssociation | undefined,
): GtfsAccessEvidenceEvaluation {
  if (!activeTransitSnapshotId) {
    return {
      evidenceState: "Unknown",
      reason: "No active transit snapshot is available.",
    };
  }
  if (!association) {
    return {
      evidenceState: "limited",
      reason:
        "No curated access evidence is associated with the active snapshot.",
    };
  }
  if (association.transitSnapshotId !== activeTransitSnapshotId) {
    return {
      evidenceState: "limited",
      evidenceVersionId: association.evidenceVersionId,
      transitSnapshotId: association.transitSnapshotId,
      reason:
        "Access evidence is associated with a different transit snapshot.",
    };
  }
  return {
    evidenceState: "Terverifikasi",
    evidenceVersionId: association.evidenceVersionId,
    transitSnapshotId: association.transitSnapshotId,
    reason: "Access evidence is associated with the active transit snapshot.",
  };
}
