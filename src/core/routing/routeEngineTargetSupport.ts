import type { TransferEdge } from "~/core/transfer/transferTypes";

import type { SearchContext } from "./routeEngineInternalTypes";
import { isSupportedRoute } from "./routeEngineSearchSupport";

export function createDestinationAccessStopIds(
  transferEdges: readonly TransferEdge[],
  destinationStopId: string,
): ReadonlySet<string> {
  const stopIds = new Set<string>([destinationStopId]);
  for (const edge of transferEdges) {
    if (edge.to.stopId === destinationStopId) {
      stopIds.add(edge.from.stopId);
    }
  }
  return stopIds;
}

export function createRideTargetStopIds(
  context: SearchContext,
  routeId: string,
  round: number,
): ReadonlySet<string> {
  const stopIds = new Set(context.destinationAccessStopIds);
  for (const [stopId, edges] of context.transferEdgesByFromStop.entries()) {
    if (
      edges.some(
        (edge) =>
          canBoardRouteAtTransferSource(context, edge, routeId) &&
          isUsefulTransferEdge(context, edge, routeId, round),
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
  round: number,
): boolean {
  if (edge.to.stopId === context.request.planning.destinationId) {
    return true;
  }
  const remainingTransfers = context.config.maxTransfers - round - 1;
  if (remainingTransfers < 0) {
    return false;
  }
  const targetRouteIds = edge.to.transitServiceId
    ? [edge.to.transitServiceId]
    : (context.index.routeIdsByStopId.get(edge.to.stopId) ?? []);
  return targetRouteIds.some(
    (targetRouteId) =>
      targetRouteId !== routeId &&
      isSupportedRoute(context, targetRouteId) &&
      (context.routeTransferDistanceToDestination.get(targetRouteId) ??
        Number.POSITIVE_INFINITY) <= remainingTransfers,
  );
}

function canBoardRouteAtTransferSource(
  context: SearchContext,
  edge: TransferEdge,
  routeId: string,
): boolean {
  if (edge.from.transitServiceId !== undefined) {
    return edge.from.transitServiceId === routeId;
  }
  return (context.index.routeIdsByStopId.get(edge.from.stopId) ?? []).includes(
    routeId,
  );
}
