import type { TransferEdge } from "~/core/transfer/transferTypes";

import type { SearchContext } from "./routeEngineInternalTypes";
import type { RaptorLabel } from "./routeEngineRaptorLabels";
import { createFailure } from "./routeEngineSupport";
import type { RouteSelectionFailure } from "./routingTypes";

export type SearchBudget = Readonly<{
  startedAtMs: number;
  labelExpansions: number;
}>;

export function createRideTargetStopIds(
  context: SearchContext,
): ReadonlySet<string> {
  const stopIds = new Set<string>([context.request.planning.destinationId]);
  for (const [stopId, edges] of context.transferEdgesByFromStop.entries()) {
    if (
      edges.some((edge) =>
        isUsefulTransferTarget(context, stopId, edge.to.stopId),
      )
    ) {
      stopIds.add(stopId);
    }
  }
  return stopIds;
}

export function isUsefulTransferEdge(
  context: SearchContext,
  edge: TransferEdge,
  routeId: string,
): boolean {
  return (
    edge.to.stopId === context.request.planning.destinationId ||
    edge.to.transitServiceId !== undefined ||
    (context.index.routeIdsByStopId.get(edge.to.stopId) ?? []).some(
      (candidateRouteId) => candidateRouteId !== routeId,
    )
  );
}

function isUsefulTransferTarget(
  context: SearchContext,
  fromStopId: string,
  toStopId: string,
): boolean {
  if (toStopId === context.request.planning.destinationId) {
    return true;
  }
  const routeIds = context.index.routeIdsByStopId.get(toStopId) ?? [];
  if (routeIds.length > 1) {
    return true;
  }
  const fromRouteIds = new Set(
    context.index.routeIdsByStopId.get(fromStopId) ?? [],
  );
  return routeIds.some((routeId) => !fromRouteIds.has(routeId));
}

export function isWithinSearchBudget(
  context: SearchContext,
  budget: SearchBudget,
): boolean {
  return (
    budget.labelExpansions < context.config.maxLabelExpansions &&
    isWithinSearchDeadline(context, budget)
  );
}

export function isWithinSearchDeadline(
  context: SearchContext,
  budget: SearchBudget,
): boolean {
  return (
    context.nowMs() - budget.startedAtMs < context.config.maxSearchDurationMs
  );
}

export function consumeLabelExpansion(
  context: SearchContext,
  budget: SearchBudget,
): Readonly<{ allowed: boolean; budget: SearchBudget }> {
  if (!isWithinSearchBudget(context, budget)) {
    return { allowed: false, budget };
  }
  return {
    allowed: true,
    budget: {
      startedAtMs: budget.startedAtMs,
      labelExpansions: budget.labelExpansions + 1,
    },
  };
}

export function hasZeroTransferDestination(
  destinationLabels: readonly RaptorLabel[],
): boolean {
  return destinationLabels.some((label) => label.transferCount === 0);
}

export function hasDestinationAtOrBelowRound(
  destinationLabels: readonly RaptorLabel[],
  round: number,
): boolean {
  return destinationLabels.some((label) => label.transferCount <= round);
}

export function collectMarkedRouteIds(
  context: SearchContext,
  markedLabels: ReadonlyMap<string, readonly RaptorLabel[]>,
  budget: SearchBudget,
): Readonly<
  { state: "ready"; routeIds: readonly string[] } | { state: "exhausted" }
> {
  const routeIds = new Set<string>();
  for (const [stopId, labels] of markedLabels.entries()) {
    for (const label of labels) {
      if (!isWithinSearchDeadline(context, budget)) {
        return { state: "exhausted" };
      }
      if (label.requiredRouteId !== undefined) {
        if (isSupportedRoute(context, label.requiredRouteId)) {
          routeIds.add(label.requiredRouteId);
        }
        continue;
      }
      for (const routeId of context.index.routeIdsByStopId.get(stopId) ?? []) {
        if (!isWithinSearchDeadline(context, budget)) {
          return { state: "exhausted" };
        }
        if (isSupportedRoute(context, routeId)) {
          routeIds.add(routeId);
        }
      }
    }
  }
  return { state: "ready", routeIds: [...routeIds].sort(compareOrdinal) };
}

export function isSupportedRoute(
  context: SearchContext,
  routeId: string,
): boolean {
  const route = context.index.routesById.get(routeId);
  return (
    route !== undefined &&
    context.config.supportedRouteTypes.includes(route.routeType)
  );
}

export function isRouteServingStop(
  context: SearchContext,
  routeId: string,
  stopId: string,
): boolean {
  return (context.index.routeIdsByStopId.get(stopId) ?? []).includes(routeId);
}

export function searchExhaustedFailure(): Readonly<{
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

export function createTransferEdgeIndex(
  edges: readonly TransferEdge[],
): ReadonlyMap<string, readonly TransferEdge[]> {
  const grouped = new Map<string, TransferEdge[]>();
  for (const edge of edges) {
    const current = grouped.get(edge.from.stopId) ?? [];
    current.push(edge);
    grouped.set(edge.from.stopId, current);
  }
  for (const current of grouped.values()) {
    current.sort(compareTransferEdges);
  }
  return grouped;
}

function compareTransferEdges(left: TransferEdge, right: TransferEdge): number {
  return compareOrdinal(left.edgeId, right.edgeId);
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
