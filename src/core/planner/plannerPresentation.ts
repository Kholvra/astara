import type { JourneyRoute } from "~/core/routing/routingTypes";
import type {
  RouteMapData,
  RouteMapLeg,
  RouteMapMarker,
} from "~/core/geojson/routeGeometry";
import type { GeoCoordinate } from "~/core/geojson/geometry";

export type RouteMapStopReference = Readonly<{
  coordinate: GeoCoordinate;
  name?: string;
}>;

export function createRouteMapDataForJourney(
  journey: JourneyRoute,
  stopsById?: ReadonlyMap<string, RouteMapStopReference>,
): RouteMapData {
  const legs: RouteMapLeg[] = journey.legs.map((leg) => {
    if (leg.kind === "transit") {
      let coordinates = leg.geometry.coordinates;
      let geometryState = leg.geometry.state;

      if (coordinates.length < 2 && stopsById) {
        const fallbackCoordinates = leg.stopIds
          .map((id) => stopsById.get(id)?.coordinate)
          .filter((coord): coord is GeoCoordinate => Boolean(coord));
        if (fallbackCoordinates.length >= 2) {
          coordinates = fallbackCoordinates;
          geometryState = "limited";
        }
      }

      return {
        legId: leg.legId,
        stepId: leg.legId,
        mode: "transit",
        label: `Rute ${leg.routeShortName}`,
        geometryState,
        coordinates,
      };
    }

    let coordinates = leg.coordinates;
    let geometryState: RouteMapLeg["geometryState"] =
      leg.coordinates.length >= 2 ? "supported" : "unavailable";

    if (coordinates.length < 2 && stopsById) {
      const fromCoord = stopsById.get(leg.fromStopId)?.coordinate;
      const toCoord = stopsById.get(leg.toStopId)?.coordinate;
      if (
        fromCoord &&
        toCoord &&
        (fromCoord[0] !== toCoord[0] || fromCoord[1] !== toCoord[1])
      ) {
        coordinates = [fromCoord, toCoord];
        geometryState = "limited";
      }
    }

    return {
      legId: leg.legId,
      stepId: leg.legId,
      mode: "walking",
      label: "Pindah berjalan kaki",
      geometryState,
      coordinates,
      evidenceState: leg.evidenceState,
      connectionState: leg.connectionState,
    };
  });

  const markers: RouteMapMarker[] = [];
  const firstLeg = legs[0];
  const lastLeg = legs.at(-1);

  if (firstLeg) {
    const originCoordinate = resolveMarkerCoordinate(
      journey.originStopId,
      journey.boardingAlighting.originStopId,
      journey.legs[0],
      stopsById,
      "start",
    );
    if (originCoordinate) {
      markers.push({
        markerId: "origin-1",
        stepId: firstLeg.stepId,
        kind: "origin",
        label: "Asal",
        coordinate: originCoordinate,
        geometryState: "supported",
      });
    }
  }

  if (lastLeg) {
    const lastJourneyLeg = journey.legs.at(-1);
    const destinationCoordinate = resolveMarkerCoordinate(
      journey.destinationStopId,
      journey.boardingAlighting.destinationStopId,
      lastJourneyLeg,
      stopsById,
      "end",
    );
    if (destinationCoordinate) {
      markers.push({
        markerId: `destination-${journey.legs.length - 1}`,
        stepId: lastLeg.stepId,
        kind: "destination",
        label: "Tujuan",
        coordinate: destinationCoordinate,
        geometryState: "supported",
      });
    }
  }

  return {
    routeId: journey.routeId,
    legs,
    markers,
    attributions: [{ id: "gtfs", label: "Data transit terjadwal" }],
  };
}

function resolveMarkerCoordinate(
  journeyStopId: string | undefined,
  boardingAlightingStopId: string | undefined,
  leg: JourneyRoute["legs"][number] | undefined,
  stopsById: ReadonlyMap<string, RouteMapStopReference> | undefined,
  position: "start" | "end",
): GeoCoordinate | undefined {
  if (journeyStopId) {
    const fromStop = stopsById?.get(journeyStopId);
    if (fromStop) return fromStop.coordinate;
  }
  if (boardingAlightingStopId) {
    const fromBa = stopsById?.get(boardingAlightingStopId);
    if (fromBa) return fromBa.coordinate;
  }
  if (leg) {
    if (leg.kind === "transit") {
      const coord =
        position === "start"
          ? leg.geometry.coordinates[0]
          : leg.geometry.coordinates.at(-1);
      if (coord) return coord;
      const legStopId = position === "start" ? leg.fromStopId : leg.toStopId;
      const legStop = stopsById?.get(legStopId);
      if (legStop) return legStop.coordinate;
    } else {
      const coord =
        position === "start" ? leg.coordinates[0] : leg.coordinates.at(-1);
      if (coord) return coord;
      const legStopId = position === "start" ? leg.fromStopId : leg.toStopId;
      const legStop = stopsById?.get(legStopId);
      if (legStop) return legStop.coordinate;
    }
  }
  return undefined;
}
