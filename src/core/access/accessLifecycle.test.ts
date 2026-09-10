import { describe, expect, it } from "vitest";

import { getAccessConsumerStatus, createAccessRecord } from "./accessEvidence";
import {
  markAccessRecordForReview,
  publishAccessRecord,
  retireAccessRecord,
  reviseAccessRecord,
} from "./accessLifecycle";
import type {
  AccessCurationScope,
  AccessRecord,
  AccessRecordInput,
  AccessRecordResult,
} from "./accessTypes";

const SCOPE: AccessCurationScope = {
  points: [{ hubId: "hub-kota", locationId: "entrance-a" }],
};
const DRAFTED_AT = "2026-09-10T02:00:00.000Z";
const REVIEWED_AT = "2026-09-10T03:00:00.000Z";
const BASE_INPUT: AccessRecordInput = {
  recordId: "access-1",
  hubId: "hub-kota",
  locationId: "entrance-a",
  accessType: "entrance",
  condition: "clear",
  source: "Curated field audit",
  observedAt: "2026-09-08",
  confidence: "high",
  evidenceNote: "South entrance was open during the observation.",
  evidenceReference: "audit://hub-kota/entrance-a/2026-09-08",
  transitSnapshotId: "snapshot-1",
  evidenceVersionId: "access-version-1",
};

describe("access evidence lifecycle", () => {
  it("publishes only a reviewed, complete draft and preserves the draft revision", () => {
    const published = expectRecord(
      publishAccessRecord(createRecord(), {
        activeEvidenceVersionId: "access-version-1",
        activeTransitSnapshotId: "snapshot-1",
        review: {
          decisionNote: "Source, date, evidence, and location were reviewed.",
          reviewedAt: REVIEWED_AT,
          reviewedBy: "Astara reviewer",
        },
        scope: SCOPE,
      }),
    );

    expect(published).toMatchObject({
      status: "verified",
      version: 2,
      reviewedAt: REVIEWED_AT,
      reviewedBy: "Astara reviewer",
      reviewNote: "Source, date, evidence, and location were reviewed.",
    });
    expect(published.history).toHaveLength(1);
    expect(published.history[0]).toMatchObject({
      version: 1,
      status: "draft",
      source: "Curated field audit",
    });

    const consumerStatus = getAccessConsumerStatus(published, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });
    expect(consumerStatus).toEqual(
      expect.objectContaining({
        evidenceState: "Terverifikasi",
        lifecycleStatus: "verified",
        confidence: "high",
        reviewedBy: "Astara reviewer",
        userLabel: "Terverifikasi",
      }),
    );
  });

  it("rejects publication with unresolved contradictions without mutating the record", () => {
    const published = publishValidRecord();
    const needsReview = expectRecord(
      markAccessRecordForReview(published, {
        actor: "Astara reviewer",
        at: REVIEWED_AT,
        kind: "contradiction",
        reason: "A second observation reports a locked entrance.",
      }),
    );

    const rejected = publishAccessRecord(needsReview, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      review: {
        decisionNote: "The contradiction has not been resolved.",
        reviewedAt: "2026-09-10T04:00:00.000Z",
        reviewedBy: "Astara reviewer",
      },
      scope: SCOPE,
    });

    expect(rejected.kind).toBe("failure");
    if (rejected.kind !== "failure") {
      return;
    }
    expect(rejected.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CONTRADICTION_UNRESOLVED" }),
      ]),
    );
    expect(needsReview.status).toBe("needs-review");
    expect(needsReview.contradictionReasons).toEqual([
      "A second observation reports a locked entrance.",
    ]);
  });

  it("retains contradiction history when a later review explicitly resolves it", () => {
    const published = publishValidRecord();
    const needsReview = expectRecord(
      markAccessRecordForReview(published, {
        actor: "Astara reviewer",
        at: REVIEWED_AT,
        kind: "contradiction",
        reason: "A second observation reports a locked entrance.",
      }),
    );
    const republished = expectRecord(
      publishAccessRecord(needsReview, {
        activeEvidenceVersionId: "access-version-1",
        activeTransitSnapshotId: "snapshot-1",
        review: {
          contradictionResolution:
            "The second observation was outside the approved point.",
          decisionNote: "The contradiction was reviewed and resolved.",
          reviewedAt: "2026-09-10T04:00:00.000Z",
          reviewedBy: "Astara reviewer",
        },
        scope: SCOPE,
      }),
    );

    expect(republished.status).toBe("verified");
    expect(republished.contradictionReasons).toEqual([]);
    expect(republished.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "needs-review",
          contradictionReasons: [
            "A second observation reports a locked entrance.",
          ],
        }),
      ]),
    );
  });

  it("preserves an explicit barrier without deciding transfer connectivity", () => {
    const barrier = expectRecord(
      markAccessRecordForReview(publishValidRecord(), {
        actor: "Astara reviewer",
        at: REVIEWED_AT,
        kind: "barrier",
        reason: "Lift is temporarily closed.",
      }),
    );
    const status = getAccessConsumerStatus(barrier, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });

    expect(status).toEqual(
      expect.objectContaining({
        lifecycleStatus: "needs-review",
        condition: "barrier",
        barrierState: "present",
        evidenceState: "Perlu dicek",
        userLabel: "Perlu dicek",
      }),
    );
    expect(status.limitation).toContain("Lift is temporarily closed.");
    expect("connectionState" in status).toBe(false);
  });

  it("retires a published record and exposes its non-current status", () => {
    const published = publishValidRecord();
    const retired = expectRecord(
      retireAccessRecord(published, {
        actor: "Astara maintainer",
        at: REVIEWED_AT,
        kind: "manual",
        reason: "Observation is no longer current.",
      }),
    );

    expect(retired.status).toBe("retired");
    expect(retired.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "verified" })]),
    );
    const status = getAccessConsumerStatus(retired, {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      hubId: "hub-kota",
      locationId: "entrance-a",
      scope: SCOPE,
    });
    expect(status).toEqual(
      expect.objectContaining({
        evidenceState: "Perlu dicek",
        lifecycleStatus: "retired",
        userLabel: "Perlu dicek",
      }),
    );
  });

  it("does not mutate a retired record on an illegal repeated transition", () => {
    const retired = expectRecord(
      retireAccessRecord(publishValidRecord(), {
        actor: "Astara maintainer",
        at: REVIEWED_AT,
        kind: "manual",
        reason: "Observation is no longer current.",
      }),
    );
    const before: AccessRecord = structuredClone(retired);
    const result = retireAccessRecord(retired, {
      actor: "Astara maintainer",
      at: "2026-09-10T04:00:00.000Z",
      kind: "manual",
      reason: "Repeated retirement.",
    });

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") {
      return;
    }
    expect(result.error.code).toBe("ILLEGAL_TRANSITION");
    expect(retired).toEqual(before);
  });

  it("does not auto-age an old observation without a manual lifecycle event", () => {
    const old = createRecord({
      ...BASE_INPUT,
      observedAt: "2020-01-01",
    });
    const published = expectRecord(
      publishAccessRecord(old, {
        activeEvidenceVersionId: "access-version-1",
        activeTransitSnapshotId: "snapshot-1",
        review: {
          decisionNote:
            "The old observation was manually checked for this contest.",
          reviewedAt: REVIEWED_AT,
          reviewedBy: "Astara reviewer",
        },
        scope: SCOPE,
      }),
    );

    expect(published.status).toBe("verified");
    expect(published.observedAt).toBe("2020-01-01");
  });

  it("revises a current or retired record into a new draft version with history", () => {
    const retired = expectRecord(
      retireAccessRecord(publishValidRecord(), {
        actor: "Astara maintainer",
        at: REVIEWED_AT,
        kind: "manual",
        reason: "Observation is no longer current.",
      }),
    );
    const revised = expectRecord(
      reviseAccessRecord(retired, {
        actor: "Astara maintainer",
        at: "2026-09-10T05:00:00.000Z",
        reason: "New observation replaces the retired record.",
        scope: SCOPE,
        observation: {
          ...BASE_INPUT,
          source: "New field audit",
          observedAt: "2026-09-10",
          evidenceNote: "Entrance was observed open again.",
        },
      }),
    );

    expect(revised).toMatchObject({
      id: "access-1",
      version: retired.version + 1,
      status: "draft",
      source: "New field audit",
      observedAt: "2026-09-10",
    });
    expect(revised).not.toHaveProperty("reviewedAt");
    expect(revised).not.toHaveProperty("reviewedBy");
    expect(revised.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "retired" }),
        expect.objectContaining({ source: "Curated field audit" }),
      ]),
    );
  });
});

function createRecord(input: AccessRecordInput = BASE_INPUT): AccessRecord {
  const result = createAccessRecord(input, {
    now: DRAFTED_AT,
    scope: SCOPE,
  });
  return expectRecord(result);
}

function publishValidRecord(): AccessRecord {
  return expectRecord(
    publishAccessRecord(createRecord(), {
      activeEvidenceVersionId: "access-version-1",
      activeTransitSnapshotId: "snapshot-1",
      review: {
        decisionNote: "Source, date, evidence, and location were reviewed.",
        reviewedAt: REVIEWED_AT,
        reviewedBy: "Astara reviewer",
      },
      scope: SCOPE,
    }),
  );
}

function expectRecord(result: AccessRecordResult): AccessRecord {
  if (result.kind !== "record") {
    throw new Error(`Expected record result, got ${result.error.code}.`);
  }
  return result.record;
}
