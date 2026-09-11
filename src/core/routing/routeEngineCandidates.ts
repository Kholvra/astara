import { compareRouteCandidates } from "./routeScoring";
import {
  createRouteLegMaterializationContext,
  createTransitLeg,
  createWalkingLeg,
  type RouteLegMaterializationContext,
} from "./routeLegs";
import { createJourneyCandidate } from "./routeJourney";
import type { SearchContext, SearchState } from "./routeEngineInternalTypes";
import {
  isWithinSearchDeadline,
  type SearchBudget,
} from "./routeEngineSearchSupport";
import {
  compareRaptorLabels,
  type RaptorLabel,
} from "./routeEngineRaptorLabels";
import type { RouteCandidate, RouteLeg } from "./routingTypes";

export function materializeCandidates(
  context: SearchContext,
  destinationLabels: readonly RaptorLabel[],
  budget: SearchBudget,
): Readonly<
  | { state: "ready"; candidates: readonly RouteCandidate[] }
  | { state: "exhausted" }
> {
  if (destinationLabels.length === 0) {
    return { state: "ready", candidates: [] };
  }
  if (!isWithinSearchDeadline(context, budget)) {
    return { state: "exhausted" };
  }
  const materializationContext = createRouteLegMaterializationContext(
    context.snapshot,
    context.index.stopsById,
  );
  if (!isWithinSearchDeadline(context, budget)) {
    return { state: "exhausted" };
  }
  const candidates: RouteCandidate[] = [];
  for (const label of destinationLabels.slice().sort(compareRaptorLabels)) {
    if (!isWithinSearchDeadline(context, budget)) {
      return { state: "exhausted" };
    }
    candidates.push(
      createJourneyCandidate(
        context,
        toSearchState(context, label, materializationContext),
      ),
    );
  }
  const unique = new Map<string, RouteCandidate>();
  for (const candidate of candidates.sort(compareRouteCandidates)) {
    if (!isWithinSearchDeadline(context, budget)) {
      return { state: "exhausted" };
    }
    if (!unique.has(candidate.journey.routeId)) {
      unique.set(candidate.journey.routeId, candidate);
    }
  }
  return { state: "ready", candidates: [...unique.values()] };
}

function toSearchState(
  context: SearchContext,
  label: RaptorLabel,
  materializationContext: RouteLegMaterializationContext,
): SearchState {
  const unusedTransfers = [...label.transferEdges];
  const materializedLegs: RouteLeg[] = [];
  for (const edge of label.accessEdges) {
    materializedLegs.push(createWalkingLeg(edge, materializedLegs.length));
  }

  for (let index = 0; index < label.rides.length; index += 1) {
    const ride = label.rides[index];
    if (!ride) {
      continue;
    }
    materializedLegs.push(
      createTransitLeg(ride, materializedLegs.length, materializationContext),
    );

    if (index < label.rides.length - 1) {
      const nextRide = label.rides[index + 1];
      const nextFromStopId = nextRide?.fromStopTime.stopId;
      const transferIdx = unusedTransfers.findIndex(
        (edge) =>
          Boolean(edge) &&
          edge?.from.stopId === ride.toStopTime.stopId &&
          (nextFromStopId === undefined || edge?.to.stopId === nextFromStopId),
      );
      if (transferIdx !== -1) {
        const [transfer] = unusedTransfers.splice(transferIdx, 1);
        if (transfer) {
          materializedLegs.push(
            createWalkingLeg(transfer, materializedLegs.length),
          );
        }
      }
    }
  }

  for (const transfer of unusedTransfers) {
    if (transfer) {
      materializedLegs.push(
        createWalkingLeg(transfer, materializedLegs.length),
      );
    }
  }

  return {
    stopId: label.stopId,
    readyAtSeconds: label.readyAtSeconds,
    ...(label.requiredRouteId
      ? { requiredRouteId: label.requiredRouteId }
      : {}),
    legs: materializedLegs,
    rides: label.rides,
    usedTripIds: label.usedTripIds,
    usedEdgeIds: label.usedEdgeIds,
    transferCount: label.transferCount,
    decisionPointCount: label.decisionPointCount,
  };
}
