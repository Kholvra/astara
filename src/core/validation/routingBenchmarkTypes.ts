import type { GeoCoordinate } from "~/core/geojson/geometry";
import type { GtfsTime } from "~/core/ingestion/gtfsTime";
import type { EvidenceState, Freshness } from "~/core/ingestion/gtfsTypes";

export const ROUTING_CASE_CATEGORIES = [
  "direct-brt",
  "transfer-hub",
  "feeder-mikrotrans",
  "similar-duration",
  "long-walking",
  "frequency-service",
  "after-midnight",
  "weekend-service",
  "inactive-service",
  "loop",
  "duplicate-platform",
  "barrier",
  "no-route",
  "stale-feed",
  "unknown-access",
  "contradictory-transfer",
] as const;

export type RoutingCaseCategory = (typeof ROUTING_CASE_CATEGORIES)[number];

export const ROUTING_FACT_NAMES = [
  "routeStatus",
  "boardingAlighting",
  "serviceDirection",
  "transferCount",
  "timing",
  "walking",
  "geometry",
  "explanation",
  "limitation",
] as const;

export type RouteFactName = (typeof ROUTING_FACT_NAMES)[number];

export const EXPLANATION_SOURCE_FIELDS = [
  "routeStatus",
  "boardingAlighting",
  "serviceDirection",
  "transferCount",
  "timing",
  "walking",
  "geometry",
  "limitation",
] as const;

export type ExplanationSourceField = (typeof EXPLANATION_SOURCE_FIELDS)[number];

export type RouteStatus = "routed" | "no-route";

export type RoutingLocation = Readonly<{
  stopId: string;
  label: string;
  coordinate: GeoCoordinate;
}>;

export type BoardingAlightingFacts = Readonly<{
  originStopId: string;
  destinationStopId: string;
  stopIds: readonly string[];
}>;

export type ServiceDirectionFacts = Readonly<{
  routeId: string;
  headsign: string;
  directionId?: number;
}>;

export type ExactTimingFacts = Readonly<{
  semantics: "exact";
  departure: GtfsTime;
  arrival: GtfsTime;
}>;

export type IntervalTimingFacts = Readonly<{
  semantics: "interval";
  start: GtfsTime;
  end: GtfsTime;
  headwaySeconds: number;
}>;

export type EstimateTimingFacts = Readonly<{
  semantics: "estimate";
  departure?: GtfsTime;
  arrival?: GtfsTime;
}>;

export type UnavailableTimingFacts = Readonly<{
  semantics: "unavailable";
}>;

export type TimingFacts =
  | ExactTimingFacts
  | IntervalTimingFacts
  | EstimateTimingFacts
  | UnavailableTimingFacts;

export type WalkingLegFacts = Readonly<{
  fromStopId: string;
  toStopId: string;
  distanceMeters: number;
  label: EvidenceState;
}>;

export type WalkingFacts = Readonly<{
  totalDistanceMeters: number;
  label: EvidenceState;
  legs: readonly WalkingLegFacts[];
}>;

export type GeometryLegFacts = Readonly<{
  fromStopId: string;
  toStopId: string;
  coordinates: readonly GeoCoordinate[];
}>;

export type GeometryFacts = Readonly<{
  continuity: "continuous" | "disconnected" | "unavailable";
  legs: readonly GeometryLegFacts[];
}>;

export type LimitationFacts = Readonly<{
  freshness: Freshness;
  access: EvidenceState;
  notes: readonly string[];
}>;

export type RouteExplanationFacts = Readonly<{
  reasonCodes: readonly string[];
  sourceFields: readonly ExplanationSourceField[];
  sourceValues: Readonly<Partial<Record<ExplanationSourceField, string>>>;
}>;

export type RouteFacts = Readonly<{
  routeStatus: RouteStatus;
  boardingAlighting: BoardingAlightingFacts;
  serviceDirection: ServiceDirectionFacts;
  transferCount: number;
  timing: TimingFacts;
  walking: WalkingFacts;
  geometry: GeometryFacts;
  explanation: RouteExplanationFacts;
  limitation: LimitationFacts;
}>;

export type RoutingFixtureApproval = Readonly<{
  status: "approved";
  approvedBy: string;
  approvedAt: string;
  evidenceRef: string;
}>;

export type RoutingFixtureTolerances = Readonly<{
  timingSeconds?: number;
  walkingDistanceMeters?: number;
  coordinateDegrees?: number;
}>;

export type RoutingBenchmarkFixture = Readonly<{
  id: string;
  origin: RoutingLocation;
  destination: RoutingLocation;
  localDateTime: string;
  riskCategories: readonly RoutingCaseCategory[];
  rationale: string;
  approval: RoutingFixtureApproval;
  expectedFacts: RouteFacts;
  mandatoryFacts: readonly RouteFactName[];
  criticalFacts: readonly RouteFactName[];
  isDemoCase: boolean;
  tolerances: RoutingFixtureTolerances;
}>;

export type RoutingBenchmarkFixtureSet = Readonly<{
  fixtureVersion: string;
  snapshotId: string;
  timezone: string;
  routeRulesVersion: string;
  candidateConfigurationHash: string;
  cases: readonly RoutingBenchmarkFixture[];
}>;

export type CandidateRouteInput = Readonly<{
  caseId: string;
  origin: RoutingLocation;
  destination: RoutingLocation;
  localDateTime: string;
  snapshotId: string;
  timezone: string;
  routeRulesVersion: string;
  candidateConfigurationHash: string;
}>;

export type CandidateEvaluation =
  | Readonly<{ state: "answered"; facts: RouteFacts }>
  | Readonly<{ state: "unanswerable"; reason: string }>
  | Readonly<{ state: "unsupported"; reason: string }>
  | Readonly<{ state: "failed"; reason: string }>
  | Readonly<{ state: "timed-out"; reason: string }>;

export type RoutingBenchmarkCandidate = Readonly<{
  name: string;
  kind: "otp" | "alternative";
  approved?: boolean;
  evaluate: (input: CandidateRouteInput) => unknown;
}>;

export type RoutingCandidateInvoker = (
  candidate: RoutingBenchmarkCandidate,
  input: CandidateRouteInput,
  timeoutMs: number,
) => Promise<unknown>;

export type RoutingBenchmarkOptions = Readonly<{
  minimumCaseCount?: number;
  requiredCategories?: readonly RoutingCaseCategory[];
  replayCount?: number;
  invocationTimeoutMs?: number;
  invokeCandidate?: RoutingCandidateInvoker;
}>;

export type RoutingBenchmarkRequest = Readonly<{
  fixtureSet: unknown;
  candidates: readonly RoutingBenchmarkCandidate[];
  options?: RoutingBenchmarkOptions;
}>;

export type AssertionStatus = "passed" | "failed" | "unanswerable";

export type FailureCategory =
  | "data"
  | "transfer"
  | "time"
  | "geometry"
  | "explanation"
  | "limitation"
  | "engine-limitation";

export type FactAssertion = Readonly<{
  caseId: string;
  replay: number;
  fact: RouteFactName;
  critical: boolean;
  status: AssertionStatus;
  category?: FailureCategory;
  message: string;
  expected?: unknown;
  actual?: unknown;
}>;

export type CandidateReplayOutcome = Readonly<{
  replay: number;
  evaluation: CandidateEvaluation;
  assertions: readonly FactAssertion[];
}>;

export type CandidateCaseReport = Readonly<{
  caseId: string;
  replays: readonly CandidateReplayOutcome[];
  nondeterministic: boolean;
}>;

export type CandidateRecommendation =
  "proceed for tested scope" | "iterate" | "investigate";

export type CandidateBenchmarkReport = Readonly<{
  candidate: Readonly<{
    name: string;
    kind: "otp" | "alternative";
  }>;
  caseCount: number;
  replayCount: number;
  assertionCount: number;
  passedAssertions: number;
  failedAssertions: number;
  unanswerableAssertions: number;
  criticalAssertionCount: number;
  passedCriticalAssertions: number;
  factLevelCorrectness: number;
  criticalCorrectness: number;
  nondeterministicCaseIds: readonly string[];
  cases: readonly CandidateCaseReport[];
  limitations: readonly string[];
  recommendation: CandidateRecommendation;
}>;

export type RoutingBenchmarkDecision =
  "otp" | "custom" | "further-investigation";

export type RoutingBenchmarkReport = Readonly<{
  complete: boolean;
  fixtureMetadata: Readonly<{
    fixtureVersion: string;
    snapshotId: string;
    timezone: string;
    routeRulesVersion: string;
    candidateConfigurationHash: string;
  }>;
  candidates: readonly CandidateBenchmarkReport[];
  decision: RoutingBenchmarkDecision;
  limitations: readonly string[];
}>;

export class RoutingBenchmarkInputError extends Error {
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(`Invalid routing benchmark input: ${issues.join("; ")}`);
    this.name = "RoutingBenchmarkInputError";
    this.issues = issues;
  }
}
