import { createFailure } from "./routeEngineSupport";
import { findTripRideOptions, type TripRideOption } from "./routeEngineRides";
import {
  addDestinationLabel,
  addRaptorLabel,
  compareRaptorLabels,
  createInitialLabels,
  createRideLabel,
  createRouteSwitchId,
  createRouteSwitchLabel,
  createTransferLabel,
  groupLabels,
  type RaptorLabel,
} from "./routeEngineRaptorLabels";
import type { SearchContext } from "./routeEngineInternalTypes";
import { materializeCandidates } from "./routeEngineCandidates";
import {
  collectMarkedRouteIds,
  consumeLabelExpansion,
  hasDestinationAtOrBelowRound,
  hasZeroTransferDestination,
  isWithinSearchBudget,
  isWithinSearchDeadline,
  searchExhaustedFailure,
  type SearchBudget,
} from "./routeEngineSearchSupport";
import {
  createRideTargetStopIds,
  createDestinationRouteIds,
  createSameStopRouteIds,
  isUsefulTransferEdge,
} from "./routeEngineTargetSupport";
import type {
  RouteCandidate,
  RouteLineage,
  RouteSelectionFailure,
} from "./routingTypes";

type RaptorSearchResult =
  | Readonly<{
      state: "ready";
      candidates: readonly RouteCandidate[];
      lineage: RouteLineage;
    }>
  | Readonly<{ state: "failed"; failure: RouteSelectionFailure }>;

type ScanResult = "completed" | "exhausted";
type RideExtension = Readonly<{
  label: RaptorLabel;
  ride: TripRideOption;
  rideLabel: RaptorLabel;
}>;

export function runRaptorSearch(context: SearchContext): RaptorSearchResult {
  const rideTargetStopIdsByRouteRound = new Map<string, ReadonlySet<string>>();
  let budget: SearchBudget = {
    startedAtMs: context.nowMs(),
    labelExpansions: 0,
  };
  let markedLabels = groupLabels(createInitialLabels(context));
  const destinationLabels: RaptorLabel[] = [];
  const destinationRouteIds = createDestinationRouteIds(context);
  let routeScanCount = 0;
  let round = 0;

  while (markedLabels.size > 0) {
    if (!isWithinSearchBudget(context, budget)) {
      return searchExhaustedFailure();
    }
    const routeIds = collectMarkedRouteIds(
      context,
      markedLabels,
      round,
      budget,
    );
    if (routeIds.state === "exhausted") {
      return searchExhaustedFailure();
    }
    const nextMarkedLabels = new Map<string, RaptorLabel[]>();
    const pendingDestinationRouteIds = new Set(
      routeIds.routeIds.filter((routeId) => destinationRouteIds.has(routeId)),
    );

    for (const routeId of routeIds.routeIds) {
      const destinationFoundThisRound = hasDestinationAtOrBelowRound(
        destinationLabels,
        round,
      );
      if (destinationFoundThisRound && pendingDestinationRouteIds.size === 0) {
        break;
      }
      if (destinationFoundThisRound && !destinationRouteIds.has(routeId)) {
        continue;
      }
      const directDestinationFound =
        hasZeroTransferDestination(destinationLabels);
      if (routeScanCount >= context.config.maxSearchStates) {
        return searchExhaustedFailure();
      }
      routeScanCount += 1;
      const targetCacheKey = `${round}\u0000${routeId}`;
      const cachedTargets = rideTargetStopIdsByRouteRound.get(targetCacheKey);
      const rideTargetStopIds =
        cachedTargets ?? createRideTargetStopIds(context, routeId, round);
      if (!cachedTargets) {
        rideTargetStopIdsByRouteRound.set(targetCacheKey, rideTargetStopIds);
      }
      const scanResult = scanRoute(
        context,
        routeId,
        markedLabels,
        directDestinationFound
          ? new Set([context.request.planning.destinationId])
          : rideTargetStopIds,
        round,
        nextMarkedLabels,
        destinationLabels,
        budget,
      );
      budget = scanResult.budget;
      if (scanResult.state === "exhausted") {
        return searchExhaustedFailure();
      }
      pendingDestinationRouteIds.delete(routeId);
    }

    if (hasDestinationAtOrBelowRound(destinationLabels, round)) {
      break;
    }
    if (round >= context.config.maxTransfers) {
      break;
    }
    markedLabels = nextMarkedLabels;
    round += 1;
  }

  const materialized = materializeCandidates(
    context,
    destinationLabels,
    budget,
  );
  if (materialized.state === "exhausted") {
    return searchExhaustedFailure();
  }
  if (materialized.candidates.length === 0) {
    return {
      state: "failed",
      failure: createFailure(
        "NO_ELIGIBLE_JOURNEY",
        "No supported service can connect the selected stops at that time.",
        "Choose another supported departure time or destination.",
        "no-route",
      ),
    };
  }

  return {
    state: "ready",
    candidates: materialized.candidates,
    lineage: context.lineage,
  };
}

function scanRoute(
  context: SearchContext,
  routeId: string,
  markedLabels: ReadonlyMap<string, readonly RaptorLabel[]>,
  rideTargetStopIds: ReadonlySet<string>,
  round: number,
  nextMarkedLabels: Map<string, RaptorLabel[]>,
  destinationLabels: RaptorLabel[],
  budget: SearchBudget,
): Readonly<{ state: ScanResult; budget: SearchBudget }> {
  let currentBudget = budget;
  // Keep one best ride per downstream stop; later rides on the same route and
  // round cannot improve a compatible label with worse arrival or walking
  // facts. Incompatible trip/edge histories remain separate.
  const bestByDestinationStop = new Map<string, RideExtension[]>();
  for (const [stopId, labels] of markedLabels.entries()) {
    for (const label of labels) {
      if (
        label.requiredRouteId !== undefined &&
        label.requiredRouteId !== routeId
      ) {
        continue;
      }
      if (
        label.requiredRouteId === undefined &&
        !(context.index.routeIdsByStopId.get(stopId) ?? []).includes(routeId)
      ) {
        continue;
      }
      if (!isWithinSearchBudget(context, currentBudget)) {
        return { state: "exhausted", budget: currentBudget };
      }
      const rides = findTripRideOptions({
        index: context.index,
        stopId,
        targetStopIds: rideTargetStopIds,
        supportedRouteTypes: context.config.supportedRouteTypes,
        requestedDate: context.request.planning.departAt.localDate,
        requestedTime: context.request.planning.departAt.localTime,
        readyAtSeconds: label.readyAtSeconds,
        requiredRouteId: routeId,
        activeServiceIdsByDate: context.activeServiceIdsByDate,
        excludedTripIds: label.usedTripIds,
        shouldContinue: () => isWithinSearchDeadline(context, currentBudget),
      });
      if (!isWithinSearchBudget(context, currentBudget)) {
        return { state: "exhausted", budget: currentBudget };
      }
      for (const ride of rides) {
        if (label.usedTripIds.has(ride.trip.id)) {
          continue;
        }
        const rideLabel = createRideLabel(label, ride);
        retainRideExtension(bestByDestinationStop, {
          label,
          ride,
          rideLabel,
        });
      }
    }
  }

  const extensions = [...bestByDestinationStop.values()]
    .flat()
    .sort((left, right) =>
      compareRaptorLabels(left.rideLabel, right.rideLabel),
    );
  for (const extension of extensions) {
    if (
      hasZeroTransferDestination(destinationLabels) &&
      extension.rideLabel.stopId !== context.request.planning.destinationId
    ) {
      continue;
    }
    const expanded = consumeLabelExpansion(context, currentBudget);
    currentBudget = expanded.budget;
    if (!expanded.allowed) {
      return { state: "exhausted", budget: currentBudget };
    }
    const processed = processRide(
      context,
      extension.label,
      extension.ride,
      round,
      nextMarkedLabels,
      destinationLabels,
      currentBudget,
    );
    if (!processed) {
      return { state: "exhausted", budget: currentBudget };
    }
  }

  return { state: "completed", budget: currentBudget };
}

function retainRideExtension(
  extensionsByStop: Map<string, RideExtension[]>,
  extension: RideExtension,
): void {
  const current = extensionsByStop.get(extension.rideLabel.stopId) ?? [];
  const grouped = groupLabels([
    ...current.map((candidate) => candidate.rideLabel),
    extension.rideLabel,
  ]);
  const extensionsByKey = new Map<string, RideExtension>(
    [...current, extension].map((candidate) => [
      candidate.rideLabel.key,
      candidate,
    ]),
  );
  const retained = (grouped.get(extension.rideLabel.stopId) ?? []).flatMap(
    (label) => {
      const candidate = extensionsByKey.get(label.key);
      return candidate ? [candidate] : [];
    },
  );
  extensionsByStop.set(extension.rideLabel.stopId, retained);
}

function processRide(
  context: SearchContext,
  label: RaptorLabel,
  ride: TripRideOption,
  round: number,
  nextMarkedLabels: Map<string, RaptorLabel[]>,
  destinationLabels: RaptorLabel[],
  budget: SearchBudget,
): boolean {
  if (label.usedTripIds.has(ride.trip.id)) {
    return true;
  }

  const rideLabel = createRideLabel(label, ride);
  if (rideLabel.stopId === context.request.planning.destinationId) {
    addDestinationLabel(destinationLabels, rideLabel);
  }
  // A direct ride is the lowest possible transfer count, so transfer branches cannot outrank it.
  if (hasZeroTransferDestination(destinationLabels)) {
    return true;
  }
  if (
    round >= context.config.maxTransfers ||
    label.transferCount >= context.config.maxTransfers
  ) {
    return true;
  }

  const edges = context.transferEdgesByFromStop.get(rideLabel.stopId) ?? [];
  for (const edge of edges) {
    if (!isWithinSearchDeadline(context, budget)) {
      return false;
    }
    if (!isUsefulTransferEdge(context, edge, ride.route.id, round)) {
      continue;
    }
    if (
      rideLabel.usedEdgeIds.has(edge.edgeId) ||
      (edge.from.transitServiceId !== undefined &&
        edge.from.transitServiceId !== ride.route.id)
    ) {
      continue;
    }
    const transferLabel = createTransferLabel(rideLabel, edge);
    if (transferLabel.stopId === context.request.planning.destinationId) {
      addDestinationLabel(destinationLabels, transferLabel);
      continue;
    }
    addRaptorLabel(nextMarkedLabels, transferLabel);
  }
  for (const targetRouteId of createSameStopRouteIds(
    context,
    rideLabel.stopId,
    ride.route.id,
    round,
  )) {
    if (!isWithinSearchDeadline(context, budget)) {
      return false;
    }
    const routeSwitchId = createRouteSwitchId(
      rideLabel.stopId,
      ride.route.id,
      targetRouteId,
    );
    if (rideLabel.usedRouteSwitchIds.has(routeSwitchId)) {
      continue;
    }
    addRaptorLabel(
      nextMarkedLabels,
      createRouteSwitchLabel(rideLabel, ride.route.id, targetRouteId),
    );
  }
  return true;
}
