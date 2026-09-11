import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type { RouteSelectionSuccess } from "~/core/routing/routingTypes";
import {
  makePlanningInput,
  makeSnapshot,
  makeTransferEdge,
  makeTransferSnapshot,
} from "~/core/routing/routeEngineTestFixtures";
import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import { RouteSummarySheet } from "./RouteSummarySheet";

const DEPART_AT = makePlanningInput("2026-09-11", "08:00").departAt;

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
      "hub-a": "Hub A",
      "hub-b": "Hub B",
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

describe("RouteSummarySheet", () => {
  it("renders concise summary for direct route without bloated text", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteSummarySheet, {
        route,
        departAt: DEPART_AT,
      }),
    );

    expect(html).toContain("Koridor 1");
    expect(html).toContain("Langsung");
    expect(html).toContain("Data terbatas");
    expect(html).toContain("route-card-heading");
    expect(html).toContain("Langkah Perjalanan");
    // Should NOT contain academic reason walls of text
    expect(html).not.toContain("Kenapa rute ini dipilih?");
  });

  it("renders multiple transit badges and transfer count for transfer routes", () => {
    const route = createTransferRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteSummarySheet, {
        route,
        departAt: DEPART_AT,
        fare: {
          state: "estimate",
          label: "Perkiraan tarif",
          displayAmount: "Rp3.500",
          amount: 3500,
          currency: "IDR",
          source: "transjakarta-standard",
          basis: "flat",
        },
      }),
    );

    expect(html).toContain("Koridor 1");
    expect(html).toContain("Koridor 2");
    expect(html).toContain("1x transit");
    expect(html).toContain("Rp3.500");
  });

  it("renders step-by-step instructions when stepsOpen is true", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteSummarySheet, {
        route,
        departAt: DEPART_AT,
        stepsOpen: true,
      }),
    );

    expect(html).toContain("route-steps-content");
    expect(html).toContain("Naik rute 1");
    expect(html).toContain("Turun di Halte Tujuan");
  });

  it("renders map notice when map fails", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(RouteSummarySheet, {
        route,
        departAt: DEPART_AT,
        mapNotice: "Peta tidak tersedia.",
        onMapRetry: vi.fn(),
      }),
    );

    expect(html).toContain("Peta tidak tersedia.");
    expect(html).toContain("Coba lagi");
  });
});
