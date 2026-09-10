import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type {
  RouteSelectionFailure,
  RouteSelectionResult,
  RouteSelectionSuccess,
} from "~/core/routing/routingTypes";
import {
  makePlanningInput,
  makeSnapshot,
  makeTransferEdge,
  makeTransferSnapshot,
} from "~/core/routing/routeEngineTestFixtures";

import { RouteCard, type RouteCardProps } from "./RouteCard";

const DEPART_AT = makePlanningInput("2026-09-11", "08:00").departAt;

function selectDirectRoute(): RouteSelectionSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeSnapshot(),
    planning: makePlanningInput("2026-09-11", "08:00"),
    transferEdges: [],
  });

  expect(result.state).toBe("selected");
  if (result.state !== "selected") {
    throw new Error("Expected a selected direct route fixture");
  }
  return result;
}

function selectTransferRoute(): RouteSelectionSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeTransferSnapshot(),
    planning: makePlanningInput("2026-09-11", "08:00"),
    transferEdges: [makeTransferEdge()],
  });

  expect(result.state).toBe("selected");
  if (result.state !== "selected") {
    throw new Error("Expected a selected transfer route fixture");
  }
  return result;
}

function directProps(
  result: RouteSelectionResult,
  overrides: Partial<RouteCardProps> = {},
): RouteCardProps {
  return {
    result,
    stopLabels: {
      origin: "Halte Asal",
      destination: "Halte Tujuan",
    },
    departAt: DEPART_AT,
    ...overrides,
  };
}

function renderCard(props: RouteCardProps): string {
  return renderToStaticMarkup(createElement(RouteCard, props));
}

describe("RouteCard markup contract", () => {
  it("renders the summary first and keeps map failure separate from usable steps", () => {
    const markup = renderCard(
      directProps(selectDirectRoute(), {
        mapState: "error",
        mapCompanion: createElement(
          "div",
          { "data-testid": "map-slot" },
          "Peta pendamping",
        ),
        onMapRetry: () => undefined,
        stepsOpen: true,
      }),
    );

    expect(markup).toContain("RUTE PALING MUDAH DIIKUTI");
    expect(markup).toContain("Halte Asal");
    expect(markup).toContain("Halte Tujuan");
    expect(markup).toContain("Rute 1");
    expect(markup).toContain("Arah Destination");
    expect(markup).toContain("Jadwal 08.00");
    expect(markup).toContain("0 kali pindah");
    expect(markup).toContain("Jalan kaki: Data terbatas");
    expect(markup).toContain("Data terbatas");
    expect(markup).toContain("Lihat langkah perjalanan");
    expect(markup).toContain("Naik rute 1");
    expect(markup).toContain("Turun di Halte Tujuan");
    expect(markup).toContain(
      "Peta tidak tersedia. Langkah perjalanan tetap dapat diikuti.",
    );
    expect(markup).toContain("Coba muat peta lagi");
    expect(markup).toContain('data-testid="map-slot"');
    expect(markup).toContain('id="route-card-steps"');
    expect(markup).toContain('id="route-card-map"');
    expect(markup).toMatch(/<details[^>]*id="route-card-steps"[^>]*open/);
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("overflow-x-hidden");
    expect(markup).toContain("min-h-11");
    expect(markup).not.toContain("route-1");
  });

  it("uses native disclosure state for collapsed and expanded sections", () => {
    const collapsed = renderCard(directProps(selectDirectRoute()));
    const expanded = renderCard(
      directProps(selectDirectRoute(), {
        stepsOpen: true,
        mapOpen: true,
        mapCompanion: "Peta pendamping",
      }),
    );

    expect(collapsed).toMatch(/<details[^>]*id="route-card-steps"/);
    expect(collapsed).not.toMatch(
      /<details[^>]*id="route-card-steps"[^>]*open/,
    );
    expect(collapsed).not.toContain('aria-expanded="false"');
    expect(expanded).toMatch(/<details[^>]*id="route-card-steps"[^>]*open/);
    expect(expanded).toMatch(/<details[^>]*id="route-card-map"[^>]*open/);
    expect(expanded).toContain("Buka peta pendamping");
  });

  it("renders ordered transfer instructions and bounded walking language", () => {
    const result = selectTransferRoute();
    const markup = renderCard({
      result,
      stopLabels: {
        origin: "Halte Asal",
        "hub-a": "Hub A",
        "hub-b": "Hub B",
        destination: "Halte Tujuan",
      },
      departAt: DEPART_AT,
      stepsOpen: true,
    });

    const firstTransit = markup.indexOf("Naik rute 1");
    const transfer = markup.indexOf("Pindah dari Hub A ke Hub B");
    const secondTransit = markup.indexOf("Naik rute 2");

    expect(firstTransit).toBeGreaterThanOrEqual(0);
    expect(firstTransit).toBeLessThan(transfer);
    expect(transfer).toBeLessThan(secondTransit);
    expect(markup).toContain("Jalan kaki");
    expect(markup).toContain("Data terbatas");
    expect(markup).toContain("Pindah");
  });

  it("renders a safe recoverable failure without exposing internal details", () => {
    const failure: RouteSelectionFailure = {
      state: "no-route",
      code: "NO_ELIGIBLE_JOURNEY",
      message: "internal route graph dump: secret-stop-id",
      recoveryAction: "retry_internal_operation",
    };
    const markup = renderCard(
      directProps(failure, {
        onRetry: () => undefined,
        onEdit: () => undefined,
      }),
    );

    expect(markup).toContain("Tidak ada rute");
    expect(markup).toContain("Coba halte atau waktu keberangkatan lain.");
    expect(markup).toContain("Ubah pilihan");
    expect(markup).toContain("Coba lagi");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("NO_ELIGIBLE_JOURNEY");
    expect(markup).not.toContain("internal route graph dump");
    expect(markup).not.toContain("secret-stop-id");
  });
});
