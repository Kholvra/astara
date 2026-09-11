import type { TransferEdge } from "~/core/transfer/transferTypes";

import type { SearchContext } from "./routeEngineInternalTypes";
import type { RaptorLabel } from "./routeEngineRaptorLabels";
import { createFailure } from "./routeEngineSupport";
import type { RouteEngineIndex, RouteSelectionFailure } from "./routingTypes";
import type { ResolvedRouteEngineConfig } from "./routeEngineSupport";

export type SearchBudget = Readonly<{
  startedAtMs: number;
  labelExpansions: number;
}>;

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
  // A final walking/access edge is retained in transferCount for scoring, but
  // it must not force another transit-transfer round after the destination is
  // already reached.
  return destinationLabels.some((label) => label.transferCount <= round + 1);
}

export function createRouteTransferDistanceIndex(
  index: RouteEngineIndex,
  transferEdges: readonly TransferEdge[],
  destinationStopId: string,
  config: Pick<ResolvedRouteEngineConfig, "supportedRouteTypes">,
): ReadonlyMap<string, number> {
  const supportedRouteIdsByStopId = createSupportedRouteIdsByStopId(
    index,
    config,
  );
  const transferNeighborsByStopId = createTransferNeighborIndex(transferEdges);
  const routeIdsByBoundaryStopId = createBoundaryRouteIdsByStopId(
    index,
    transferEdges,
    transferNeighborsByStopId,
    supportedRouteIdsByStopId,
    config,
  );
  const routeNeighbors = new Map<string, Set<string>>();
  for (const routeIds of supportedRouteIdsByStopId.values()) {
    connectRoutePairs(routeNeighbors, routeIds);
  }
  for (const edge of transferEdges) {
    if (!isEligibleTransferEdge(edge)) continue;
    connectRoutePairs(
      routeNeighbors,
      routeIdsByBoundaryStopId.get(edge.from.stopId) ?? [],
      routeIdsByBoundaryStopId.get(edge.to.stopId) ?? [],
    );
  }

  const destinationRoutes =
    routeIdsByBoundaryStopId.get(destinationStopId) ?? new Set<string>();

  const distances = new Map<string, number>();
  const pendingRoutes = [...destinationRoutes].sort(compareOrdinal);
  for (const routeId of pendingRoutes) distances.set(routeId, 0);
  while (pendingRoutes.length > 0) {
    const routeId = pendingRoutes.shift();
    if (!routeId) continue;
    const distance = distances.get(routeId);
    if (distance === undefined) continue;
    for (const neighbor of routeNeighbors.get(routeId) ?? []) {
      if (distances.has(neighbor)) continue;
      distances.set(neighbor, distance + 1);
      pendingRoutes.push(neighbor);
    }
  }
  return distances;
}

function createSupportedRouteIdsByStopId(
  index: RouteEngineIndex,
  config: Pick<ResolvedRouteEngineConfig, "supportedRouteTypes">,
): ReadonlyMap<string, ReadonlySet<string>> {
  const routeIdsByStopId = new Map<string, Set<string>>();
  for (const [stopId, routeIds] of index.routeIdsByStopId.entries()) {
    const supportedRouteIds = routeIds.filter((routeId) => {
      const route = index.routesById.get(routeId);
      return (
        route !== undefined &&
        config.supportedRouteTypes.includes(route.routeType)
      );
    });
    if (supportedRouteIds.length > 0) {
      routeIdsByStopId.set(stopId, new Set(supportedRouteIds));
    }
  }
  return routeIdsByStopId;
}

function createBoundaryRouteIdsByStopId(
  index: RouteEngineIndex,
  transferEdges: readonly TransferEdge[],
  transferNeighborsByStopId: ReadonlyMap<string, ReadonlySet<string>>,
  supportedRouteIdsByStopId: ReadonlyMap<string, ReadonlySet<string>>,
  config: Pick<ResolvedRouteEngineConfig, "supportedRouteTypes">,
): ReadonlyMap<string, ReadonlySet<string>> {
  const directRouteIdsByStopId = new Map<string, Set<string>>(
    [...supportedRouteIdsByStopId.entries()].map(([stopId, routeIds]) => [
      stopId,
      new Set(routeIds),
    ]),
  );
  for (const edge of transferEdges) {
    for (const endpoint of [edge.from, edge.to]) {
      const route = endpoint.transitServiceId
        ? index.routesById.get(endpoint.transitServiceId)
        : undefined;
      if (
        route === undefined ||
        !config.supportedRouteTypes.includes(route.routeType)
      ) {
        continue;
      }
      const routeIds =
        directRouteIdsByStopId.get(endpoint.stopId) ?? new Set<string>();
      routeIds.add(route.id);
      directRouteIdsByStopId.set(endpoint.stopId, routeIds);
    }
  }

  const boundaryRouteIdsByStopId = new Map<string, ReadonlySet<string>>();
  const stopIds = new Set<string>([
    ...directRouteIdsByStopId.keys(),
    ...transferEdges.flatMap((edge) => [edge.from.stopId, edge.to.stopId]),
  ]);
  for (const stopId of stopIds) {
    const directRouteIds = directRouteIdsByStopId.get(stopId);
    if (directRouteIds && directRouteIds.size > 0) {
      boundaryRouteIdsByStopId.set(stopId, directRouteIds);
      continue;
    }
    const neighboringRouteIds = new Set<string>();
    for (const neighbor of transferNeighborsByStopId.get(stopId) ?? []) {
      for (const routeId of directRouteIdsByStopId.get(neighbor) ?? []) {
        neighboringRouteIds.add(routeId);
      }
    }
    if (neighboringRouteIds.size > 0) {
      boundaryRouteIdsByStopId.set(stopId, neighboringRouteIds);
    }
  }
  return boundaryRouteIdsByStopId;
}

function createTransferNeighborIndex(
  transferEdges: readonly TransferEdge[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const neighborsByStopId = new Map<string, Set<string>>();
  for (const edge of transferEdges) {
    if (!isEligibleTransferEdge(edge)) continue;
    const fromNeighbors = neighborsByStopId.get(edge.from.stopId) ?? new Set();
    const toNeighbors = neighborsByStopId.get(edge.to.stopId) ?? new Set();
    fromNeighbors.add(edge.to.stopId);
    toNeighbors.add(edge.from.stopId);
    neighborsByStopId.set(edge.from.stopId, fromNeighbors);
    neighborsByStopId.set(edge.to.stopId, toNeighbors);
  }
  return neighborsByStopId;
}

function connectRoutePairs(
  routeNeighbors: Map<string, Set<string>>,
  fromRoutes: Iterable<string>,
  toRoutes?: Iterable<string>,
): void {
  const leftRoutes = [...new Set(fromRoutes)].sort(compareOrdinal);
  const rightRoutes = [...new Set(toRoutes ?? fromRoutes)].sort(compareOrdinal);
  for (const leftRouteId of leftRoutes) {
    for (const rightRouteId of rightRoutes) {
      if (leftRouteId === rightRouteId) continue;
      addRouteNeighbor(routeNeighbors, leftRouteId, rightRouteId);
      addRouteNeighbor(routeNeighbors, rightRouteId, leftRouteId);
    }
  }
}

function addRouteNeighbor(
  routeNeighbors: Map<string, Set<string>>,
  routeId: string,
  neighborRouteId: string,
): void {
  const neighbors = routeNeighbors.get(routeId) ?? new Set<string>();
  neighbors.add(neighborRouteId);
  routeNeighbors.set(routeId, neighbors);
}

function isEligibleTransferEdge(edge: TransferEdge): boolean {
  return (
    edge.eligibleForRouting &&
    edge.connectionState === "routable" &&
    edge.from.stopId !== edge.to.stopId
  );
}

export function collectMarkedRouteIds(
  context: SearchContext,
  markedLabels: ReadonlyMap<string, readonly RaptorLabel[]>,
  round: number,
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
        if (
          isSupportedRoute(context, label.requiredRouteId) &&
          isRouteWithinTransferBudget(context, label.requiredRouteId, round)
        ) {
          routeIds.add(label.requiredRouteId);
        }
        continue;
      }
      for (const routeId of context.index.routeIdsByStopId.get(stopId) ?? []) {
        if (!isWithinSearchDeadline(context, budget)) {
          return { state: "exhausted" };
        }
        if (
          isSupportedRoute(context, routeId) &&
          isRouteWithinTransferBudget(context, routeId, round)
        ) {
          routeIds.add(routeId);
        }
      }
    }
  }
  return { state: "ready", routeIds: [...routeIds].sort(compareOrdinal) };
}

function isRouteWithinTransferBudget(
  context: SearchContext,
  routeId: string,
  round: number,
): boolean {
  const distance = context.routeTransferDistanceToDestination.get(routeId);
  return (
    distance !== undefined && distance <= context.config.maxTransfers - round
  );
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
