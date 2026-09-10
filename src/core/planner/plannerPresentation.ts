import type { JourneyRoute } from "~/core/routing/routingTypes";
import type {
  RouteMapData,
  RouteMapLeg,
  RouteMapMarker,
} from "~/core/geojson/routeGeometry";

export function createRouteMapDataForJourney(
  journey: JourneyRoute,
): RouteMapData {
  const legs: RouteMapLeg[] = journey.legs.map((leg) => {
    if (leg.kind === "transit") {
      return {
        legId: leg.legId,
        stepId: leg.legId,
        mode: "transit",
        label: `Rute ${leg.routeShortName}`,
        geometryState: leg.geometry.state,
        coordinates: leg.geometry.coordinates,
      };
    }
    return {
      legId: leg.legId,
      stepId: leg.legId,
      mode: "walking",
      label: "Pindah berjalan kaki",
      geometryState: leg.coordinates.length >= 2 ? "supported" : "unavailable",
      coordinates: leg.coordinates,
      evidenceState: leg.evidenceState,
      connectionState: leg.connectionState,
    };
  });
  const markers: RouteMapMarker[] = [];
  const firstLeg = legs[0];
  const lastLeg = legs.at(-1);
  if (firstLeg) {
    const coordinate =
      journey.legs[0]?.kind === "transit"
        ? journey.legs[0].geometry.coordinates[0]
        : journey.legs[0]?.coordinates[0];
    if (coordinate) {
      markers.push({
        markerId: "origin-1",
        stepId: firstLeg.stepId,
        kind: "origin",
        label: "Asal",
        coordinate,
        geometryState: "supported",
      });
    }
  }
  if (lastLeg) {
    const lastJourneyLeg = journey.legs.at(-1);
    const coordinate =
      lastJourneyLeg?.kind === "transit"
        ? lastJourneyLeg.geometry.coordinates.at(-1)
        : lastJourneyLeg?.coordinates.at(-1);
    if (coordinate) {
      markers.push({
        markerId: `destination-${journey.legs.length - 1}`,
        stepId: lastLeg.stepId,
        kind: "destination",
        label: "Tujuan",
        coordinate,
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
