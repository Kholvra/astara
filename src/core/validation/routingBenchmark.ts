import {
  asRecord,
  createInvocationContext,
  formatPercentage,
  fingerprintEvaluation,
  invokeAndNormalize,
  ratio,
  requiredString,
  validateCandidates,
  uniqueStrings,
  type InvocationContext,
} from "./routingBenchmarkSupport";
import { parseFixture } from "./routingBenchmarkFixtureValidation";
import { evaluateAssertions } from "./routingBenchmarkAssertions";
import {
  ROUTING_CASE_CATEGORIES,
  RoutingBenchmarkInputError,
  type CandidateBenchmarkReport,
  type CandidateReplayOutcome,
  type RoutingBenchmarkCandidate,
  type RoutingBenchmarkFixtureSet,
  type RoutingBenchmarkOptions,
  type RoutingBenchmarkReport,
  type RoutingBenchmarkRequest,
  type RoutingCaseCategory,
} from "./routingBenchmarkTypes";

const DEFAULT_MINIMUM_CASE_COUNT = 30;
const DEFAULT_REQUIRED_CATEGORIES = ROUTING_CASE_CATEGORIES;

export function validateRoutingBenchmarkFixtureSet(
  value: unknown,
  options: Pick<
    RoutingBenchmarkOptions,
    "minimumCaseCount" | "requiredCategories"
  > = {},
): RoutingBenchmarkFixtureSet {
  const minimumCaseCount =
    options.minimumCaseCount ?? DEFAULT_MINIMUM_CASE_COUNT;
  const requiredCategories =
    options.requiredCategories ?? DEFAULT_REQUIRED_CATEGORIES;

  if (!Number.isInteger(minimumCaseCount) || minimumCaseCount < 1) {
    throw new RoutingBenchmarkInputError([
      "minimumCaseCount must be a positive integer",
    ]);
  }

  const input = asRecord(value, "fixture set");
  const fixtureVersion = requiredString(input.fixtureVersion, "fixtureVersion");
  const snapshotId = requiredString(input.snapshotId, "snapshotId");
  const timezone = requiredString(input.timezone, "timezone");
  const routeRulesVersion = requiredString(
    input.routeRulesVersion,
    "routeRulesVersion",
  );
  const candidateConfigurationHash = requiredString(
    input.candidateConfigurationHash,
    "candidateConfigurationHash",
  );
  const rawCases = input.cases;

  if (!Array.isArray(rawCases)) {
    throw new RoutingBenchmarkInputError(["cases must be an array"]);
  }
  if (rawCases.length < minimumCaseCount) {
    throw new RoutingBenchmarkInputError([
      `cases must contain at least ${minimumCaseCount} records`,
    ]);
  }

  const ids = new Set<string>();
  const categories = new Set<RoutingCaseCategory>();
  const cases = rawCases.map((rawCase, index) => {
    const parsed = parseFixture(rawCase, `cases[${index}]`);
    if (ids.has(parsed.id)) {
      throw new RoutingBenchmarkInputError([
        `duplicate fixture id '${parsed.id}'`,
      ]);
    }
    ids.add(parsed.id);
    for (const category of parsed.riskCategories) {
      categories.add(category);
    }
    return parsed;
  });

  const missingCategories = requiredCategories.filter(
    (category) => !categories.has(category),
  );
  if (missingCategories.length > 0) {
    throw new RoutingBenchmarkInputError([
      `missing required risk categories: ${missingCategories.join(", ")}`,
    ]);
  }

  const demoCases = cases.filter((fixture) => fixture.isDemoCase);
  if (demoCases.length === 0) {
    throw new RoutingBenchmarkInputError([
      "fixture set must contain at least one demo case",
    ]);
  }
  if (!demoCases.some((fixture) => fixture.criticalFacts.length > 0)) {
    throw new RoutingBenchmarkInputError([
      "fixture set must contain at least one critical demo assertion",
    ]);
  }

  return {
    fixtureVersion,
    snapshotId,
    timezone,
    routeRulesVersion,
    candidateConfigurationHash,
    cases,
  };
}

export async function runRoutingBenchmark(
  request: RoutingBenchmarkRequest,
): Promise<RoutingBenchmarkReport> {
  const options = request.options ?? {};
  const fixtureSet = validateRoutingBenchmarkFixtureSet(
    request.fixtureSet,
    options,
  );
  const candidates = validateCandidates(request.candidates);
  const invocation = createInvocationContext(options);

  const reports: CandidateBenchmarkReport[] = [];
  const otpCandidates = candidates.filter(
    (candidate) => candidate.kind === "otp",
  );
  const alternativeCandidates = candidates.filter(
    (candidate) => candidate.kind === "alternative",
  );

  for (const candidate of [...otpCandidates, ...alternativeCandidates]) {
    reports.push(await evaluateCandidate(candidate, fixtureSet, invocation));
  }

  const decision = chooseDecision(reports);
  const limitations = [
    "This benchmark applies only to the approved fixture set and recorded configuration.",
    "The result does not certify the full network, accessibility, map performance, or human comprehension.",
    ...reports.flatMap((report) => report.limitations),
  ];

  return {
    complete: reports.every(
      (report) =>
        report.caseCount === fixtureSet.cases.length &&
        report.replayCount === invocation.replayCount,
    ),
    fixtureMetadata: {
      fixtureVersion: fixtureSet.fixtureVersion,
      snapshotId: fixtureSet.snapshotId,
      timezone: fixtureSet.timezone,
      routeRulesVersion: fixtureSet.routeRulesVersion,
      candidateConfigurationHash: fixtureSet.candidateConfigurationHash,
    },
    candidates: reports,
    decision,
    limitations: uniqueStrings(limitations),
  };
}

export function formatRoutingBenchmarkReport(
  report: RoutingBenchmarkReport,
): string {
  const lines = [
    "# REQ-006 Routing Benchmark Report",
    "",
    `- Fixture version: ${report.fixtureMetadata.fixtureVersion}`,
    `- Snapshot: ${report.fixtureMetadata.snapshotId}`,
    `- Time zone: ${report.fixtureMetadata.timezone}`,
    `- Run complete: ${report.complete ? "yes" : "no"}`,
    `- Decision: ${report.complete ? report.decision : "further-investigation"}`,
    "",
    "## Candidate results",
    "",
  ];

  for (const candidate of report.candidates) {
    lines.push(
      `- **${candidate.candidate.name}** (${candidate.candidate.kind}): ${candidate.recommendation}`,
      `  - Cases: ${candidate.caseCount}; assertions: ${candidate.assertionCount}`,
      `  - Passed: ${candidate.passedAssertions}; failed: ${candidate.failedAssertions}; unanswerable: ${candidate.unanswerableAssertions}`,
      `  - Fact-level correctness: ${formatPercentage(candidate.factLevelCorrectness)}`,
      `  - Critical correctness: ${formatPercentage(candidate.criticalCorrectness)}`,
    );
  }

  lines.push("", "## Limitations", "");
  for (const limitation of report.limitations) {
    lines.push(`- ${limitation}`);
  }
  if (!report.complete) {
    lines.push(
      "- An incomplete run cannot support an engine recommendation; collect the missing candidate/case evidence and replay the same fixture configuration.",
    );
  }

  return `${lines.join("\n")}\n`;
}

async function evaluateCandidate(
  candidate: RoutingBenchmarkCandidate,
  fixtureSet: RoutingBenchmarkFixtureSet,
  invocation: InvocationContext,
): Promise<CandidateBenchmarkReport> {
  const cases = [];
  const limitations: string[] = [];

  for (const fixture of fixtureSet.cases) {
    const replays: CandidateReplayOutcome[] = [];
    const fingerprints: string[] = [];
    for (let replay = 1; replay <= invocation.replayCount; replay += 1) {
      const evaluation = await invokeAndNormalize(
        candidate,
        fixture,
        fixtureSet,
        invocation,
      );
      const assertions = evaluateAssertions(fixture, evaluation, replay);
      replays.push({ replay, evaluation, assertions });
      fingerprints.push(fingerprintEvaluation(evaluation));
    }

    const nondeterministic = new Set(fingerprints).size > 1;
    if (nondeterministic) {
      limitations.push(
        `Candidate '${candidate.name}' returned different route facts for fixture '${fixture.id}' across replays.`,
      );
    }
    cases.push({ caseId: fixture.id, replays, nondeterministic });
  }

  const assertions = cases.flatMap((candidateCase) =>
    candidateCase.replays.flatMap((replay) => replay.assertions),
  );
  const passedAssertions = assertions.filter(
    (assertion) => assertion.status === "passed",
  ).length;
  const failedAssertions = assertions.filter(
    (assertion) => assertion.status === "failed",
  ).length;
  const unanswerableAssertions = assertions.filter(
    (assertion) => assertion.status === "unanswerable",
  ).length;
  const criticalAssertions = assertions.filter(
    (assertion) => assertion.critical,
  );
  const passedCriticalAssertions = criticalAssertions.filter(
    (assertion) => assertion.status === "passed",
  ).length;
  const factLevelCorrectness = ratio(passedAssertions, assertions.length);
  const criticalCorrectness = ratio(
    passedCriticalAssertions,
    criticalAssertions.length,
  );
  const nondeterministicCaseIds = cases
    .filter((candidateCase) => candidateCase.nondeterministic)
    .map((candidateCase) => candidateCase.caseId);
  const recommendation = getRecommendation(
    factLevelCorrectness,
    criticalCorrectness,
    nondeterministicCaseIds,
    assertions.length,
    criticalAssertions.length,
  );

  if (failedAssertions > 0) {
    limitations.push(
      `Candidate '${candidate.name}' has ${failedAssertions} failed route-fact assertion(s).`,
    );
  }
  if (unanswerableAssertions > 0) {
    limitations.push(
      `Candidate '${candidate.name}' has ${unanswerableAssertions} unanswerable assertion(s).`,
    );
  }

  return {
    candidate: { name: candidate.name, kind: candidate.kind },
    caseCount: cases.length,
    replayCount: invocation.replayCount,
    assertionCount: assertions.length,
    passedAssertions,
    failedAssertions,
    unanswerableAssertions,
    criticalAssertionCount: criticalAssertions.length,
    passedCriticalAssertions,
    factLevelCorrectness,
    criticalCorrectness,
    nondeterministicCaseIds,
    cases,
    limitations: uniqueStrings(limitations),
    recommendation,
  };
}

function getRecommendation(
  factLevelCorrectness: number,
  criticalCorrectness: number,
  nondeterministicCaseIds: readonly string[],
  assertionCount: number,
  criticalAssertionCount: number,
): CandidateBenchmarkReport["recommendation"] {
  if (
    assertionCount === 0 ||
    criticalAssertionCount === 0 ||
    nondeterministicCaseIds.length > 0
  ) {
    return "investigate";
  }
  if (criticalCorrectness < 1) {
    return "iterate";
  }
  if (factLevelCorrectness < 0.9) {
    return "investigate";
  }
  return "proceed for tested scope";
}

function chooseDecision(
  reports: readonly CandidateBenchmarkReport[],
): RoutingBenchmarkReport["decision"] {
  const otp = reports.find((report) => report.candidate.kind === "otp");
  if (!otp) {
    return "further-investigation";
  }
  if (otp.recommendation === "proceed for tested scope") {
    return "otp";
  }
  const alternativePassed = reports.some(
    (report) =>
      report.candidate.kind === "alternative" &&
      report.recommendation === "proceed for tested scope",
  );
  return alternativePassed ? "custom" : "further-investigation";
}
