import type { GtfsSnapshot } from "~/core/ingestion/gtfsTypes";

import { createRouteScore } from "./routeScoring";
import type {
  JourneyGeometryFacts,
  JourneyRoute,
  JourneyTiming,
  JourneyWalkingFacts,
  RouteCandidate,
  RouteLeg,
} from "./routingTypes";
import type {
  ResolvedRouteEngineConfig,
  TripRideOption,
} from "./routeEngineSupport";
import type { SearchContext, SearchState } from "./routeEngineInternalTypes";

export function createJourneyCandidate(
  context: SearchContext,
  state: SearchState,
): RouteCandidate {
  const journey = createJourneyRoute(context, state);
  return { journey, score: createRouteScore(journey) };
}

function createJourneyRoute(
  context: SearchContext,
  state: SearchState,
): JourneyRoute {
  const transitLegs = state.legs.filter(
    (leg): leg is Extract<RouteLeg, { kind: "transit" }> =>
      leg.kind === "transit",
  );
  const walkingLegs = state.legs.filter(
    (leg): leg is Extract<RouteLeg, { kind: "walking" }> =>
      leg.kind === "walking",
  );
  const timing = createJourneyTiming(context, state, transitLegs, walkingLegs);
  const walking = createWalkingFacts(walkingLegs);
  const geometry = createGeometryFacts(transitLegs, walkingLegs);
  const accessEvidence = getAccessEvidence(walkingLegs);
  const evidenceRank = getEvidenceRank(
    context.snapshot,
    context.config,
    walkingLegs,
  );
  const limitationNotes = collectLimitations(
    context,
    walkingLegs,
    geometry,
    timing,
  );
  const routeId = createRouteId(state.rides, state.legs);
  return {
    routeId,
    status:
      evidenceRank === "complete" && geometry.state === "supported"
        ? "routed"
        : "limited",
    originStopId: context.request.planning.originId,
    destinationStopId: context.request.planning.destinationId,
    legs: state.legs,
    boardingAlighting: {
      originStopId: context.request.planning.originId,
      destinationStopId: context.request.planning.destinationId,
      stopIds: state.legs.flatMap((leg) => [leg.fromStopId, leg.toStopId]),
    },
    serviceDirections: uniqueDirections(transitLegs),
    transferCount: state.transferCount,
    decisionPointCount: state.decisionPointCount,
    walking,
    timing,
    geometry,
    evidenceRank,
    accessEvidence,
    limitation: {
      freshness: context.config.freshness,
      access: accessEvidence,
      notes: limitationNotes,
    },
    lineage: context.lineage,
    explanation: {
      decidingCriterion: "only-eligible",
      tieBreakApplied: false,
      reasonCodes: [],
      sourceFields: [],
      sourceValues: {},
    },
  };
}

function createJourneyTiming(
  context: SearchContext,
  state: SearchState,
  transitLegs: readonly Extract<RouteLeg, { kind: "transit" }>[],
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
): JourneyTiming {
  const firstRide = state.rides[0];
  const lastRide = state.rides[state.rides.length - 1];
  if (!firstRide || !lastRide) {
    return { semantics: "unavailable" };
  }
  const hasUnknownWalkingDuration = walkingLegs.some(
    (leg) => leg.durationSeconds === undefined,
  );
  const expectedDurationSeconds = hasUnknownWalkingDuration
    ? undefined
    : Math.max(0, state.readyAtSeconds - context.requestedSeconds);
  const durationFacts =
    expectedDurationSeconds === undefined ? {} : { expectedDurationSeconds };
  const intervalRide = state.rides.find(
    (ride) => ride.scheduled.semantics === "interval",
  );
  if (intervalRide?.scheduled.semantics === "interval") {
    return {
      semantics: "interval",
      start: intervalRide.scheduled.start,
      end: intervalRide.scheduled.end,
      headwaySeconds: intervalRide.scheduled.headwaySeconds,
      ...durationFacts,
    };
  }
  const firstTiming = firstRide.scheduled;
  const lastTiming = lastRide.scheduled;
  if (
    firstTiming.semantics === "exact" &&
    lastTiming.semantics === "exact" &&
    walkingLegs.length === 0
  ) {
    return {
      semantics: "exact",
      departure: firstTiming.departure,
      arrival: lastTiming.arrival,
      expectedDurationSeconds: Math.max(
        0,
        state.readyAtSeconds - context.requestedSeconds,
      ),
    };
  }
  if (transitLegs.length > 0) {
    return { semantics: "estimate", ...durationFacts };
  }
  return { semantics: "unavailable" };
}

function createWalkingFacts(
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
): JourneyWalkingFacts {
  const hasUnknownDistance = walkingLegs.some(
    (leg) => leg.distanceMeters === undefined,
  );
  const totalDistanceMeters = hasUnknownDistance
    ? undefined
    : walkingLegs.reduce((total, leg) => total + (leg.distanceMeters ?? 0), 0);
  return {
    ...(totalDistanceMeters === undefined ? {} : { totalDistanceMeters }),
    label: getAccessEvidence(walkingLegs),
    legs: walkingLegs,
  };
}

function createGeometryFacts(
  transitLegs: readonly Extract<RouteLeg, { kind: "transit" }>[],
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
): JourneyGeometryFacts {
  const geometry = transitLegs.map((leg) => leg.geometry);
  const hasMissingWalkingGeometry = walkingLegs.some(
    (leg) => leg.coordinates.length === 0,
  );
  if (geometry.length === 0) {
    return { state: "unavailable", legs: [] };
  }
  if (
    geometry.some((leg) => leg.state !== "supported") ||
    hasMissingWalkingGeometry
  ) {
    return { state: "limited", legs: geometry };
  }
  return { state: "supported", legs: geometry };
}

function getAccessEvidence(
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
): JourneyRoute["accessEvidence"] {
  if (walkingLegs.length === 0) {
    return "Unknown";
  }
  if (walkingLegs.some((leg) => leg.evidenceState === "Perlu dicek")) {
    return "Perlu dicek";
  }
  if (walkingLegs.some((leg) => leg.evidenceState === "Unknown")) {
    return "Unknown";
  }
  if (walkingLegs.some((leg) => leg.evidenceState === "limited")) {
    return "limited";
  }
  return "Terverifikasi";
}

function getEvidenceRank(
  snapshot: GtfsSnapshot,
  config: ResolvedRouteEngineConfig,
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
): JourneyRoute["evidenceRank"] {
  if (
    walkingLegs.some((leg) =>
      ["Unknown", "Perlu dicek"].includes(leg.evidenceState),
    )
  ) {
    return "unknown";
  }
  if (
    snapshot.coverage !== "complete" ||
    config.freshness !== "current" ||
    walkingLegs.some((leg) => leg.evidenceState !== "Terverifikasi")
  ) {
    return "limited";
  }
  return "complete";
}

function collectLimitations(
  context: SearchContext,
  walkingLegs: readonly Extract<RouteLeg, { kind: "walking" }>[],
  geometry: JourneyGeometryFacts,
  timing: JourneyTiming,
): readonly string[] {
  const notes = [
    ...context.snapshot.limitations,
    ...(context.config.staticDemoNote ? [context.config.staticDemoNote] : []),
    ...walkingLegs.flatMap((leg) => leg.limitations),
  ];
  if (geometry.state !== "supported") {
    notes.push("Route geometry is incomplete for at least one leg.");
  }
  if (timing.semantics === "interval") {
    notes.push(
      "Frequency service is shown as a headway, not an exact departure.",
    );
  }
  return uniqueStrings(notes);
}

function uniqueDirections(
  transitLegs: readonly Extract<RouteLeg, { kind: "transit" }>[],
): JourneyRoute["serviceDirections"] {
  const seen = new Set<string>();
  const directions: JourneyRoute["serviceDirections"][number][] = [];
  for (const leg of transitLegs) {
    const key = `${leg.routeId}|${leg.directionId ?? ""}|${leg.headsign ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    directions.push({
      routeId: leg.routeId,
      routeShortName: leg.routeShortName,
      routeLongName: leg.routeLongName,
      ...(leg.headsign ? { headsign: leg.headsign } : {}),
      ...(leg.directionId === undefined
        ? {}
        : { directionId: leg.directionId }),
    });
  }
  return directions;
}

function createRouteId(
  rides: readonly TripRideOption[],
  legs: readonly RouteLeg[],
): string {
  const transitPart = rides
    .map(
      (ride) =>
        `${ride.route.id}:${ride.trip.id}:${ride.serviceDate}:${ride.fromStopTime.stopId}-${ride.toStopTime.stopId}`,
    )
    .join(">>");
  const walkingPart = legs
    .filter(
      (leg): leg is Extract<RouteLeg, { kind: "walking" }> =>
        leg.kind === "walking",
    )
    .map((leg) => leg.edgeId)
    .join(">>");
  return walkingPart ? `${transitPart}|${walkingPart}` : transitPart;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
