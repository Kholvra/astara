import { describe, expect, it } from "vitest";

import type { RouteMapPayload } from "~/core/geojson/routeGeometry";

import {
  MAP_LAYER_IDS,
  MAP_LEGEND,
  MAP_SOURCE_IDS,
  createActiveStepFilter,
  createMapLayerSpecifications,
  getMapFocusCoordinates,
  getMapRouteStateLabel,
} from "./mapPresentation";

const payload: RouteMapPayload = {
  routeId: "journey-1",
  state: "supported",
  selectedRoute: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "leg:journey-1:leg-transit",
        geometry: {
          type: "LineString",
          coordinates: [
            [106.8, -6.2],
            [106.81, -6.19],
          ],
        },
        properties: {
          featureKind: "route-leg",
          routeId: "journey-1",
          legId: "leg-transit",
          stepId: "step-transit",
          mode: "transit",
          geometryState: "supported",
          lineStyle: "solid",
          label: "Koridor 1",
        },
      },
      {
        type: "Feature",
        id: "leg:journey-1:leg-walking",
        geometry: {
          type: "LineString",
          coordinates: [
            [106.81, -6.19],
            [106.812, -6.188],
          ],
        },
        properties: {
          featureKind: "route-leg",
          routeId: "journey-1",
          legId: "leg-walking",
          stepId: "step-walking",
          mode: "walking",
          geometryState: "supported",
          lineStyle: "dashed",
          label: "Jalan kaki",
        },
      },
    ],
  },
  decisionMarkers: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "marker:journey-1:marker-transfer",
        geometry: { type: "Point", coordinates: [106.81, -6.19] },
        properties: {
          featureKind: "decision-marker",
          routeId: "journey-1",
          markerId: "marker-transfer",
          stepId: "step-walking",
          kind: "transfer",
          geometryState: "supported",
          label: "Pindah layanan",
        },
      },
    ],
  },
  context: { type: "FeatureCollection", features: [] },
  attributions: [],
  limitations: [],
};

describe("map presentation contract", () => {
  it("uses stable, separate source and layer identities", () => {
    expect(MAP_SOURCE_IDS).toEqual({
      selectedRoute: "astara-selected-route",
      context: "astara-route-context",
      decisionMarkers: "astara-decision-markers",
    });
    expect(new Set(Object.values(MAP_LAYER_IDS)).size).toBe(
      Object.values(MAP_LAYER_IDS).length,
    );
  });

  it("keeps transit solid and walking dashed with text-readable legend entries", () => {
    const layers = createMapLayerSpecifications();
    const transit = layers.find(
      (layer) => layer.id === MAP_LAYER_IDS.transitLine,
    );
    const walking = layers.find(
      (layer) => layer.id === MAP_LAYER_IDS.walkingLine,
    );

    expect(transit?.type).toBe("line");
    expect(walking?.type).toBe("line");
    expect(transit?.paint).not.toHaveProperty("line-dasharray");
    expect(walking?.paint).toMatchObject({ "line-dasharray": [2, 2] });
    const transitLegend = MAP_LEGEND.find((entry) => entry.id === "transit");
    const walkingLegend = MAP_LEGEND.find((entry) => entry.id === "walking");
    expect(transitLegend?.label.includes("solid")).toBe(true);
    expect(walkingLegend?.label.includes("dashed")).toBe(true);
  });

  it("focuses the requested step and does not invent focus for an unknown step", () => {
    expect(getMapFocusCoordinates(payload, "step-walking")).toEqual([
      [106.81, -6.19],
      [106.812, -6.188],
    ]);
    expect(getMapFocusCoordinates(payload, "missing-step")).toBeUndefined();
    expect(getMapFocusCoordinates(payload)).toBeUndefined();
  });

  it("uses a safe sentinel for an inactive step filter", () => {
    expect(createActiveStepFilter("step-transit")).toEqual([
      "==",
      ["get", "stepId"],
      "step-transit",
    ]);
    expect(createActiveStepFilter()).toEqual([
      "==",
      ["get", "stepId"],
      "__astara-no-active-step__",
    ]);
  });

  it("keeps route-data state copy separate from provider lifecycle copy", () => {
    expect(getMapRouteStateLabel("supported")).toBe("Rute tersedia");
    expect(getMapRouteStateLabel("limited")).toBe("Data peta terbatas");
    expect(getMapRouteStateLabel("unavailable")).toBe(
      "Jalur peta belum tersedia",
    );
    expect(getMapRouteStateLabel("invalid")).toBe(
      "Geometri rute tidak dapat ditampilkan",
    );
  });
});
