import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type { RouteSelectionSuccess } from "~/core/routing/routingTypes";
import {
  makePlanningInput,
  makeSnapshot,
} from "~/core/routing/routeEngineTestFixtures";
import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import { Module1Explore } from "./Module1Explore";

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

describe("Module1Explore markup and layout contract", () => {
  it("renders the interactive bottom sheet handle with accessible affordance", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        timingControls: createElement(
          "div",
          { id: "mock-timing-controls" },
          "Mock Timing",
        ),
      }),
    );

    expect(html).toContain("RENCANA PERJALANAN");
    expect(html).toContain("TUJUAN POPULER");
    expect(html).toContain("chip-monas");
    expect(html).toContain("chip-gi");
    expect(html).toContain("chip-gbk");
    expect(html).toContain("explore-bottom-sheet-container");
    expect(html).toContain("explore-bottom-sheet");
    expect(html).toContain('aria-controls="explore-bottom-sheet"');
    expect(html).toContain("grid-rows-[0fr]");
    expect(html).toContain("[scrollbar-width:none]");
    expect(html).toContain("overflow-hidden");
    expect(html).not.toContain("Lihat opsi &amp; waktu");
  });

  it("automatically expands when planEnabled is true and prevents collision", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        planEnabled: true,
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        timingControls: createElement(
          "div",
          { id: "mock-timing-controls" },
          "Mock Timing",
        ),
      }),
    );

    expect(html).toContain("max-h-[calc(100%-236px)]");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("grid-rows-[1fr]");
    expect(html).toContain("mock-timing-controls");
  });

  it("renders swap and reset actions cleanly in the header card without bottom buttons", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        origin: {
          id: "monas",
          name: "Monas",
          type: "stop_or_route",
          coordinates: [106.8272, -6.1754],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        destination: {
          id: "blok-m",
          name: "Blok M",
          type: "stop_or_route",
          coordinates: [106.7981, -6.2442],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        onSwap: () => undefined,
        onReset: () => undefined,
      }),
    );

    expect(html).toContain('aria-label="Tukar asal dan tujuan"');
    expect(html).toContain("Reset");
    expect(html).not.toContain("Cari rute");
    expect(html).not.toContain("Tukar arah");
  });

  it("renders route summary in bottom sheet and hides popular destinations when route is active", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        route,
        departAt: DEPART_AT,
      }),
    );

    expect(html).toContain("Koridor 1");
    expect(html).toContain("Langsung");
    expect(html).toContain("route-card-heading");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("grid-rows-[0fr]");
    expect(html).toContain("overflow-hidden");
    expect(html).not.toContain("Tutup detail");
    expect(html).not.toContain("TUJUAN POPULER");
    expect(html).not.toContain("chip-monas");
  });

  it("renders step-by-step instructions in bottom sheet when stepsOpen is true", () => {
    const route = createDirectRouteSuccess();
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        route,
        departAt: DEPART_AT,
        stepsOpen: true,
      }),
    );

    expect(html).toContain("Langkah Perjalanan");
    expect(html).toContain("route-steps-content");
    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain("grid-rows-[1fr]");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("explore-bottom-sheet-handle");
    expect(html).not.toContain("Tutup detail");
  });

  it("renders clear route-not-found notice and action buttons when plannerState is no-route", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        origin: {
          id: "monas",
          name: "Monas",
          type: "stop_or_route",
          coordinates: [106.8272, -6.1754],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        destination: {
          id: "blok-m",
          name: "Blok M",
          type: "stop_or_route",
          coordinates: [106.7981, -6.2442],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        plannerState: "no-route",
        plannerMessage: "Tidak ada rute yang cocok. Coba halte atau waktu lain.",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        onSwap: () => undefined,
        onReset: () => undefined,
      }),
    );

    expect(html).toContain("route-not-found-card");
    expect(html).toContain("Rute tidak ditemukan");
    expect(html).toContain("Tidak ada rute yang cocok. Coba halte atau waktu lain.");
    expect(html).toContain("Tukar");
    expect(html).toContain("Ubah");
    expect(html).toContain("TUJUAN POPULER");
    expect(html).toContain("chip-monas");
    expect(html).toContain("overflow-hidden");
  });

  it("renders loading card when plannerState is loading", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        origin: {
          id: "monas",
          name: "Monas",
          type: "stop_or_route",
          coordinates: [106.8272, -6.1754],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        destination: {
          id: "blok-m",
          name: "Blok M",
          type: "stop_or_route",
          coordinates: [106.7981, -6.2442],
          source: "gtfs_local",
          confidence: "high",
          verification: "Terverifikasi",
        },
        plannerState: "loading",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
      }),
    );

    expect(html).toContain("route-loading-card");
    expect(html).toContain("Mencari rute terbaik…");
    expect(html).toContain("Menghubungkan Monas ke Blok M");
    expect(html).toContain("TUJUAN POPULER");
    expect(html).toContain("overflow-hidden");
  });
});
