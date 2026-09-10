import { describe, expect, it } from "vitest";

import {
  createAccessRecord,
  getAccessConsumerStatus,
  validateAccessRecord,
} from "./accessEvidence";
import type {
  AccessCurationScope,
  AccessRecord,
  AccessRecordInput,
} from "./accessTypes";

const NOW = "2026-09-10T02:00:00.000Z";
const OBSERVED_AT = "2026-09-08";
const SCOPE: AccessCurationScope = {
  points: [{ hubId: "hub-kota", locationId: "entrance-a" }],
};
const BASE_INPUT: AccessRecordInput = {
  recordId: "access-1",
  hubId: "hub-kota",
  locationId: "entrance-a",
  accessType: "entrance",
  condition: "clear",
  source: "Curated field audit",
  observedAt: OBSERVED_AT,
  confidence: "high",
  evidenceNote: "South entrance was open during the observation.",
  evidenceReference: "audit://hub-kota/entrance-a/2026-09-08",
  transitSnapshotId: "snapshot-1",
  evidenceVersionId: "access-version-1",
};

describe("access evidence contract", () => {
  it("creates a draft with identity, provenance, condition, and version metadata", () => {
    const result = createAccessRecord(BASE_INPUT, {
      now: NOW,
      scope: SCOPE,
    });

    const record = expectRecord(result);
    expect(record).toMatchObject({
      id: "access-1",
      version: 1,
      hubId: "hub-kota",
      locationId: "entrance-a",
      accessType: "entrance",
      status: "draft",
      condition: "clear",
      source: "Curated field audit",
      observedAt: OBSERVED_AT,
      confidence: "high",
      evidenceNote: "South entrance was open during the observation.",
      evidenceReference: "audit://hub-kota/entrance-a/2026-09-08",
      transitSnapshotId: "snapshot-1",
      evidenceVersionId: "access-version-1",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(record.history).toEqual([]);
  });

  it("keeps an incomplete draft out of the verified publication gate", () => {
    const result = createAccessRecord(
      {
        ...BASE_INPUT,
        source: "",
        observedAt: "",
        evidenceNote: "",
      },
      { now: NOW, scope: SCOPE },
    );
    const record = expectRecord(result);

    const issues = validateAccessRecord(record, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      requirePublicationGate: true,
      scope: SCOPE,
    });

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_SOURCE",
        "MISSING_OBSERVED_DATE",
        "MISSING_EVIDENCE",
      ]),
    );
    expect(record.status).toBe("draft");
  });

  it("returns limited status when the active snapshot does not match", () => {
    const record = createRecord(BASE_INPUT);
    const status = getAccessConsumerStatus(record, {
      activeEvidenceVersionId: "access-version-2",
      activeTransitSnapshotId: "snapshot-2",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });

    expect(status).toEqual(
      expect.objectContaining({
        evidenceState: "limited",
        coverage: "limited",
        lifecycleStatus: "draft",
        userLabel: "Data terbatas",
        transitSnapshotId: "snapshot-1",
        evidenceVersionId: "access-version-1",
      }),
    );
    expect(status.limitation.toLowerCase()).toContain("snapshot");
  });

  it("returns unknown limited status for a missing or out-of-scope point", () => {
    const missing = getAccessConsumerStatus(undefined, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });

    expect(missing).toEqual(
      expect.objectContaining({
        evidenceState: "Unknown",
        coverage: "limited",
        lifecycleStatus: "missing",
        condition: "unknown",
        userLabel: "Data terbatas",
      }),
    );
    expect(missing.limitation.toLowerCase()).toContain(
      "no curated access evidence",
    );

    const outOfScope = getAccessConsumerStatus(undefined, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-outside",
      locationId: "sidewalk-x",
      scope: SCOPE,
    });

    expect(outOfScope).toEqual(
      expect.objectContaining({
        evidenceState: "Unknown",
        coverage: "limited",
        lifecycleStatus: "missing",
        userLabel: "Data terbatas",
      }),
    );
    expect(outOfScope.limitation.toLowerCase()).toContain("outside");
  });

  it("projects a sourced verified record without claiming unknown access is clear", () => {
    const record = {
      ...createRecord(BASE_INPUT),
      status: "verified" as const,
      condition: "unknown" as const,
      reviewedAt: NOW,
      reviewedBy: "Astara reviewer",
      reviewNote: "Reviewed, but barrier condition was not observable.",
    };
    const status = getAccessConsumerStatus(record, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });

    expect(status).toEqual(
      expect.objectContaining({
        evidenceState: "limited",
        coverage: "curated",
        condition: "unknown",
        confidence: "high",
        source: "Curated field audit",
        observedAt: OBSERVED_AT,
        reviewedBy: "Astara reviewer",
        userLabel: "Data terbatas",
      }),
    );
    expect(status.limitation.toLowerCase()).toContain("unknown");
    expect("connectionState" in status).toBe(false);
  });

  it("rejects malformed identity and date input with typed issues", () => {
    const result = createAccessRecord(
      {
        ...BASE_INPUT,
        recordId: " ",
        observedAt: "not-a-date",
      },
      { now: NOW, scope: SCOPE },
    );

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") {
      return;
    }
    expect(result.error.code).toBe("INVALID_RECORD");
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_RECORD_ID" }),
        expect.objectContaining({ code: "INVALID_OBSERVED_DATE" }),
      ]),
    );
  });
});

function createRecord(input: AccessRecordInput): AccessRecord {
  const result = createAccessRecord(input, { now: NOW, scope: SCOPE });
  return expectRecord(result);
}

function expectRecord(
  result: ReturnType<typeof createAccessRecord>,
): AccessRecord {
  if (result.kind !== "record") {
    throw new Error(`Expected record result, got ${result.error.code}.`);
  }
  return result.record;
}
