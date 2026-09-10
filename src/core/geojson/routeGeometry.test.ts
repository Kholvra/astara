import { describe, expect, it } from "vitest";

import {
  createRouteMapPayload,
  getRouteMapBounds,
  prepareRouteMapData,
  type RouteMapData,
} from "./routeGeometry";

const supportedTransit = {
  legId: "leg-transit",
  stepId: "step-transit",
  mode: "transit" as const,
  label: "Koridor 1",
  geometryState: "supported" as const,
  coordinates: [
    [106.8, -6.2],
    [106.81, -6.19],
  ] as const,
};

const supportedWalking = {
  legId: "leg-walking",
  stepId: "step-walking",
  mode: "walking" as const,
  label: "Jalan kaki ke halte",
  geometryState: "supported" as const,
  coordinates: [
    [106.81, -6.19],
    [106.812, -6.188],
  ] as const,
  evidenceState: "Terverifikasi" as const,
  connectionState: "routable" as const,
};

function makeRouteMapData(overrides: Partial<RouteMapData> = {}): RouteMapData {
  return {
    routeId: "journey-1",
    legs: [supportedTransit, supportedWalking],
    markers: [
      {
        markerId: "marker-origin",
        stepId: "step-transit",
        kind: "origin",
        label: "Mulai",
        coordinate: [106.8, -6.2],
        geometryState: "supported",
      },
      {
        markerId: "marker-destination",
        stepId: "step-walking",
        kind: "destination",
        label: "Selesai",
        coordinate: [106.812, -6.188],
        geometryState: "supported",
      },
    ],
    attributions: [
      {
        id: "access-data",
        label: "Data akses jalan kaki",
        href: "https://example.test/access",
      },
    ],
    ...overrides,
  };
}

describe("prepareRouteMapData", () => {
  it("projects selected legs, markers, and scoped context into separate collections", () => {
    const prepared = prepareRouteMapData(
      makeRouteMapData({
        context: {
          routeId: "journey-1",
          scope: "selected-route-neighborhood",
          features: [
            {
              contextId: "context-1",
              mode: "transit",
              label: "Konteks sekitar",
              geometryState: "limited",
              coordinates: [
                [106.79, -6.21],
                [106.795, -6.205],
              ],
            },
          ],
        },
      }),
    );

    expect(prepared.state).toBe("valid");
    if (prepared.state !== "valid") {
      return;
    }

    expect(prepared.payload.selectedRoute.features).toHaveLength(2);
    expect(prepared.payload.decisionMarkers.features).toHaveLength(2);
    expect(prepared.payload.context.features).toHaveLength(1);
    expect(prepared.payload.selectedRoute.features[0]).toMatchObject({
      id: "leg:journey-1:leg-transit",
      properties: {
        stepId: "step-transit",
        mode: "transit",
        lineStyle: "solid",
      },
    });
    expect(prepared.payload.selectedRoute.features[1]).toMatchObject({
      id: "leg:journey-1:leg-walking",
      properties: { lineStyle: "dashed" },
    });
    expect(prepared.payload.attributions).toEqual(
      makeRouteMapData().attributions,
    );
  });

  it("omits unknown walking and no-edge lines while preserving valid transit and markers", () => {
    const prepared = prepareRouteMapData(
      makeRouteMapData({
        legs: [
          supportedTransit,
          {
            ...supportedWalking,
            geometryState: "unknown",
            evidenceState: "Unknown",
            connectionState: "review-only",
            coordinates: [],
          },
        ],
        markers: [
          {
            markerId: "marker-walking",
            stepId: "step-walking",
            kind: "transfer",
            label: "Perlu dicek",
            coordinate: [106.81, -6.19],
            geometryState: "limited",
            connectionState: "no-edge",
          },
        ],
      }),
    );

    expect(prepared.state).toBe("valid");
    if (prepared.state !== "valid") {
      return;
    }

    expect(prepared.payload.selectedRoute.features).toHaveLength(1);
    expect(prepared.payload.selectedRoute.features[0]?.properties.mode).toBe(
      "transit",
    );
    expect(prepared.payload.decisionMarkers.features).toHaveLength(1);
    expect(prepared.payload.state).toBe("limited");
    expect(prepared.payload.limitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "step-walking",
          code: "walking-geometry-unavailable",
        }),
      ]),
    );
  });

  it("does not render a no-edge walking leg even when coordinates exist", () => {
    const prepared = prepareRouteMapData(
      makeRouteMapData({
        legs: [
          supportedTransit,
          {
            ...supportedWalking,
            connectionState: "no-edge",
          },
        ],
      }),
    );

    expect(prepared.state).toBe("valid");
    if (prepared.state !== "valid") {
      return;
    }

    expect(prepared.payload.selectedRoute.features).toHaveLength(1);
    expect(prepared.payload.limitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "step-walking",
          code: "walking-not-routable",
        }),
      ]),
    );
  });

  it("rejects malformed envelopes and reversed Jakarta coordinate order", () => {
    const malformed = prepareRouteMapData({
      ...makeRouteMapData(),
      routeId: "",
    });
    const reversed = prepareRouteMapData({
      ...makeRouteMapData(),
      markers: [
        {
          markerId: "marker-origin",
          stepId: "step-transit",
          kind: "origin",
          label: "Mulai",
          coordinate: [-6.2, 106.8],
          geometryState: "supported",
        },
      ],
    });

    expect(malformed).toMatchObject({ state: "invalid" });
    expect(reversed).toMatchObject({ state: "invalid" });
    if (malformed.state === "invalid") {
      expect(malformed.issues[0]?.path).toBe("routeId");
      expect(malformed.message).toContain("rute");
    }
  });

  it("rejects duplicate identities and marker references outside the route", () => {
    const duplicate = prepareRouteMapData(
      makeRouteMapData({
        legs: [supportedTransit, { ...supportedTransit, legId: "leg-other" }],
      }),
    );
    const missingStep = prepareRouteMapData(
      makeRouteMapData({
        markers: [
          {
            markerId: "marker-missing",
            stepId: "step-missing",
            kind: "transfer",
            label: "Transfer",
            coordinate: [106.81, -6.19],
            geometryState: "supported",
          },
        ],
      }),
    );

    expect(duplicate).toMatchObject({ state: "invalid" });
    expect(missingStep).toMatchObject({ state: "invalid" });
  });
});

describe("createRouteMapPayload", () => {
  it("keeps selected-route bounds independent from optional context", () => {
    const prepared = prepareRouteMapData(
      makeRouteMapData({
        context: {
          routeId: "journey-1",
          scope: "selected-route-neighborhood",
          features: [
            {
              contextId: "context-far",
              mode: "transit",
              label: "Konteks jauh",
              geometryState: "supported",
              coordinates: [
                [107, -6.4],
                [107.01, -6.39],
              ],
            },
          ],
        },
      }),
    );

    expect(prepared.state).toBe("valid");
    if (prepared.state !== "valid") {
      return;
    }

    const bounds = getRouteMapBounds(prepared.payload);
    expect(bounds).toEqual([
      [106.8, -6.2],
      [106.812, -6.188],
    ]);
    expect(createRouteMapPayload(prepared.data)).toEqual(prepared.payload);
  });
});
