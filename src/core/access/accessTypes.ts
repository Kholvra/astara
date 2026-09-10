import type { EvidenceState } from "~/core/ingestion/gtfsTypes";

export const ACCESS_TYPES = [
  "entrance",
  "platform",
  "jpo",
  "crossing",
  "lift",
  "sidewalk",
  "exit",
  "barrier",
  "unknown",
] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];
export type AccessCondition = "clear" | "barrier" | "unknown";
export type AccessBarrierState = "clear" | "present" | "unknown";
export type AccessConfidence = "high" | "medium" | "low";
export type AccessLifecycleStatus =
  "draft" | "verified" | "needs-review" | "retired";
export type AccessCoverage = "curated" | "limited";
export type AccessUserLabel = "Terverifikasi" | "Data terbatas" | "Perlu dicek";

export type AccessCurationPoint = Readonly<{
  hubId: string;
  locationId: string;
}>;

export type AccessCurationScope = Readonly<{
  points: readonly AccessCurationPoint[];
}>;

export type AccessRecordInput = Readonly<{
  recordId: string;
  hubId: string;
  locationId: string;
  accessType: AccessType;
  condition?: AccessCondition;
  source?: string;
  observedAt?: string;
  confidence?: AccessConfidence;
  evidenceNote?: string;
  evidenceReference?: string;
  transitSnapshotId: string;
  evidenceVersionId: string;
}>;

export type AccessRecord = Readonly<{
  id: string;
  version: number;
  hubId: string;
  locationId: string;
  accessType: AccessType;
  status: AccessLifecycleStatus;
  condition: AccessCondition;
  source: string;
  observedAt: string;
  confidence: AccessConfidence;
  evidenceNote: string;
  evidenceReference?: string;
  transitSnapshotId: string;
  evidenceVersionId: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote: string;
  contradictionReasons: readonly string[];
  createdAt: string;
  updatedAt: string;
  history: readonly AccessRecordRevision[];
}>;

export type AccessRecordRevision = Readonly<{
  version: number;
  status: AccessLifecycleStatus;
  condition: AccessCondition;
  source: string;
  observedAt: string;
  confidence: AccessConfidence;
  evidenceNote: string;
  evidenceReference?: string;
  transitSnapshotId: string;
  evidenceVersionId: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote: string;
  contradictionReasons: readonly string[];
  changedAt: string;
  changedBy: string;
  reason: string;
}>;

export type AccessValidationIssueCode =
  | "MISSING_RECORD_ID"
  | "MISSING_HUB_ID"
  | "MISSING_LOCATION_ID"
  | "INVALID_ACCESS_TYPE"
  | "INVALID_CONDITION"
  | "INVALID_CONFIDENCE"
  | "MISSING_SOURCE"
  | "MISSING_OBSERVED_DATE"
  | "INVALID_OBSERVED_DATE"
  | "INVALID_EVENT_DATE"
  | "MISSING_EVIDENCE"
  | "MISSING_TRANSIT_SNAPSHOT"
  | "MISSING_EVIDENCE_VERSION"
  | "OUT_OF_SCOPE"
  | "SNAPSHOT_MISMATCH"
  | "EVIDENCE_VERSION_MISMATCH"
  | "MISSING_REVIEW_DATE"
  | "INVALID_REVIEW_DATE"
  | "MISSING_REVIEWER"
  | "MISSING_EVENT_ACTOR"
  | "MISSING_EVENT_REASON"
  | "MISSING_REVIEW_DECISION"
  | "REVISION_ID_MISMATCH"
  | "CONTRADICTION_UNRESOLVED";

export type AccessValidationIssue = Readonly<{
  code: AccessValidationIssueCode;
  message: string;
  field?: string;
}>;

export type AccessFailureCode =
  "INVALID_RECORD" | "OUT_OF_SCOPE" | "ILLEGAL_TRANSITION";

export type AccessOperationFailure = Readonly<{
  kind: "failure";
  error: Readonly<{
    code: AccessFailureCode;
    message: string;
    issues: readonly AccessValidationIssue[];
  }>;
}>;

export type AccessRecordSuccess = Readonly<{
  kind: "record";
  record: AccessRecord;
}>;

export type AccessRecordResult = AccessRecordSuccess | AccessOperationFailure;

export type AccessRecordCreationContext = Readonly<{
  now: string;
  scope: AccessCurationScope;
}>;

export type AccessRecordValidationOptions = Readonly<{
  activeEvidenceVersionId?: string;
  activeTransitSnapshotId?: string;
  requirePublicationGate?: boolean;
  scope: AccessCurationScope;
}>;

export type AccessConsumerQuery = Readonly<{
  activeEvidenceVersionId?: string;
  activeTransitSnapshotId?: string;
  hubId: string;
  locationId: string;
  scope: AccessCurationScope;
}>;

export type AccessConsumerStatus = Readonly<{
  evidenceState: EvidenceState;
  coverage: AccessCoverage;
  lifecycleStatus: AccessLifecycleStatus | "missing";
  condition: AccessCondition;
  barrierState: AccessBarrierState;
  confidence: AccessConfidence;
  userLabel: AccessUserLabel;
  limitation: string;
  source?: string;
  observedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  evidenceReference?: string;
  transitSnapshotId?: string;
  evidenceVersionId?: string;
}>;

export type AccessReviewDecision = Readonly<{
  reviewedAt: string;
  reviewedBy: string;
  decisionNote: string;
  contradictionResolution?: string;
}>;

export type AccessPublicationContext = Readonly<{
  activeEvidenceVersionId: string;
  activeTransitSnapshotId: string;
  review: AccessReviewDecision;
  scope: AccessCurationScope;
}>;

export type AccessReviewEvent = Readonly<{
  at: string;
  actor: string;
  kind: "manual" | "contradiction" | "barrier";
  reason: string;
}>;

export type AccessRevisionInput = Readonly<{
  at: string;
  actor: string;
  reason: string;
  scope: AccessCurationScope;
  observation: AccessRecordInput;
}>;
