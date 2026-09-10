import type { TransferEdge } from "~/core/transfer/transferTypes";

import { compareRouteCandidates } from "./routeScoring";
import { createTransitLeg, createWalkingLeg } from "./routeLegs";
import {
  createFailure,
  findTripRideOptions,
  getTransferDurationSeconds,
  type TripRideOption,
} from "./routeEngineSupport";
import { createJourneyCandidate } from "./routeJourney";
import type { SearchContext, SearchState } from "./routeEngineInternalTypes";
import type {
  RouteCandidate,
  RouteLeg,
  RouteSelectionFailure,
  RouteLineage,
} from "./routingTypes";

export function runBoundedSearch(context: SearchContext):
  | Readonly<{
      state: "ready";
      candidates: readonly RouteCandidate[];
      lineage: RouteLineage;
    }>
  | Readonly<{ state: "failed"; failure: RouteSelectionFailure }> {
  const queue: SearchState[] = [createInitialState(context)];
  const seenStates = new Set<string>();
  const candidates: RouteCandidate[] = [];
  let processedStates = 0;

  while (queue.length > 0) {
    if (processedStates >= context.config.maxSearchStates) {
      return searchExhaustedFailure();
    }
    const state = queue.shift();
    if (!state) {
      continue;
    }
    const stateKey = serializeState(state);
    if (seenStates.has(stateKey)) {
      continue;
    }
    seenStates.add(stateKey);
    processedStates += 1;

    const rides = findTripRideOptions({
      index: context.index,
      stopId: state.stopId,
      targetStopIds: context.targetStopIds,
      supportedRouteTypes: context.config.supportedRouteTypes,
      requestedDate: context.request.planning.departAt.localDate,
      requestedTime: context.request.planning.departAt.localTime,
      readyAtSeconds: state.readyAtSeconds,
      ...(state.requiredRouteId
        ? { requiredRouteId: state.requiredRouteId }
        : {}),
      activeServiceIdsByDate: context.activeServiceIdsByDate,
    });
    for (const ride of rides) {
      if (state.usedTripIds.has(ride.trip.id)) {
        continue;
      }
      expandRide(context, state, ride, queue, candidates);
    }
  }

  const uniqueCandidates = uniqueRouteCandidates(candidates);
  if (uniqueCandidates.length === 0) {
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
    candidates: uniqueCandidates,
    lineage: context.lineage,
  };
}

function expandRide(
  context: SearchContext,
  state: SearchState,
  ride: TripRideOption,
  queue: SearchState[],
  candidates: RouteCandidate[],
): void {
  const transitLeg = createTransitLeg(
    ride,
    state.legs.length,
    context.snapshot,
  );
  const nextLegs = [...state.legs, transitLeg];
  const nextRides = [...state.rides, ride];
  const nextUsedTrips = new Set(state.usedTripIds).add(ride.trip.id);
  const nextDecisionPointCount = state.decisionPointCount + 1;
  if (ride.toStopTime.stopId === context.request.planning.destinationId) {
    candidates.push(
      createJourneyCandidate(context, {
        ...state,
        legs: nextLegs,
        rides: nextRides,
        usedTripIds: nextUsedTrips,
        decisionPointCount: nextDecisionPointCount,
        readyAtSeconds: ride.scheduled.actualArrivalSeconds,
      }),
    );
    return;
  }

  if (state.transferCount >= context.config.maxTransfers) {
    return;
  }
  enqueueTransfers(
    context,
    state,
    ride,
    nextLegs,
    nextRides,
    nextUsedTrips,
    nextDecisionPointCount,
    queue,
    candidates,
  );
}

function enqueueTransfers(
  context: SearchContext,
  state: SearchState,
  ride: TripRideOption,
  nextLegs: readonly RouteLeg[],
  nextRides: readonly TripRideOption[],
  nextUsedTrips: ReadonlySet<string>,
  nextDecisionPointCount: number,
  queue: SearchState[],
  candidates: RouteCandidate[],
): void {
  const edges =
    context.transferEdgesByFromStop.get(ride.toStopTime.stopId) ?? [];
  for (const edge of edges) {
    if (
      state.usedEdgeIds.has(edge.edgeId) ||
      (edge.from.transitServiceId !== undefined &&
        edge.from.transitServiceId !== ride.route.id)
    ) {
      continue;
    }
    const walkingLeg = createWalkingLeg(edge, nextLegs.length);
    const legs = [...nextLegs, walkingLeg];
    const transferCount = state.transferCount + 1;
    const readyAtSeconds =
      ride.scheduled.actualArrivalSeconds + getTransferDurationSeconds(edge);
    const usedEdgeIds = new Set(state.usedEdgeIds).add(edge.edgeId);
    if (edge.to.stopId === context.request.planning.destinationId) {
      candidates.push(
        createJourneyCandidate(context, {
          ...state,
          legs,
          rides: nextRides,
          usedTripIds: nextUsedTrips,
          usedEdgeIds,
          transferCount,
          decisionPointCount: nextDecisionPointCount + 1,
          readyAtSeconds,
        }),
      );
      continue;
    }
    queue.push({
      stopId: edge.to.stopId,
      readyAtSeconds,
      ...(edge.to.transitServiceId
        ? { requiredRouteId: edge.to.transitServiceId }
        : {}),
      legs,
      rides: nextRides,
      usedTripIds: nextUsedTrips,
      usedEdgeIds,
      transferCount,
      decisionPointCount: nextDecisionPointCount + 1,
    });
  }
}

function groupTransferEdges(
  edges: readonly TransferEdge[],
): ReadonlyMap<string, readonly TransferEdge[]> {
  const grouped = new Map<string, TransferEdge[]>();
  for (const edge of edges) {
    const current = grouped.get(edge.from.stopId) ?? [];
    current.push(edge);
    grouped.set(edge.from.stopId, current);
  }
  for (const current of grouped.values()) {
    current.sort((left, right) => compareOrdinal(left.edgeId, right.edgeId));
  }
  return grouped;
}

export function createTransferEdgeIndex(
  edges: readonly TransferEdge[],
): ReadonlyMap<string, readonly TransferEdge[]> {
  return groupTransferEdges(edges);
}

function uniqueRouteCandidates(
  candidates: readonly RouteCandidate[],
): readonly RouteCandidate[] {
  const unique = new Map<string, RouteCandidate>();
  for (const candidate of [...candidates].sort(compareRouteCandidates)) {
    if (!unique.has(candidate.journey.routeId)) {
      unique.set(candidate.journey.routeId, candidate);
    }
  }
  return [...unique.values()];
}

function createInitialState(context: SearchContext): SearchState {
  return {
    stopId: context.request.planning.originId,
    readyAtSeconds: context.requestedSeconds,
    legs: [],
    rides: [],
    usedTripIds: new Set(),
    usedEdgeIds: new Set(),
    transferCount: 0,
    decisionPointCount: 0,
  };
}

function serializeState(state: SearchState): string {
  return [
    state.stopId,
    String(state.readyAtSeconds),
    state.requiredRouteId ?? "",
    [...state.usedTripIds].sort(compareOrdinal).join(","),
    [...state.usedEdgeIds].sort(compareOrdinal).join(","),
  ].join("|");
}

function searchExhaustedFailure(): Readonly<{
  state: "failed";
  failure: RouteSelectionFailure;
}> {
  return {
    state: "failed",
    failure: createFailure(
      "SEARCH_EXHAUSTED",
      "The supported route search reached its safety limit before it could evaluate every candidate.",
      "Try again with a narrower supported journey or a refreshed route configuration.",
      "limited-data",
    ),
  };
}

function compareOrdinal(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return left.length - right.length;
}
