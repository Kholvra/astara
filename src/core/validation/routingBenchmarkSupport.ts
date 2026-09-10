import { type GeoCoordinate } from "~/core/geojson/geometry";

import {
  RoutingBenchmarkInputError,
  type CandidateEvaluation,
  type CandidateRouteInput,
  type FailureCategory,
  type GeometryLegFacts,
  type RouteFacts,
  type RoutingBenchmarkCandidate,
  type RoutingBenchmarkFixture,
  type RoutingBenchmarkFixtureSet,
  type RoutingBenchmarkOptions,
  type RoutingCandidateInvoker,
  type RoutingLocation,
} from "./routingBenchmarkTypes";
import { parseRouteFacts } from "./routingBenchmarkFactParsing";

export type InvocationContext = Readonly<{
  replayCount: number;
  invocationTimeoutMs: number;
  invokeCandidate: RoutingCandidateInvoker;
}>;

const DEFAULT_REPLAY_COUNT = 2;
const DEFAULT_INVOCATION_TIMEOUT_MS = 10_000;

class CandidateTimedOutError extends Error {
  public constructor() {
    super("Candidate evaluation timed out.");
    this.name = "CandidateTimedOutError";
  }
}

export async function invokeAndNormalize(
  candidate: RoutingBenchmarkCandidate,
  fixture: RoutingBenchmarkFixture,
  fixtureSet: RoutingBenchmarkFixtureSet,
  invocation: InvocationContext,
): Promise<CandidateEvaluation> {
  const input = createCandidateInput(fixture, fixtureSet);
  try {
    const raw = await invocation.invokeCandidate(
      candidate,
      input,
      invocation.invocationTimeoutMs,
    );
    return normalizeCandidateEvaluation(raw);
  } catch (error) {
    return {
      state: error instanceof CandidateTimedOutError ? "timed-out" : "failed",
      reason:
        error instanceof Error
          ? error.message
          : "Candidate evaluation failed with an unknown error.",
    };
  }
}

export function validateCandidates(
  candidates: readonly RoutingBenchmarkCandidate[],
): readonly RoutingBenchmarkCandidate[] {
  if (candidates.length === 0) {
    throw new RoutingBenchmarkInputError([
      "at least one candidate is required",
    ]);
  }
  const names = new Set<string>();
  const otp = candidates.filter((candidate) => candidate.kind === "otp");
  if (otp.length !== 1 || candidates[0]?.kind !== "otp") {
    throw new RoutingBenchmarkInputError([
      "exactly one OTP candidate must be first",
    ]);
  }
  for (const candidate of candidates) {
    if (!candidate.name.trim()) {
      throw new RoutingBenchmarkInputError([
        "candidate names must be non-empty",
      ]);
    }
    if (names.has(candidate.name)) {
      throw new RoutingBenchmarkInputError([
        `duplicate candidate name '${candidate.name}'`,
      ]);
    }
    names.add(candidate.name);
    if (typeof candidate.evaluate !== "function") {
      throw new RoutingBenchmarkInputError([
        `candidate '${candidate.name}' is missing an evaluator`,
      ]);
    }
    if (candidate.kind === "alternative" && candidate.approved !== true) {
      throw new RoutingBenchmarkInputError([
        `alternative candidate '${candidate.name}' is not approved`,
      ]);
    }
  }
  return candidates;
}

export function createInvocationContext(
  options: RoutingBenchmarkOptions,
): InvocationContext {
  const replayCount = options.replayCount ?? DEFAULT_REPLAY_COUNT;
  const invocationTimeoutMs =
    options.invocationTimeoutMs ?? DEFAULT_INVOCATION_TIMEOUT_MS;
  if (!Number.isInteger(replayCount) || replayCount < 1) {
    throw new RoutingBenchmarkInputError([
      "replayCount must be a positive integer",
    ]);
  }
  if (!Number.isFinite(invocationTimeoutMs) || invocationTimeoutMs <= 0) {
    throw new RoutingBenchmarkInputError([
      "invocationTimeoutMs must be positive",
    ]);
  }
  return {
    replayCount,
    invocationTimeoutMs,
    invokeCandidate: options.invokeCandidate ?? invokeCandidateWithTimeout,
  };
}

export async function invokeCandidateWithTimeout(
  candidate: RoutingBenchmarkCandidate,
  input: CandidateRouteInput,
  timeoutMs: number,
): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => candidate.evaluate(input)),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new CandidateTimedOutError()),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function createCandidateInput(
  fixture: RoutingBenchmarkFixture,
  fixtureSet: RoutingBenchmarkFixtureSet,
): CandidateRouteInput {
  return deepFreeze({
    caseId: fixture.id,
    origin: cloneLocation(fixture.origin),
    destination: cloneLocation(fixture.destination),
    localDateTime: fixture.localDateTime,
    snapshotId: fixtureSet.snapshotId,
    timezone: fixtureSet.timezone,
    routeRulesVersion: fixtureSet.routeRulesVersion,
    candidateConfigurationHash: fixtureSet.candidateConfigurationHash,
  });
}

export function normalizeCandidateEvaluation(
  value: unknown,
): CandidateEvaluation {
  if (!isRecord(value) || typeof value.state !== "string") {
    return { state: "failed", reason: "Candidate returned malformed output." };
  }
  if (value.state === "answered") {
    try {
      return {
        state: "answered",
        facts: parseRouteFacts(value.facts, "candidate facts", false),
      };
    } catch {
      return {
        state: "failed",
        reason: "Candidate returned malformed route facts.",
      };
    }
  }
  if (
    value.state === "unanswerable" ||
    value.state === "unsupported" ||
    value.state === "failed" ||
    value.state === "timed-out"
  ) {
    return {
      state: value.state,
      reason:
        typeof value.reason === "string" && value.reason.trim().length > 0
          ? value.reason
          : "Candidate did not provide a failure reason.",
    };
  }
  return { state: "failed", reason: "Candidate returned an unknown state." };
}

export function fingerprintEvaluation(evaluation: CandidateEvaluation): string {
  if (evaluation.state === "answered") {
    return stableSerialize({
      state: evaluation.state,
      facts: evaluation.facts,
    });
  }
  return stableSerialize({
    state: evaluation.state,
    reason: evaluation.reason,
  });
}

export function hasValidExplanationLineage(facts: RouteFacts): boolean {
  for (const field of facts.explanation.sourceFields) {
    const expected = stableSerialize(projectFact(facts, field));
    if (facts.explanation.sourceValues[field] !== expected) {
      return false;
    }
  }
  return true;
}

function projectFact(facts: RouteFacts, field: string): unknown {
  if (
    field !== "routeStatus" &&
    field !== "boardingAlighting" &&
    field !== "serviceDirection" &&
    field !== "transferCount" &&
    field !== "timing" &&
    field !== "walking" &&
    field !== "geometry" &&
    field !== "limitation"
  ) {
    return undefined;
  }
  return facts[field];
}

export function exactComparison(
  expected: unknown,
  actual: unknown,
  label: string,
  category: FailureCategory,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  return sameValue(expected, actual)
    ? passedComparison(`${label} matches`)
    : failedComparison(label, category);
}

export function passedComparison(message: string) {
  return { passed: true, message } as const;
}

export function failedComparison(message: string, category: FailureCategory) {
  return {
    passed: false,
    message: `${message} does not match`,
    category,
  } as const;
}

export function sameValue(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

export function hasContinuousLegs(
  legs: readonly GeometryLegFacts[],
  tolerance: number,
): boolean {
  for (let index = 1; index < legs.length; index += 1) {
    const previous = legs[index - 1];
    const current = legs[index];
    if (!previous || !current) {
      return false;
    }
    const previousPoint = previous.coordinates[previous.coordinates.length - 1];
    const currentPoint = current.coordinates[0];
    if (
      !previousPoint ||
      !currentPoint ||
      !coordinatesMatch(previousPoint, currentPoint, tolerance)
    ) {
      return false;
    }
  }
  return true;
}

export function coordinatesMatch(
  expected: GeoCoordinate,
  actual: GeoCoordinate,
  tolerance: number,
): boolean {
  return (
    Math.abs(expected[0] - actual[0]) <= tolerance &&
    Math.abs(expected[1] - actual[1]) <= tolerance
  );
}

export function withinTolerance(
  expected: number,
  actual: number,
  tolerance: number,
): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

export function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function stableSerialize(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
  return `{${entries.join(",")}}`;
}

function cloneLocation(location: RoutingLocation): RoutingLocation {
  return {
    stopId: location.stopId,
    label: location.label,
    coordinate: [location.coordinate[0], location.coordinate[1]],
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function asRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RoutingBenchmarkInputError([`${path} must be an object`]);
  }
  return value as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RoutingBenchmarkInputError([
      `${path} must be a non-empty string`,
    ]);
  }
  return value;
}

export function parseStringArray(
  value: unknown,
  path: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new RoutingBenchmarkInputError([`${path} must be an array`]);
  }
  return value.map((entry, index) =>
    requiredString(entry, `${path}[${index}]`),
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}
