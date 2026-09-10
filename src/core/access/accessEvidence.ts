import type {
  AccessConsumerQuery,
  AccessConsumerStatus,
  AccessRecord,
  AccessRecordCreationContext,
  AccessRecordInput,
  AccessRecordResult,
} from "./accessTypes";
import {
  barrierStateFromCondition,
  invalidRecord,
  isAccessPointInScope,
  isNonBlank,
  validateRecordInput,
} from "./accessEvidenceSupport";

export {
  isAccessPointInScope,
  validateAccessRecord,
} from "./accessEvidenceSupport";

export function createAccessRecord(
  input: AccessRecordInput,
  context: AccessRecordCreationContext,
): AccessRecordResult {
  const issues = validateRecordInput(input, context);
  if (issues.length > 0) {
    return invalidRecord(issues);
  }

  const source = input.source?.trim() ?? "";
  const observedAt = input.observedAt?.trim() ?? "";
  const evidenceNote = input.evidenceNote?.trim() ?? "";
  const evidenceReference = input.evidenceReference?.trim();

  return {
    kind: "record",
    record: {
      id: input.recordId.trim(),
      version: 1,
      hubId: input.hubId.trim(),
      locationId: input.locationId.trim(),
      accessType: input.accessType,
      status: "draft",
      condition: input.condition ?? "unknown",
      source,
      observedAt,
      confidence: input.confidence ?? "low",
      evidenceNote,
      ...(isNonBlank(evidenceReference) ? { evidenceReference } : {}),
      transitSnapshotId: input.transitSnapshotId.trim(),
      evidenceVersionId: input.evidenceVersionId.trim(),
      reviewNote: "",
      contradictionReasons: [],
      createdAt: context.now.trim(),
      updatedAt: context.now.trim(),
      history: [],
    },
  };
}

export function getAccessConsumerStatus(
  record: AccessRecord | undefined,
  query: AccessConsumerQuery,
): AccessConsumerStatus {
  if (!isAccessPointInScope(query.scope, query.hubId, query.locationId)) {
    return missingStatus(
      "The requested point is outside the approved curated scope; coverage is limited.",
    );
  }

  if (!record) {
    return missingStatus(
      "No curated access evidence is available for this point.",
    );
  }

  if (record.hubId !== query.hubId || record.locationId !== query.locationId) {
    return missingStatus(
      "No curated access evidence is available for this point.",
    );
  }

  const mismatch = getSnapshotMismatch(record, query);
  if (mismatch) {
    return recordStatus(
      record,
      "limited",
      "Data terbatas",
      mismatch,
      "limited",
    );
  }

  switch (record.status) {
    case "verified":
      return verifiedStatus(record);
    case "needs-review":
      return recordStatus(
        record,
        "Perlu dicek",
        "Perlu dicek",
        record.reviewNote || "This access record requires manual review.",
      );
    case "retired":
      return recordStatus(
        record,
        "Perlu dicek",
        "Perlu dicek",
        "This access record is retired and is not current.",
      );
    case "draft":
      return recordStatus(
        record,
        "Unknown",
        "Data terbatas",
        "This access record is a draft and has not been manually verified.",
      );
  }
}

function verifiedStatus(record: AccessRecord): AccessConsumerStatus {
  if (record.condition === "unknown") {
    return recordStatus(
      record,
      "limited",
      "Data terbatas",
      "Barrier and access data is unknown; this record is not an accessibility claim.",
    );
  }
  if (record.condition === "barrier") {
    return recordStatus(
      record,
      "Terverifikasi",
      "Perlu dicek",
      "An explicit barrier was recorded; route eligibility remains a separate transfer-graph decision.",
    );
  }
  return recordStatus(
    record,
    "Terverifikasi",
    "Terverifikasi",
    "This is curated observation evidence, not a general accessibility certification.",
  );
}

function recordStatus(
  record: AccessRecord,
  evidenceState: AccessConsumerStatus["evidenceState"],
  userLabel: AccessConsumerStatus["userLabel"],
  limitation: string,
  coverage: AccessConsumerStatus["coverage"] = "curated",
): AccessConsumerStatus {
  return {
    evidenceState,
    coverage,
    lifecycleStatus: record.status,
    condition: record.condition,
    barrierState: barrierStateFromCondition(record.condition),
    confidence: record.confidence,
    userLabel,
    limitation,
    source: record.source || undefined,
    observedAt: record.observedAt || undefined,
    reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy,
    evidenceReference: record.evidenceReference,
    transitSnapshotId: record.transitSnapshotId,
    evidenceVersionId: record.evidenceVersionId,
  };
}

function missingStatus(limitation: string): AccessConsumerStatus {
  return {
    evidenceState: "Unknown",
    coverage: "limited",
    lifecycleStatus: "missing",
    condition: "unknown",
    barrierState: "unknown",
    confidence: "low",
    userLabel: "Data terbatas",
    limitation,
  };
}

function getSnapshotMismatch(
  record: AccessRecord,
  query: AccessConsumerQuery,
): string | undefined {
  if (!query.activeTransitSnapshotId) {
    return "No active transit snapshot is available to verify this access evidence.";
  }
  if (record.transitSnapshotId !== query.activeTransitSnapshotId) {
    return "Access evidence is associated with a different transit snapshot.";
  }
  if (!query.activeEvidenceVersionId) {
    return "No active access-evidence version is available to verify this record.";
  }
  if (record.evidenceVersionId !== query.activeEvidenceVersionId) {
    return "Access evidence is associated with a different evidence version.";
  }
  return undefined;
}
