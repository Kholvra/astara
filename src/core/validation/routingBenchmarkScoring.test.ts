import { describe, expect, it } from "vitest";

import {
  formatRoutingBenchmarkReport,
  runRoutingBenchmark,
} from "./routingBenchmark";
import {
  RoutingBenchmarkInputError,
  type RoutingBenchmarkFixtureSet,
  type RoutingBenchmarkReport,
} from "./routingBenchmarkTypes";
import {
  createFacts,
  createFactsFromInput,
  createFixtureSet,
  gtfsTime,
  testOptions,
} from "./routingBenchmarkTestFixtures";

describe("routing benchmark scoring and assertions", () => {
  it("recommends OTP at exactly 90 percent fact correctness", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(10, {
        mandatoryFacts: [
          "routeStatus",
          "boardingAlighting",
          "serviceDirection",
          "transferCount",
          "walking",
        ],
        criticalFacts: ["routeStatus"],
      }),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => ({
            state: "answered",
            facts: createFactsFromInput(input, {
              walkingDistanceMeters:
                Number(input.caseId.slice(-3)) <= 5 ? 121 : 120,
            }),
          }),
        },
      ],
      options: testOptions({
        minimumCaseCount: 10,
        replayCount: 1,
      }),
    });

    expect(report.candidates[0]?.factLevelCorrectness).toBe(0.9);
    expect(report.candidates[0]?.recommendation).toBe(
      "proceed for tested scope",
    );
    expect(report.decision).toBe("otp");
  });

  it("investigates when fact correctness falls just below 90 percent", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(10, {
        mandatoryFacts: [
          "routeStatus",
          "boardingAlighting",
          "serviceDirection",
          "transferCount",
          "walking",
        ],
        criticalFacts: ["routeStatus"],
      }),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => ({
            state: "answered",
            facts: createFactsFromInput(input, {
              walkingDistanceMeters:
                Number(input.caseId.slice(-3)) <= 6 ? 121 : 120,
            }),
          }),
        },
      ],
      options: testOptions({
        minimumCaseCount: 10,
        replayCount: 1,
      }),
    });

    expect(report.candidates[0]?.factLevelCorrectness).toBe(0.88);
    expect(report.candidates[0]?.recommendation).toBe("investigate");
    expect(report.decision).toBe("further-investigation");
  });

  it("allows a passing approved alternative only after an OTP gap", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async () => ({
            state: "unanswerable",
            reason: "No offline OTP output.",
          }),
        },
        {
          name: "custom",
          kind: "alternative",
          approved: true,
          evaluate: async (input) => ({
            state: "answered",
            facts: createFactsFromInput(input),
          }),
        },
      ],
      options: testOptions(),
    });

    expect(report.candidates[1]?.recommendation).toBe(
      "proceed for tested scope",
    );
    expect(report.decision).toBe("custom");
  });

  it("rejects hard-coded or tampered explanation lineage", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            const facts = createFactsFromInput(input);
            return {
              state: "answered",
              facts: {
                ...facts,
                explanation: {
                  ...facts.explanation,
                  sourceValues: {
                    ...facts.explanation.sourceValues,
                    transferCount: "999",
                  },
                },
              },
            };
          },
        },
      ],
      options: testOptions(),
    });

    const explanationAssertion =
      report.candidates[0]?.cases[0]?.replays[0]?.assertions.find(
        (assertion) => assertion.fact === "explanation",
      );
    expect(explanationAssertion?.status).toBe("failed");
    expect(explanationAssertion?.category).toBe("explanation");
  });

  it("rejects reversed in-bounds geometry coordinates", async () => {
    const report = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async (input) => {
            const facts = createFactsFromInput(input);
            const geometry = facts.geometry.legs[0];
            return {
              state: "answered",
              facts: {
                ...facts,
                geometry: {
                  ...facts.geometry,
                  legs: geometry
                    ? [
                        {
                          ...geometry,
                          coordinates: [...geometry.coordinates].reverse(),
                        },
                      ]
                    : [],
                },
              },
            };
          },
        },
      ],
      options: testOptions(),
    });

    const geometryAssertion =
      report.candidates[0]?.cases[0]?.replays[0]?.assertions.find(
        (assertion) => assertion.fact === "geometry",
      );
    expect(geometryAssertion?.status).toBe("failed");
    expect(geometryAssertion?.category).toBe("geometry");
  });

  it("preserves interval, after-midnight, stale, and unknown semantics", async () => {
    const intervalFacts = createFacts({
      timing: {
        semantics: "interval",
        start: gtfsTime("24:35:00", 88_500),
        end: gtfsTime("25:35:00", 92_100),
        headwaySeconds: 600,
      },
      freshness: "stale",
      access: "Unknown",
    });
    const fixtureSet = createFixtureSet();
    const fixture = fixtureSet.cases[0];
    if (!fixture) {
      throw new Error("Test fixture missing");
    }
    const adjustedFixtureSet: RoutingBenchmarkFixtureSet = {
      ...fixtureSet,
      cases: [{ ...fixture, expectedFacts: intervalFacts }],
    };
    const report = await runRoutingBenchmark({
      fixtureSet: adjustedFixtureSet,
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async () => ({ state: "answered", facts: intervalFacts }),
        },
      ],
      options: testOptions(),
    });

    expect(report.candidates[0]?.failedAssertions).toBe(0);
    expect(report.candidates[0]?.recommendation).toBe(
      "proceed for tested scope",
    );
  });

  it("rejects a fixture with no usable critical demo denominator before candidate calls", async () => {
    const calls: string[] = [];
    const fixtureSet = createFixtureSet();
    const fixture = fixtureSet.cases[0];
    if (!fixture) {
      throw new Error("Test fixture missing");
    }

    await expect(
      runRoutingBenchmark({
        fixtureSet: {
          ...fixtureSet,
          cases: [{ ...fixture, isDemoCase: false, criticalFacts: [] }],
        },
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
        options: testOptions(),
      }),
    ).rejects.toBeInstanceOf(RoutingBenchmarkInputError);

    expect(calls).toEqual([]);
  });

  it("formats incomplete runs as further investigation", async () => {
    const completeReport = await runRoutingBenchmark({
      fixtureSet: createFixtureSet(),
      candidates: [
        {
          name: "otp",
          kind: "otp",
          evaluate: async () => ({
            state: "unanswerable",
            reason: "No output.",
          }),
        },
      ],
      options: testOptions(),
    });
    const incompleteReport: RoutingBenchmarkReport = {
      ...completeReport,
      complete: false,
      decision: "otp",
    };

    const formatted = formatRoutingBenchmarkReport(incompleteReport);

    expect(formatted).toContain("Decision: further-investigation");
    expect(formatted).toContain(
      "An incomplete run cannot support an engine recommendation",
    );
  });
});
