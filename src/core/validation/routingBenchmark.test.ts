import { describe, expect, it } from "vitest";

import { runRoutingBenchmark } from "./routingBenchmark";
import { RoutingBenchmarkInputError } from "./routingBenchmarkTypes";
import {
  createFacts,
  createFactsFromInput,
  createFixtureSet,
  testOptions,
} from "./routingBenchmarkTestFixtures";

describe("runRoutingBenchmark", () => {
  it("runs OTP before an approved alternative and preserves OTP failures", async () => {
    const calls: string[] = [];
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async () => {
            calls.push("otp");
            return {
              state: "unanswerable",
              reason: "Offline OTP output is not available.",
            };
          },
        },
        {
          name: "custom",
          kind: "alternative",
          approved: true,
          evaluate: async () => {
            calls.push("custom");
            return {
              state: "unanswerable",
              reason: "Candidate output is not available.",
            };
          },
        },
      ],
      options: testOptions(),
    });

    expect(calls).toEqual(["otp", "custom"]);
    expect(report.candidates).toHaveLength(2);
    expect(report.candidates[0]?.candidate.name).toBe("otp");
    expect(report.candidates[0]?.unanswerableAssertions).toBeGreaterThan(0);
    expect(report.candidates[1]?.unanswerableAssertions).toBeGreaterThan(0);
    expect(report.decision).toBe("further-investigation");
  });

  it("rejects an unapproved alternative before invoking any candidate", async () => {
    const calls: string[] = [];

    await expect(
      runRoutingBenchmark({
        fixtureSet: createFixtureSet(),
        candidates: [
          {
            name: "otp",
            kind: "otp",
            evaluate: async () => {
              calls.push("otp");
              return { state: "unanswerable", reason: "not used" };
            },
          },
          {
            name: "custom",
            kind: "alternative",
            evaluate: async () => {
              calls.push("custom");
              return { state: "unanswerable", reason: "not used" };
            },
          },
        ],
        options: testOptions(),
      }),
    ).rejects.toBeInstanceOf(RoutingBenchmarkInputError);

    expect(calls).toEqual([]);
  });

  it("normalizes a controlled timeout without retrying", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(3),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async () => ({
            state: "answered",
            facts: createFacts(),
          }),
        },
      ],
      options: testOptions({
        invokeCandidate: async () => ({
          state: "timed-out",
          reason: "controlled timeout",
        }),
      }),
    });

    expect(report.candidates[0]?.cases).toHaveLength(3);
    expect(
      report.candidates[0]?.cases.every(
        (candidateCase) =>
          candidateCase.replays[0]?.evaluation.state === "timed-out",
      ),
    ).toBe(true);
    expect(report.candidates[0]?.unanswerableAssertions).toBe(27);
  });

  it("keeps malformed and thrown evaluator behavior visible without retries", async () => {
    const calls: string[] = [];
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(2),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            calls.push(input.caseId);
            if (input.caseId.endsWith("001")) {
              throw new Error("candidate crashed");
            }
            return null;
          },
        },
      ],
      options: testOptions(),
    });

    expect(calls).toEqual(["case-direct-001", "case-direct-002"]);
    expect(report.candidates[0]?.failedAssertions).toBe(0);
    expect(report.candidates[0]?.unanswerableAssertions).toBe(18);
    expect(report.candidates[0]?.limitations).toContain(
      "Candidate 'otp' has 18 unanswerable assertion(s).",
    );
  });

  it("does not expose or mutate expected facts through the candidate input", async () => {
    const fixtureSet = createFixtureSet();
    const report = await runRoutingBenchmark({
      fixtureSet,
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            expect("expectedFacts" in input).toBe(false);
            try {
              (input.origin as { stopId: string }).stopId = "mutated";
            } catch {
              // The runner intentionally gives candidates a frozen input view.
            }
            return {
              state: "answered",
              facts: createFactsFromInput(input),
            };
          },
        },
      ],
      options: testOptions(),
    });

    expect(report.candidates[0]?.recommendation).toBe(
      "proceed for tested scope",
    );
    expect(fixtureSet.cases[0]?.origin.stopId).toBe("origin-001");
    expect(fixtureSet.cases[0]?.expectedFacts.transferCount).toBe(0);
  });

  it("marks changed route facts across replays as nondeterministic", async () => {
    let calls = 0;
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            calls += 1;
            return {
              state: "answered",
              facts: createFactsFromInput(input, {
                headsign:
                  calls === 1 ? input.destination.label : "Other Direction",
              }),
            };
          },
        },
      ],
      options: testOptions({ replayCount: 2 }),
    });

    expect(report.candidates[0]?.nondeterministicCaseIds).toEqual([
      "case-direct-001",
    ]);
    expect(report.candidates[0]?.recommendation).toBe("investigate");
    expect(report.decision).toBe("further-investigation");
  });
});
