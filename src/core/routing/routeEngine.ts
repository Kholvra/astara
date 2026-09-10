import { parseIsoServiceDate } from "~/core/ingestion/gtfsCalendar";
import type { GtfsSnapshot } from "~/core/ingestion/gtfsTypes";
import { FIXED_SCORING_POLICY } from "~/core/timing/tripTiming";

import { getServiceDateCandidates } from "./routeSchedule";
import {
  createRouteSelectionReason,
  rankRouteCandidates,
  withJourneyExplanation,
} from "./routeScoring";
import {
  createFailure,
  createRouteEngineIndex,
  createRouteLineage,
  getActiveServicesByDate,
  isRoutableTransferEdge,
  normalizeRouteEngineConfig,
} from "./routeEngineSupport";
import { createTransferEdgeIndex, runBoundedSearch } from "./routeEngineSearch";
import type { SearchContext } from "./routeEngineInternalTypes";
import type {
  RouteCandidateBuildResult,
  RouteSelectionFailure,
  RouteSelectionRequest,
  RouteSelectionResult,
  RouteSelectionSuccess,
} from "./routingTypes";

export function selectPrimaryRoute(
  request: RouteSelectionRequest,
): RouteSelectionResult {
  const built = buildRouteCandidates(request);
  if (built.state === "failed") {
    return built.failure;
  }
  const configResult = normalizeRouteEngineConfig(request.config);
  if (configResult.state === "invalid") {
    return configResult.failure;
  }

  const ranked = rankRouteCandidates(built.candidates);
  const reason = createRouteSelectionReason(ranked);
  const primaryCandidate = ranked[0];
  if (!reason || !primaryCandidate) {
    return createFailure(
      "NO_ELIGIBLE_JOURNEY",
      "No eligible journey was found for the requested trip.",
      "Choose another supported origin, destination, or departure time.",
      "no-route",
    );
  }

  const primary = withJourneyExplanation(primaryCandidate.journey, reason);
  const candidates = ranked.map((candidate) =>
    candidate.journey.routeId === primary.routeId
      ? { ...candidate, journey: primary }
      : candidate,
  );

  const result: RouteSelectionSuccess = {
    state: "selected",
    primary,
    candidates,
    reason,
    lineage: built.lineage,
    configuration: {
      routeRulesVersion: configResult.config.routeRulesVersion,
      candidateConfigurationHash:
        configResult.config.candidateConfigurationHash,
    },
  };
  return result;
}

export function buildRouteCandidates(
  request: RouteSelectionRequest,
): RouteCandidateBuildResult {
  const snapshot = request.snapshot;
  if (!snapshot) {
    return {
      state: "failed",
      failure: createFailure(
        "NO_ACTIVE_SNAPSHOT",
        "No approved transit snapshot is available.",
        "Try again after a supported transit snapshot is available.",
        "unavailable",
      ),
    };
  }

  const configResult = normalizeRouteEngineConfig(request.config);
  if (configResult.state === "invalid") {
    return { state: "failed", failure: configResult.failure };
  }
  const validation = validatePlanningRequest(request, snapshot);
  if (validation) {
    return { state: "failed", failure: validation };
  }

  const index = createRouteEngineIndex(snapshot);
  const supportedRouteCount = snapshot.routes.filter((route) =>
    configResult.config.supportedRouteTypes.includes(route.routeType),
  ).length;
  if (supportedRouteCount === 0) {
    return {
      state: "failed",
      failure: createFailure(
        "UNSUPPORTED_NETWORK",
        "The snapshot does not contain a supported TransJakarta service.",
        "Choose a supported TransJakarta stop or refresh the transit data.",
        "unsupported",
      ),
    };
  }

  const requestedSeconds = parseLocalTime(request.planning.departAt.localTime);
  const serviceDateCandidates = getServiceDateCandidates(
    request.planning.departAt.localDate,
    request.planning.departAt.localTime,
  );
  if (requestedSeconds === undefined || serviceDateCandidates.length === 0) {
    return {
      state: "failed",
      failure: createFailure(
        "INVALID_PLANNING_INPUT",
        "The departure date or local time is not valid.",
        "Enter a valid local departure date and local time.",
      ),
    };
  }

  const lineage = createRouteLineage(snapshot, configResult.config);
  const validTransferEdges = request.transferEdges.filter((edge) =>
    isRoutableTransferEdge(edge, index),
  );
  const targetStopIds = new Set<string>([
    request.planning.destinationId,
    ...validTransferEdges.map((edge) => edge.from.stopId),
  ]);
  const context: SearchContext = {
    request,
    snapshot,
    index,
    config: configResult.config,
    lineage,
    requestedSeconds,
    activeServiceIdsByDate: getActiveServicesByDate(
      snapshot,
      serviceDateCandidates.map((candidate) => candidate.serviceDate),
    ),
    targetStopIds,
    transferEdgesByFromStop: createTransferEdgeIndex(validTransferEdges),
  };

  return runBoundedSearch(context);
}

function validatePlanningRequest(
  request: RouteSelectionRequest,
  snapshot: GtfsSnapshot,
): RouteSelectionFailure | undefined {
  const planning = request.planning;
  if (planning.scoringPolicy !== FIXED_SCORING_POLICY) {
    return createFailure(
      "UNSUPPORTED_SCORING_POLICY",
      "This planner uses a fixed explainable scoring policy.",
      "Retry without a custom preference or scoring policy.",
    );
  }
  if (
    !planning.originId.trim() ||
    !planning.destinationId.trim() ||
    planning.departAt.mode !== "depart-at" ||
    parseIsoServiceDate(planning.departAt.localDate) === undefined ||
    parseLocalTime(planning.departAt.localTime) === undefined
  ) {
    return createFailure(
      "INVALID_PLANNING_INPUT",
      "Origin, destination, and departure time must be resolved before routing.",
      "Select supported stops and enter a valid local departure time.",
    );
  }

  const origin = snapshot.stops.filter((stop) => stop.id === planning.originId);
  const destination = snapshot.stops.filter(
    (stop) => stop.id === planning.destinationId,
  );
  if (origin.length !== 1 || destination.length !== 1) {
    return createFailure(
      "UNKNOWN_STOP",
      "The selected origin or destination is not a unique supported stop.",
      "Choose the supported stop from local search results.",
    );
  }
  if (
    origin[0]?.lineage.snapshotId !== snapshot.metadata.snapshotId ||
    destination[0]?.lineage.snapshotId !== snapshot.metadata.snapshotId
  ) {
    return createFailure(
      "SNAPSHOT_MISMATCH",
      "The selected stops belong to a different transit snapshot.",
      "Refresh the local stop search and choose the stops again.",
    );
  }
  if (planning.originId === planning.destinationId) {
    return createFailure(
      "SAME_ORIGIN_DESTINATION",
      "Origin and destination are the same stop.",
      "Choose a different destination stop.",
      "no-route",
    );
  }
  return undefined;
}

function parseLocalTime(value: string): number | undefined {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value);
  if (!match) {
    return undefined;
  }
  const [hourText, minuteText] = value.split(":");
  if (!hourText || !minuteText) {
    return undefined;
  }
  return Number(hourText) * 3_600 + Number(minuteText) * 60;
}
