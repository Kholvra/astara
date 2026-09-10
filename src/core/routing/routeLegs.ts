import type { GtfsSnapshot } from "~/core/ingestion/gtfsTypes";
import type { TransferEdge } from "~/core/transfer/transferTypes";

import type {
  RouteGeometryReference,
  RouteLegTiming,
  TransitRouteLeg,
  WalkingRouteLeg,
} from "./routingTypes";
import type { TripRideOption } from "./routeEngineSupport";

export function createTransitLeg(
  option: TripRideOption,
  legIndex: number,
  snapshot: GtfsSnapshot,
): TransitRouteLeg {
  const routeGeometry = createGeometryReference(
    option.trip.shapeId,
    option.fromStopIndex + 1,
    option.toStopIndex + 1,
    snapshot,
  );
  const timing: RouteLegTiming =
    option.scheduled.semantics === "exact"
      ? {
          semantics: "exact",
          departure: option.scheduled.departure,
          arrival: option.scheduled.arrival,
        }
      : {
          semantics: "interval",
          start: option.scheduled.start,
          end: option.scheduled.end,
          headwaySeconds: option.scheduled.headwaySeconds,
        };

  return {
    kind: "transit",
    legId: `transit-${legIndex + 1}-${option.trip.id}-${option.fromStopTime.stopId}-${option.toStopTime.stopId}`,
    routeId: option.route.id,
    routeShortName: option.route.shortName,
    routeLongName: option.route.longName,
    tripId: option.trip.id,
    serviceId: option.trip.serviceId,
    ...(option.trip.headsign ? { headsign: option.trip.headsign } : {}),
    ...(option.trip.directionId === undefined
      ? {}
      : { directionId: option.trip.directionId }),
    fromStopId: option.fromStopTime.stopId,
    toStopId: option.toStopTime.stopId,
    stopIds: option.stopTimes
      .slice(option.fromStopIndex, option.toStopIndex + 1)
      .map((stopTime) => stopTime.stopId),
    timing,
    durationSeconds:
      option.scheduled.actualArrivalSeconds -
      option.scheduled.actualDepartureSeconds,
    geometry: routeGeometry,
    lineage: [
      option.route.lineage,
      option.trip.lineage,
      option.fromStopTime.lineage,
      option.toStopTime.lineage,
    ],
  };
}

export function createWalkingLeg(
  edge: TransferEdge,
  legIndex: number,
): WalkingRouteLeg {
  return {
    kind: "walking",
    legId: `walking-${legIndex + 1}-${edge.edgeId}`,
    edgeId: edge.edgeId,
    fromStopId: edge.from.stopId,
    toStopId: edge.to.stopId,
    ...(edge.walkingPath?.distanceMeters === undefined
      ? {}
      : { distanceMeters: edge.walkingPath.distanceMeters }),
    ...(edge.walkingPath?.durationSeconds === undefined
      ? {}
      : { durationSeconds: edge.walkingPath.durationSeconds }),
    ...(edge.walkingPath?.pathId ? { pathId: edge.walkingPath.pathId } : {}),
    coordinates: edge.walkingPath?.coordinates ?? [],
    evidenceState: edge.evidenceState,
    connectionState: edge.connectionState,
    evidenceReferences: edge.evidenceReferences.map(
      (reference) => `${reference.source}:${reference.referenceId}`,
    ),
    limitations: edge.limitations,
  };
}

function createGeometryReference(
  shapeId: string | undefined,
  fromStopSequence: number,
  toStopSequence: number,
  snapshot: GtfsSnapshot,
): RouteGeometryReference {
  const shapePoints = shapeId
    ? snapshot.shapes
        .filter((point) => point.shapeId === shapeId)
        .sort((left, right) => left.sequence - right.sequence)
    : [];
  return {
    state: shapePoints.length > 0 ? "supported" : "unavailable",
    ...(shapeId ? { shapeId } : {}),
    coordinates: shapePoints.map((point) => point.coordinate),
    fromStopSequence,
    toStopSequence,
  };
}
