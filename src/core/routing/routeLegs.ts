import type { GtfsShapePoint, GtfsSnapshot } from "~/core/ingestion/gtfsTypes";
import { sliceShapeBetweenStops } from "~/core/geojson/shapeSlicing";
import type { TransferEdge } from "~/core/transfer/transferTypes";

import type {
  RouteGeometryReference,
  RouteLegTiming,
  TransitRouteLeg,
  WalkingRouteLeg,
} from "./routingTypes";
import type { TripRideOption } from "./routeEngineRides";

export type RouteLegMaterializationContext = Readonly<{
  stopsById: ReadonlyMap<string, GtfsSnapshot["stops"][number]>;
  shapePointsById: ReadonlyMap<string, readonly GtfsShapePoint[]>;
}>;

export function createRouteLegMaterializationContext(
  snapshot: GtfsSnapshot,
  stopsById: ReadonlyMap<string, GtfsSnapshot["stops"][number]>,
): RouteLegMaterializationContext {
  const shapePointsById = new Map<string, GtfsShapePoint[]>();
  for (const point of snapshot.shapes) {
    const points = shapePointsById.get(point.shapeId) ?? [];
    points.push(point);
    shapePointsById.set(point.shapeId, points);
  }
  for (const points of shapePointsById.values()) {
    points.sort(
      (left, right) =>
        left.sequence - right.sequence ||
        left.lineage.rowNumber - right.lineage.rowNumber,
    );
  }
  return { stopsById, shapePointsById };
}

export function createTransitLeg(
  option: TripRideOption,
  legIndex: number,
  context: RouteLegMaterializationContext,
): TransitRouteLeg {
  const routeGeometry = createGeometryReference(
    option.trip.shapeId,
    option.fromStopIndex + 1,
    option.toStopIndex + 1,
    option.fromStopTime.stopId,
    option.toStopTime.stopId,
    context,
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
  fromStopId: string,
  toStopId: string,
  context: RouteLegMaterializationContext,
): RouteGeometryReference {
  const shapePoints = shapeId
    ? (context.shapePointsById.get(shapeId) ?? [])
    : [];

  const fromStop = context.stopsById.get(fromStopId);
  const toStop = context.stopsById.get(toStopId);
  const slicedGeometry =
    fromStop && toStop
      ? sliceShapeBetweenStops({
          points: shapePoints,
          fromStop: fromStop.coordinate,
          toStop: toStop.coordinate,
        })
      : { state: "unavailable" as const, coordinates: [] };

  return {
    state: slicedGeometry.state,
    ...(shapeId ? { shapeId } : {}),
    coordinates: slicedGeometry.coordinates,
    fromStopSequence,
    toStopSequence,
  };
}
