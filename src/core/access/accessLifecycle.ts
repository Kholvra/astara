import { createAccessRecord, validateAccessRecord } from "./accessEvidence";
import {
  invalidRecord,
  isNonBlank,
  isValidDate,
} from "./accessEvidenceSupport";
import type {
  AccessOperationFailure,
  AccessPublicationContext,
  AccessRecord,
  AccessRecordResult,
  AccessReviewDecision,
  AccessReviewEvent,
  AccessRevisionInput,
  AccessValidationIssue,
} from "./accessTypes";

export function publishAccessRecord(
  record: AccessRecord,
  context: AccessPublicationContext,
): AccessRecordResult {
  if (record.status !== "draft" && record.status !== "needs-review") {
    return illegalTransition(
      "Only draft or needs-review records can be published as verified evidence.",
    );
  }

  const review = context.review;
  const resolvesContradiction =
    record.contradictionReasons.length > 0 &&
    isNonBlank(review.contradictionResolution);
  const candidate: AccessRecord = {
    ...record,
    reviewedAt: review.reviewedAt.trim(),
    reviewedBy: review.reviewedBy.trim(),
    reviewNote: review.decisionNote.trim(),
    contradictionReasons: resolvesContradiction
      ? []
      : record.contradictionReasons,
  };
  const issues = [
    ...validateReviewDecision(review),
    ...validateAccessRecord(candidate, {
      activeEvidenceVersionId: context.activeEvidenceVersionId,
      activeTransitSnapshotId: context.activeTransitSnapshotId,
      requirePublicationGate: true,
      scope: context.scope,
    }),
  ];

  if (issues.length > 0) {
    return invalidRecord(uniqueIssues(issues));
  }

  return {
    kind: "record",
    record: transitionRecord(
      record,
      {
        status: "verified",
        reviewedAt: candidate.reviewedAt,
        reviewedBy: candidate.reviewedBy,
        reviewNote: candidate.reviewNote,
        contradictionReasons: candidate.contradictionReasons,
      },
      {
        at: review.reviewedAt,
        actor: review.reviewedBy,
        reason: review.decisionNote,
      },
    ),
  };
}

export function markAccessRecordForReview(
  record: AccessRecord,
  event: AccessReviewEvent,
): AccessRecordResult {
  if (record.status === "retired") {
    return illegalTransition(
      "A retired access record cannot be reviewed in place.",
    );
  }

  const issues = validateEvent(event);
  if (issues.length > 0) {
    return invalidRecord(issues);
  }

  const contradictionReasons =
    event.kind === "contradiction"
      ? uniqueStrings([...record.contradictionReasons, event.reason.trim()])
      : record.contradictionReasons;
  const condition = event.kind === "barrier" ? "barrier" : record.condition;

  return {
    kind: "record",
    record: transitionRecord(
      record,
      {
        status: "needs-review",
        condition,
        reviewedAt: event.at.trim(),
        reviewedBy: event.actor.trim(),
        reviewNote: event.reason.trim(),
        contradictionReasons,
      },
      event,
    ),
  };
}

export function retireAccessRecord(
  record: AccessRecord,
  event: AccessReviewEvent,
): AccessRecordResult {
  if (record.status !== "verified" && record.status !== "needs-review") {
    return illegalTransition(
      "Only verified or needs-review records can be retired.",
    );
  }

  const issues = validateEvent(event);
  if (issues.length > 0) {
    return invalidRecord(issues);
  }

  return {
    kind: "record",
    record: transitionRecord(
      record,
      {
        status: "retired",
        reviewedAt: event.at.trim(),
        reviewedBy: event.actor.trim(),
        reviewNote: event.reason.trim(),
      },
      event,
    ),
  };
}

export function reviseAccessRecord(
  record: AccessRecord,
  input: AccessRevisionInput,
): AccessRecordResult {
  const eventIssues = validateEvent({
    at: input.at,
    actor: input.actor,
    reason: input.reason,
  });
  if (eventIssues.length > 0) {
    return invalidRecord(eventIssues);
  }
  if (input.observation.recordId.trim() !== record.id) {
    return invalidRecord([
      {
        code: "REVISION_ID_MISMATCH",
        field: "observation.recordId",
        message:
          "A revision must preserve the existing access record identity.",
      },
    ]);
  }

  const draft = createAccessRecord(input.observation, {
    now: input.at,
    scope: input.scope,
  });
  if (draft.kind !== "record") {
    return draft;
  }

  return {
    kind: "record",
    record: {
      ...draft.record,
      version: record.version + 1,
      createdAt: record.createdAt,
      updatedAt: input.at.trim(),
      history: [
        ...record.history,
        revisionSnapshot(record, {
          at: input.at,
          actor: input.actor,
          reason: input.reason,
        }),
      ],
    },
  };
}

function transitionRecord(
  record: AccessRecord,
  changes: Partial<AccessRecord>,
  event: Readonly<{ at: string; actor: string; reason: string }>,
): AccessRecord {
  return {
    ...record,
    ...changes,
    version: record.version + 1,
    updatedAt: event.at.trim(),
    history: [...record.history, revisionSnapshot(record, event)],
  };
}

function revisionSnapshot(
  record: AccessRecord,
  event: Readonly<{ at: string; actor: string; reason: string }>,
) {
  return {
    version: record.version,
    status: record.status,
    condition: record.condition,
    source: record.source,
    observedAt: record.observedAt,
    confidence: record.confidence,
    evidenceNote: record.evidenceNote,
    ...(record.evidenceReference === undefined
      ? {}
      : { evidenceReference: record.evidenceReference }),
    transitSnapshotId: record.transitSnapshotId,
    evidenceVersionId: record.evidenceVersionId,
    ...(record.reviewedAt === undefined
      ? {}
      : { reviewedAt: record.reviewedAt }),
    ...(record.reviewedBy === undefined
      ? {}
      : { reviewedBy: record.reviewedBy }),
    reviewNote: record.reviewNote,
    contradictionReasons: [...record.contradictionReasons],
    changedAt: event.at.trim(),
    changedBy: event.actor.trim(),
    reason: event.reason.trim(),
  };
}

function validateReviewDecision(
  review: AccessReviewDecision,
): readonly AccessValidationIssue[] {
  const issues: AccessValidationIssue[] = [];
  if (!isValidDate(review.reviewedAt)) {
    issues.push({
      code: review.reviewedAt ? "INVALID_REVIEW_DATE" : "MISSING_REVIEW_DATE",
      field: "review.reviewedAt",
      message: "A publication review must include a valid review date.",
    });
  }
  if (!isNonBlank(review.reviewedBy)) {
    issues.push({
      code: "MISSING_REVIEWER",
      field: "review.reviewedBy",
      message: "A publication review must identify its reviewer.",
    });
  }
  if (!isNonBlank(review.decisionNote)) {
    issues.push({
      code: "MISSING_REVIEW_DECISION",
      field: "review.decisionNote",
      message: "A publication review must record the decision.",
    });
  }
  return issues;
}

function validateEvent(
  event: Readonly<{ at: string; actor: string; reason: string }>,
): readonly AccessValidationIssue[] {
  const issues: AccessValidationIssue[] = [];
  if (!isValidDate(event.at)) {
    issues.push({
      code: event.at ? "INVALID_EVENT_DATE" : "INVALID_EVENT_DATE",
      field: "event.at",
      message: "A lifecycle event must include a valid date.",
    });
  }
  if (!isNonBlank(event.actor)) {
    issues.push({
      code: "MISSING_EVENT_ACTOR",
      field: "event.actor",
      message: "A lifecycle event must identify its actor.",
    });
  }
  if (!isNonBlank(event.reason)) {
    issues.push({
      code: "MISSING_EVENT_REASON",
      field: "event.reason",
      message: "A lifecycle event must record a reason.",
    });
  }
  return issues;
}

function illegalTransition(message: string): AccessOperationFailure {
  return {
    kind: "failure",
    error: {
      code: "ILLEGAL_TRANSITION",
      message,
      issues: [],
    },
  };
}

function uniqueIssues(
  issues: readonly AccessValidationIssue[],
): readonly AccessValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.field ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(isNonBlank))];
}
