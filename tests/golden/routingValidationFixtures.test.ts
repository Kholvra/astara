import { describe, expect, it } from "vitest";

import {
  formatRoutingBenchmarkReport,
  runRoutingBenchmark,
  validateRoutingBenchmarkFixtureSet,
} from "~/core/validation/routingBenchmark";
import {
  ROUTING_CASE_CATEGORIES,
  RoutingBenchmarkInputError,
} from "~/core/validation/routingBenchmarkTypes";

import fixtureData from "./req-006-routing-cases.json";

describe("REQ-006 routing fixture artifact", () => {
  it("contains 30 approved cases across every required risk category", () => {
    const fixtureSet = validateRoutingBenchmarkFixtureSet(fixtureData);
    const categories = new Set(
      fixtureSet.cases.flatMap((fixture) => fixture.riskCategories),
    );

    expect(fixtureSet.cases).toHaveLength(30);
    expect([...categories].sort()).toEqual([...ROUTING_CASE_CATEGORIES].sort());
    expect(
      fixtureSet.cases.every(
        (fixture) => fixture.approval.status === "approved",
      ),
    ).toBe(true);
    expect(
      fixtureSet.cases.filter((fixture) => fixture.isDemoCase),
    ).not.toHaveLength(0);
  });

  it("replays the artifact through the runner without inventing candidate output", async () => {
    const calls: string[] = [];
    const report = await runRoutingBenchmark({
      fixtureSet: fixtureData,
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            calls.push(input.caseId);
            return {
              state: "unanswerable",
              reason: "No approved offline OTP output is supplied.",
            };
          },
        },
      ],
      options: { replayCount: 1 },
    });
    const formatted = formatRoutingBenchmarkReport(report);

    expect(report.complete).toBe(true);
    expect(calls).toHaveLength(30);
    expect(report.candidates[0]?.caseCount).toBe(30);
    expect(report.candidates[0]?.assertionCount).toBe(270);
    expect(report.candidates[0]?.unanswerableAssertions).toBe(270);
    expect(report.decision).toBe("further-investigation");
    expect(formatted).toContain("does not certify the full network");
  });

  it("rejects unapproved fixture input before invoking a candidate", async () => {
    const calls: string[] = [];
    const firstCase = fixtureData.cases[0];
    if (!firstCase) {
      throw new Error("Golden fixture is empty");
    }
    const invalidFixture = {
      ...fixtureData,
      cases: [
        {
          ...firstCase,
          approval: { ...firstCase.approval, status: "pending" },
        },
        ...fixtureData.cases.slice(1),
      ],
    } as unknown;

    await expect(
      runRoutingBenchmark({
        fixtureSet: invalidFixture,
        candidates: [
          {
            name: "otp",
            kind: "otp",
            evaluate: async () => {
              calls.push("otp");
              return { state: "unanswerable", reason: "not used" };
            },
          },
        ],
        options: { replayCount: 1 },
      }),
    ).rejects.toBeInstanceOf(RoutingBenchmarkInputError);

    expect(calls).toEqual([]);
  });
});
