import type {
  CandidateRouteInput,
  RouteFacts,
  RouteFactName,
  RoutingBenchmarkFixture,
  RoutingBenchmarkFixtureSet,
  RoutingBenchmarkOptions,
} from "./routingBenchmarkTypes";

export function testOptions(
  overrides: {
    minimumCaseCount?: number;
    replayCount?: number;
    invokeCandidate?: RoutingBenchmarkOptions["invokeCandidate"];
  } = {},
): RoutingBenchmarkOptions {
  return {
    minimumCaseCount: overrides.minimumCaseCount ?? 1,
    requiredCategories: ["direct-brt"],
    replayCount: overrides.replayCount ?? 1,
    ...(overrides.invokeCandidate
      ? { invokeCandidate: overrides.invokeCandidate }
      : {}),
  };
}

export function createFixtureSet(
  caseCount = 1,
  overrides: {
    mandatoryFacts?: readonly RouteFactName[];
    criticalFacts?: readonly RouteFactName[];
  } = {},
): RoutingBenchmarkFixtureSet {
  const mandatoryFacts = overrides.mandatoryFacts ?? [
    "routeStatus",
    "boardingAlighting",
    "serviceDirection",
    "transferCount",
    "timing",
    "walking",
    "geometry",
    "explanation",
    "limitation",
  ];
  const criticalFacts = overrides.criticalFacts ?? [
    "routeStatus",
    "boardingAlighting",
    "serviceDirection",
    "transferCount",
    "timing",
    "limitation",
  ];

  return {
    fixtureVersion: "req-006-test-v1",
    snapshotId: "snapshot-test",
    timezone: "Asia/Jakarta",
    routeRulesVersion: "rules-test-v1",
    candidateConfigurationHash: "config-test-v1",
    cases: Array.from({ length: caseCount }, (_, index) =>
      createFixture(index + 1, mandatoryFacts, criticalFacts),
    ),
  };
}

function createFixture(
  index: number,
  mandatoryFacts: readonly RouteFactName[],
  criticalFacts: readonly RouteFactName[],
): RoutingBenchmarkFixture {
  const suffix = String(index).padStart(3, "0");
  const origin = {
    stopId: `origin-${suffix}`,
    label: `Origin ${suffix}`,
    coordinate: [106.8 + index / 10_000, -6.2 - index / 10_000] as const,
  };
  const destination = {
    stopId: `destination-${suffix}`,
    label: `Destination ${suffix}`,
    coordinate: [106.81 + index / 10_000, -6.19 - index / 10_000] as const,
  };

  return {
    id: `case-direct-${suffix}`,
    origin,
    destination,
    localDateTime: "2026-09-10T08:00:00+07:00",
    riskCategories: ["direct-brt"],
    rationale: "Covers a direct BRT journey.",
    approval: {
      status: "approved",
      approvedBy: "fixture-owner",
      approvedAt: "2026-09-09T00:00:00+07:00",
      evidenceRef: "REQ-006-test",
    },
    expectedFacts: createFacts({
      originStopId: origin.stopId,
      destinationStopId: destination.stopId,
      originCoordinate: origin.coordinate,
      destinationCoordinate: destination.coordinate,
      headsign: destination.label,
    }),
    mandatoryFacts,
    criticalFacts,
    isDemoCase: true,
    tolerances: {
      timingSeconds: 0,
      walkingDistanceMeters: 0,
    },
  };
}

export function createFactsFromInput(
  input: CandidateRouteInput,
  overrides: Parameters<typeof createFacts>[0] = {},
): RouteFacts {
  return createFacts({
    originStopId: input.origin.stopId,
    destinationStopId: input.destination.stopId,
    originCoordinate: input.origin.coordinate,
    destinationCoordinate: input.destination.coordinate,
    headsign: input.destination.label,
    ...overrides,
  });
}

export function createFacts(
  options: {
    originStopId?: string;
    destinationStopId?: string;
    originCoordinate?: readonly [number, number];
    destinationCoordinate?: readonly [number, number];
    routeStatus?: RouteFacts["routeStatus"];
    headsign?: string;
    transferCount?: number;
    walkingDistanceMeters?: number;
    timing?: RouteFacts["timing"];
    freshness?: RouteFacts["limitation"]["freshness"];
    access?: RouteFacts["limitation"]["access"];
  } = {},
): RouteFacts {
  const originStopId = options.originStopId ?? "origin-001";
  const destinationStopId = options.destinationStopId ?? "destination-001";
  const originCoordinate = options.originCoordinate ?? [106.8, -6.2];
  const destinationCoordinate = options.destinationCoordinate ?? [
    106.81, -6.19,
  ];
  const serviceDirection = {
    routeId: "route-test",
    headsign: options.headsign ?? "Destination 001",
    directionId: 0,
  };
  const transferCount = options.transferCount ?? 0;

  return {
    routeStatus: options.routeStatus ?? "routed",
    boardingAlighting: {
      originStopId,
      destinationStopId,
      stopIds: [originStopId, destinationStopId],
    },
    serviceDirection,
    transferCount,
    timing: options.timing ?? {
      semantics: "exact",
      departure: gtfsTime("08:00:00", 28_800),
      arrival: gtfsTime("08:10:00", 29_400),
    },
    walking: {
      totalDistanceMeters: options.walkingDistanceMeters ?? 120,
      label: "limited",
      legs: [],
    },
    geometry: {
      continuity: "continuous",
      legs: [
        {
          fromStopId: originStopId,
          toStopId: destinationStopId,
          coordinates: [originCoordinate, destinationCoordinate],
        },
      ],
    },
    explanation: {
      reasonCodes: ["direct-service"],
      sourceFields: ["transferCount", "serviceDirection"],
      sourceValues: {
        transferCount: stableSerialize(transferCount),
        serviceDirection: stableSerialize(serviceDirection),
      },
    },
    limitation: {
      freshness: options.freshness ?? "current",
      access: options.access ?? "limited",
      notes: ["Pedestrian access requires separate evidence."],
    },
  };
}

export function gtfsTime(raw: string, secondsSinceServiceDayStart: number) {
  return { raw, secondsSinceServiceDayStart };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(",")}}`;
}
