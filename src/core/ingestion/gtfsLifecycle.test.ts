import { describe, expect, it } from "vitest";

import { classifyFreshness, decidePublication } from "./gtfsLifecycle";
import type {
  GtfsSnapshot,
  GtfsValidationResult,
  FreshnessPolicy,
} from "./gtfsTypes";

const policy: FreshnessPolicy = {
  agingAfterHours: 24,
  staleAfterHours: 72,
  allowStaleDemo: true,
  staleDemoNote: "Data jadwal bersifat statis untuk demo dan dapat berubah.",
};

const currentTime = "2026-09-10T00:00:00.000Z";

function createSnapshot(snapshotId: string, acquiredAt: string): GtfsSnapshot {
  return {
    metadata: {
      snapshotId,
      sourceUrl: "https://example.test/transjakarta.zip",
      acquiredAt,
      contentHash: "b".repeat(64),
    },
    serviceDate: "2026-09-09",
    coverage: "limited",
    limitations: ["Calendar exception coverage is limited."],
    agencies: [],
    routes: [],
    stops: [],
    trips: [],
    stopTimes: [],
    calendars: [],
    calendarDates: [],
    frequencies: [],
    transfers: [],
    shapes: [],
    fareAttributes: [],
    fareRules: [],
  };
}

function candidate(
  snapshot: GtfsSnapshot,
  overrides: Partial<GtfsValidationResult> = {},
): GtfsValidationResult {
  return {
    candidateSnapshotId: snapshot.metadata.snapshotId,
    accepted: true,
    snapshot,
    issues: [],
    limitations: snapshot.limitations,
    ...overrides,
  };
}

describe("classifyFreshness", () => {
  it("uses explicit policy boundaries", () => {
    expect(
      classifyFreshness("2026-09-10T00:00:00.000Z", currentTime, policy),
    ).toBe("current");
    expect(
      classifyFreshness("2026-09-09T00:00:00.000Z", currentTime, policy),
    ).toBe("aging");
    expect(
      classifyFreshness("2026-09-07T00:00:00.000Z", currentTime, policy),
    ).toBe("stale");
  });

  it("returns unknown instead of inventing a result for invalid policy or timestamps", () => {
    expect(classifyFreshness("not-a-date", currentTime, policy)).toBe(
      "unknown",
    );
    expect(
      classifyFreshness("2026-09-09T00:00:00.000Z", currentTime, {
        ...policy,
        agingAfterHours: 72,
        staleAfterHours: 24,
      }),
    ).toBe("unknown");
  });
});

describe("decidePublication", () => {
  it("publishes a valid candidate and exposes active status", () => {
    const snapshot = createSnapshot("new", "2026-09-10T00:00:00.000Z");
    const decision = decidePublication(
      candidate(snapshot),
      undefined,
      currentTime,
      policy,
    );

    expect(decision.outcome).toBe("published");
    expect(decision.activeSnapshot).toBe(snapshot);
    expect(decision.status).toEqual(
      expect.objectContaining({
        networkAvailability: "available",
        activeSnapshotId: "new",
        freshness: "current",
        coverage: "limited",
      }),
    );
    expect(decision.rejectionIssues).toEqual([]);
  });

  it("publishes a candidate with an accepted warning", () => {
    const snapshot = createSnapshot("warning", "2026-09-10T00:00:00.000Z");
    const decision = decidePublication(
      candidate(snapshot, {
        issues: [
          {
            code: "DATA-WARN-001",
            classification: "warning",
            message: "Optional timepoint value is absent.",
          },
        ],
      }),
      undefined,
      currentTime,
      policy,
    );

    expect(decision.outcome).toBe("published");
    expect(decision.activeSnapshot).toBe(snapshot);
    expect(decision.rejectionIssues).toEqual([]);
  });

  it("keeps the current snapshot when a candidate is rejected", () => {
    const current = createSnapshot("current", "2026-09-09T00:00:00.000Z");
    const rejected = candidate(createSnapshot("rejected", currentTime), {
      accepted: false,
      snapshot: undefined,
      issues: [
        {
          code: "DATA-HARD-003",
          classification: "blocker",
          message: "Dangling route reference.",
        },
      ],
    });
    const decision = decidePublication(rejected, current, currentTime, policy);

    expect(decision.outcome).toBe("fallback");
    expect(decision.activeSnapshot).toBe(current);
    expect(decision.rejectedCandidateId).toBe("rejected");
    expect(decision.rejectionIssues).toEqual(rejected.issues);
    expect(decision.status.activeSnapshotId).toBe("current");
  });

  it("returns explicit unavailable state when there is no valid fallback", () => {
    const rejected = candidate(createSnapshot("rejected", currentTime), {
      accepted: false,
      snapshot: undefined,
      issues: [],
    });
    const decision = decidePublication(
      rejected,
      undefined,
      currentTime,
      policy,
    );

    expect(decision.outcome).toBe("unavailable");
    expect(decision.activeSnapshot).toBeUndefined();
    expect(decision.status).toEqual(
      expect.objectContaining({
        networkAvailability: "unavailable",
        coverage: "unknown",
        activeSnapshotId: undefined,
      }),
    );
    expect(decision.status.operatorReason).toContain("manual recovery");
    expect(decision.rejectionIssues).toEqual([
      expect.objectContaining({ code: "DATA-HARD-999" }),
    ]);
  });

  it("fails closed on an unclassified warning", () => {
    const current = createSnapshot("current", currentTime);
    const unclassified = candidate(
      createSnapshot("unclassified", currentTime),
      {
        issues: [
          {
            code: "DATA-WARN-UNKNOWN",
            classification: "warning",
            message: "Unknown finding.",
          },
        ],
      },
    );
    const decision = decidePublication(
      unclassified,
      current,
      currentTime,
      policy,
    );

    expect(decision.outcome).toBe("fallback");
    expect(decision.activeSnapshot).toBe(current);
    expect(decision.rejectionIssues).toEqual([
      expect.objectContaining({ code: "DATA-WARN-UNKNOWN" }),
      expect.objectContaining({ code: "DATA-HARD-999" }),
    ]);
  });

  it("carries a static demo note when stale fallback use is explicitly allowed", () => {
    const current = createSnapshot("stale", "2026-09-01T00:00:00.000Z");
    const rejected = candidate(createSnapshot("rejected", currentTime), {
      accepted: false,
      snapshot: undefined,
      issues: [
        {
          code: "DATA-HARD-002",
          classification: "blocker",
          message: "Bad row.",
        },
      ],
    });
    const decision = decidePublication(rejected, current, currentTime, policy);

    expect(decision.outcome).toBe("fallback");
    expect(decision.status.freshness).toBe("stale");
    expect(decision.status.staticDemoNote).toBe(policy.staleDemoNote);
  });

  it("does not serve a stale fallback when demo use is disabled", () => {
    const current = createSnapshot("stale", "2026-09-01T00:00:00.000Z");
    const rejected = candidate(createSnapshot("rejected", currentTime), {
      accepted: false,
      snapshot: undefined,
      issues: [
        {
          code: "DATA-HARD-002",
          classification: "blocker",
          message: "Bad row.",
        },
      ],
    });
    const decision = decidePublication(rejected, current, currentTime, {
      ...policy,
      allowStaleDemo: false,
    });

    expect(decision.outcome).toBe("unavailable");
    expect(decision.activeSnapshot).toBeUndefined();
    expect(decision.status.networkAvailability).toBe("unavailable");
  });
});
