import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import {
  makePlanningInput,
  makeSnapshot,
  makeTransferEdge,
  makeTransferSnapshot,
} from "~/core/routing/routeEngineTestFixtures";
import type { RouteSelectionSuccess } from "~/core/routing/routingTypes";
import { RouteTimeline } from "./RouteTimeline";

function createDirectRouteSuccess(): PlannerPlanSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeSnapshot(),
    planning: makePlanningInput("2026-09-11", "08:00"),
    transferEdges: [],
  }) as RouteSelectionSuccess;

  return {
    state: "success",
    snapshotId: "test-snapshot",
    configurationHash: "test-hash",
    result,
    stopLabels: {
      origin: "Halte Asal",
      destination: "Halte Tujuan",
    },
    mapData: {
      routeId: "test-route",
      legs: [],
      markers: [],
      attributions: [],
    },
    status: {
      networkAvailability: "available",
      freshness: "current",
      coverage: "complete",
      evidenceState: "limited",
      connectionState: "routable",
      timingSemantics: "unavailable",
      geometryState: "supported",
      limitations: [],
    },
  };
}

function createTransferRouteSuccess(): PlannerPlanSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeTransferSnapshot(),
    planning: makePlanningInput("2026-09-11", "08:00"),
    transferEdges: [makeTransferEdge()],
  }) as RouteSelectionSuccess;

  return {
    state: "success",
    snapshotId: "test-snapshot",
    configurationHash: "test-hash",
    result,
    stopLabels: {
      origin: "Halte Asal",
      "hub-a": "Halte Hub A",
      "hub-b": "Halte Hub B",
      destination: "Halte Tujuan",
    },
    mapData: {
      routeId: "test-route",
      legs: [],
      markers: [],
      attributions: [],
    },
    status: {
      networkAvailability: "available",
      freshness: "current",
      coverage: "complete",
      evidenceState: "limited",
      connectionState: "routable",
      timingSemantics: "unavailable",
      geometryState: "supported",
      limitations: [],
    },
  };
}

describe("RouteTimeline", () => {
  it("renders departure, corridor badge, headsign, and destination for direct routes", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteTimeline, {
        route,
        steps: [],
      }),
    );

    expect(html).toContain("Halte Asal");
    expect(html).toContain("Koridor 1");
    expect(html).toContain("Arah Destination");
    expect(html).toContain("Halte Tujuan");
    expect(html).toContain("Tujuan akhir");
    expect(html).not.toContain("Halte Keberangkatan");
    expect(html).not.toContain("Halte Halte");
  });

  it("renders transfer node for multi-leg journeys with interchange context", () => {
    const route = createTransferRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteTimeline, {
        route,
        steps: [],
      }),
    );

    expect(html).toContain("Halte Asal");
    expect(html).toContain("Koridor 1");
    expect(html).toContain("Pindah koridor");
    expect(html).toContain("Koridor 2");
    expect(html).toContain("Halte Tujuan");
  });
});
