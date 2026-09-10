import {
  ACCESS_TYPES,
  type AccessBarrierState,
  type AccessCondition,
  type AccessConfidence,
  type AccessCurationScope,
  type AccessOperationFailure,
  type AccessRecord,
  type AccessRecordCreationContext,
  type AccessRecordInput,
  type AccessValidationIssue,
  type AccessValidationIssueCode,
} from "./accessTypes";

export function validateAccessRecord(
  record: AccessRecord,
  options: Readonly<{
    activeEvidenceVersionId?: string;
    activeTransitSnapshotId?: string;
    requirePublicationGate?: boolean;
    scope: AccessCurationScope;
  }>,
): readonly AccessValidationIssue[] {
  const issues: AccessValidationIssue[] = [];

  addMissingIssue(issues, record.id, "MISSING_RECORD_ID", "recordId");
  addMissingIssue(issues, record.hubId, "MISSING_HUB_ID", "hubId");
  addMissingIssue(
    issues,
    record.locationId,
    "MISSING_LOCATION_ID",
    "locationId",
  );
  addMissingIssue(
    issues,
    record.transitSnapshotId,
    "MISSING_TRANSIT_SNAPSHOT",
    "transitSnapshotId",
  );
  addMissingIssue(
    issues,
    record.evidenceVersionId,
    "MISSING_EVIDENCE_VERSION",
    "evidenceVersionId",
  );

  if (!isAccessType(record.accessType)) {
    issues.push({
      code: "INVALID_ACCESS_TYPE",
      field: "accessType",
      message: "Access type is not supported by the curated evidence contract.",
    });
  }
  if (!isCondition(record.condition)) {
    issues.push({
      code: "INVALID_CONDITION",
      field: "condition",
      message: "Access condition must be clear, barrier, or unknown.",
    });
  }
  if (!isConfidence(record.confidence)) {
    issues.push({
      code: "INVALID_CONFIDENCE",
      field: "confidence",
      message: "Access confidence must be high, medium, or low.",
    });
  }
  if (!isAccessPointInScope(options.scope, record.hubId, record.locationId)) {
    issues.push({
      code: "OUT_OF_SCOPE",
      field: "hubId",
      message: "The access point is outside the approved curated scope.",
    });
  }

  if (
    options.activeTransitSnapshotId !== undefined &&
    record.transitSnapshotId !== options.activeTransitSnapshotId
  ) {
    issues.push({
      code: "SNAPSHOT_MISMATCH",
      field: "transitSnapshotId",
      message:
        "Access evidence is associated with a different transit snapshot.",
    });
  }
  if (
    options.activeEvidenceVersionId !== undefined &&
    record.evidenceVersionId !== options.activeEvidenceVersionId
  ) {
    issues.push({
      code: "EVIDENCE_VERSION_MISMATCH",
      field: "evidenceVersionId",
      message:
        "Access evidence is associated with a different evidence version.",
    });
  }

  if (record.observedAt && !isValidDate(record.observedAt)) {
    issues.push({
      code: "INVALID_OBSERVED_DATE",
      field: "observedAt",
      message: "Observation date must be a valid date.",
    });
  }
  if (record.reviewedAt && !isValidDate(record.reviewedAt)) {
    issues.push({
      code: "INVALID_REVIEW_DATE",
      field: "reviewedAt",
      message: "Review date must be a valid date.",
    });
  }
  if (
    record.reviewedAt !== undefined &&
    record.reviewedBy !== undefined &&
    !isNonBlank(record.reviewedBy)
  ) {
    issues.push({
      code: "MISSING_REVIEWER",
      field: "reviewedBy",
      message: "A review must identify the maintainer who made the decision.",
    });
  }

  if (options.requirePublicationGate) {
    addMissingIssue(issues, record.source, "MISSING_SOURCE", "source");
    if (!isNonBlank(record.observedAt)) {
      issues.push({
        code: "MISSING_OBSERVED_DATE",
        field: "observedAt",
        message: "A verified record must include an observation date.",
      });
    }
    addMissingIssue(
      issues,
      record.evidenceNote,
      "MISSING_EVIDENCE",
      "evidenceNote",
    );
    if (!isValidDate(record.reviewedAt)) {
      issues.push({
        code: record.reviewedAt ? "INVALID_REVIEW_DATE" : "MISSING_REVIEW_DATE",
        field: "reviewedAt",
        message: "A verified record must include a valid review date.",
      });
    }
    if (!isNonBlank(record.reviewedBy)) {
      issues.push({
        code: "MISSING_REVIEWER",
        field: "reviewedBy",
        message: "A verified record must identify its reviewer.",
      });
    }
    if (record.contradictionReasons.length > 0) {
      issues.push({
        code: "CONTRADICTION_UNRESOLVED",
        field: "contradictionReasons",
        message:
          "Contradictory observations must be resolved before publication.",
      });
    }
  }

  return issues;
}

export function isAccessPointInScope(
  scope: AccessCurationScope,
  hubId: string,
  locationId: string,
): boolean {
  return scope.points.some(
    (point) => point.hubId === hubId && point.locationId === locationId,
  );
}

export function validateRecordInput(
  input: AccessRecordInput,
  context: AccessRecordCreationContext,
): readonly AccessValidationIssue[] {
  const issues: AccessValidationIssue[] = [];
  addMissingIssue(issues, input.recordId, "MISSING_RECORD_ID", "recordId");
  addMissingIssue(issues, input.hubId, "MISSING_HUB_ID", "hubId");
  addMissingIssue(
    issues,
    input.locationId,
    "MISSING_LOCATION_ID",
    "locationId",
  );
  addMissingIssue(
    issues,
    input.transitSnapshotId,
    "MISSING_TRANSIT_SNAPSHOT",
    "transitSnapshotId",
  );
  addMissingIssue(
    issues,
    input.evidenceVersionId,
    "MISSING_EVIDENCE_VERSION",
    "evidenceVersionId",
  );
  if (!isAccessType(input.accessType)) {
    issues.push({
      code: "INVALID_ACCESS_TYPE",
      field: "accessType",
      message: "Access type is not supported by the curated evidence contract.",
    });
  }
  if (input.condition !== undefined && !isCondition(input.condition)) {
    issues.push({
      code: "INVALID_CONDITION",
      field: "condition",
      message: "Access condition must be clear, barrier, or unknown.",
    });
  }
  if (input.confidence !== undefined && !isConfidence(input.confidence)) {
    issues.push({
      code: "INVALID_CONFIDENCE",
      field: "confidence",
      message: "Access confidence must be high, medium, or low.",
    });
  }
  if (input.observedAt && !isValidDate(input.observedAt)) {
    issues.push({
      code: "INVALID_OBSERVED_DATE",
      field: "observedAt",
      message: "Observation date must be a valid date.",
    });
  }
  if (!isValidDate(context.now)) {
    issues.push({
      code: "INVALID_EVENT_DATE",
      field: "now",
      message: "Record creation time must be a valid date.",
    });
  }
  if (
    !isAccessPointInScope(
      context.scope,
      input.hubId.trim(),
      input.locationId.trim(),
    )
  ) {
    issues.push({
      code: "OUT_OF_SCOPE",
      field: "hubId",
      message: "The access point is outside the approved curated scope.",
    });
  }
  return issues;
}

export function invalidRecord(
  issues: readonly AccessValidationIssue[],
): AccessOperationFailure {
  return {
    kind: "failure",
    error: {
      code: "INVALID_RECORD",
      message:
        "The access record could not be created from the supplied evidence.",
      issues,
    },
  };
}

export function barrierStateFromCondition(
  condition: AccessCondition,
): AccessBarrierState {
  switch (condition) {
    case "clear":
      return "clear";
    case "barrier":
      return "present";
    case "unknown":
      return "unknown";
  }
}

export function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function isValidDate(value: string | undefined): boolean {
  return isNonBlank(value) && Number.isFinite(Date.parse(value));
}

function addMissingIssue(
  issues: AccessValidationIssue[],
  value: string | undefined,
  code: AccessValidationIssueCode,
  field: string,
): void {
  if (!isNonBlank(value)) {
    issues.push({
      code,
      field,
      message: `${field} is required for curated access evidence.`,
    });
  }
}

function isAccessType(value: string): value is AccessRecord["accessType"] {
  return (ACCESS_TYPES as readonly string[]).includes(value);
}

function isCondition(value: string): value is AccessCondition {
  return value === "clear" || value === "barrier" || value === "unknown";
}

function isConfidence(value: string): value is AccessConfidence {
  return value === "high" || value === "medium" || value === "low";
}
