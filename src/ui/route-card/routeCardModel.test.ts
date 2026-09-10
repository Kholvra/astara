import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";
import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type {
  JourneyRoute,
  RouteSelectionSuccess,
} from "~/core/routing/routingTypes";
import {
  makePlanningInput,
  makeSnapshot,
  makeTransferEdge,
  makeTransferSnapshot,
} from "~/core/routing/routeEngineTestFixtures";
import { resolveFareStatus } from "~/core/timing/tripTiming";

import {
  createRouteCardViewModel,
  type RouteCardInput,
  type RouteCardViewModel,
} from "./routeCardModel";

const DIRECT_PLANNING = makePlanningInput("2026-09-11", "08:00");

function selectDirectRoute(
  options: { freshness?: "current" | "aging" | "stale" | "unknown" } = {},
): RouteSelectionSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeSnapshot(),
    planning: DIRECT_PLANNING,
    transferEdges: [],
    config: options,
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
    planning: DIRECT_PLANNING,
    transferEdges: [makeTransferEdge()],
  });

  expect(result.state).toBe("selected");
  if (result.state !== "selected") {
    throw new Error("Expected a selected transfer route fixture");
  }
  return result;
}

function directInput(
  result: RouteSelectionSuccess,
  overrides: Partial<RouteCardInput> = {},
): RouteCardInput {
  return {
    result,
    stopLabels: {
      origin: "Halte Asal",
      destination: "Halte Tujuan",
    },
    departAt: DIRECT_PLANNING.departAt,
    ...overrides,
  };
}

function replacePrimary(
  result: RouteSelectionSuccess,
  primary: JourneyRoute,
): RouteSelectionSuccess {
  return { ...result, primary };
}

function selectedModel(
  result: RouteSelectionSuccess,
  overrides: Partial<RouteCardInput> = {},
): Extract<RouteCardViewModel, { state: "selected" }> {
  const model = createRouteCardViewModel(directInput(result, overrides));
  expect(model.state).toBe("selected");
  if (model.state !== "selected") {
    throw new Error("Expected a selected route-card model");
  }
  return model;
}

describe("route-card view model", () => {
  it("projects a direct route into summary, boarding, alighting, and bounded status facts", () => {
    const model = selectedModel(selectDirectRoute(), {
      fare: {
        state: "limited",
        label: "Data terbatas",
        reason: "Sumber tarif belum lengkap.",
      },
    });

    expect(model.summary).toMatchObject({
      origin: "Halte Asal",
      destination: "Halte Tujuan",
      serviceDirections: ["Rute 1 • Arah Destination"],
      departAt: "2026-09-11 • 08:00 (Asia/Jakarta)",
      timing: {
        label: "Jadwal 08.00",
        isExact: true,
      },
      duration: "20 mnt",
      transfers: "0 kali pindah",
      walking: "Jalan kaki: Data terbatas",
      fare: "Data terbatas",
    });
    expect(model.steps).toHaveLength(1);
    expect(model.steps[0]).toMatchObject({
      kind: "transit",
      title: "Naik rute 1",
      status: "Data terbatas",
    });
    expect(model.steps[0]?.detail).toContain("Turun di Halte Tujuan");
    expect(model.status.label).toBe("Data terbatas");
    expect(model.status.detail).toContain("detail akses");
    expect(model.reason.headline).toContain("Rute yang tersedia");
    expect(model.summary.origin).not.toContain("origin");
    expect(model.steps[0]?.detail).not.toContain("destination");
  });

  it("keeps a routable transfer in source order with a bounded walking status", () => {
    const result = selectTransferRoute();
    const model = createRouteCardViewModel({
      result,
      stopLabels: {
        origin: "Halte Asal",
        "hub-a": "Hub A",
        "hub-b": "Hub B",
        destination: "Halte Tujuan",
      },
      departAt: DIRECT_PLANNING.departAt,
    });

    expect(model.state).toBe("selected");
    if (model.state !== "selected") {
      return;
    }

    expect(model.steps.map((step) => step.kind)).toEqual([
      "transit",
      "walking",
      "transit",
    ]);
    expect(model.steps.map((step) => step.title)).toEqual([
      "Naik rute 1",
      "Pindah dari Hub A ke Hub B",
      "Naik rute 2",
    ]);
    expect(model.steps[1]).toMatchObject({ status: "Data terbatas" });
    expect(model.steps[1]?.detail).toContain("Jalan kaki");
    expect(model.summary.transfers).toBe("1 kali pindah");
    expect(model.summary.walking).toContain("420 m");
  });

  it("maps every ranking criterion to a factual Bahasa reason without internal fields", () => {
    const result = selectDirectRoute();
    const criteria = [
      "transfer-count",
      "decision-points",
      "walking-distance",
      "expected-duration",
      "evidence-rank",
      "route-id",
      "only-eligible",
    ] as const;

    for (const decidingCriterion of criteria) {
      const model = selectedModel({
        ...result,
        reason: {
          ...result.reason,
          decidingCriterion,
          tieBreakApplied: decidingCriterion === "route-id",
        },
      });

      expect(model.reason.headline.length).toBeGreaterThan(0);
      expect(model.reason.headline).not.toMatch(
        /transferCount|decisionPointCount|walkingDistanceMeters|route-id|route-1/i,
      );
    }
  });

  it("requires every verification gate before showing Terverifikasi", () => {
    const completeTransfer = selectTransferRoute();
    const verifiedPrimary: JourneyRoute = {
      ...completeTransfer.primary,
      accessEvidence: "Terverifikasi",
      evidenceRank: "complete",
      status: "routed",
      limitation: {
        ...completeTransfer.primary.limitation,
        access: "Terverifikasi",
      },
      lineage: {
        ...completeTransfer.primary.lineage,
        coverage: "complete",
        freshness: "current",
      },
      geometry: {
        ...completeTransfer.primary.geometry,
        state: "supported",
      },
      legs: completeTransfer.primary.legs.map((leg) =>
        leg.kind === "walking"
          ? { ...leg, evidenceState: "Terverifikasi" as const }
          : leg,
      ),
    };

    const verified = selectedModel(
      replacePrimary(completeTransfer, verifiedPrimary),
      {
        stopLabels: {
          origin: "Halte Asal",
          "hub-a": "Hub A",
          "hub-b": "Hub B",
          destination: "Halte Tujuan",
        },
      },
    );
    expect(verified.status.label).toBe("Terverifikasi");

    const failingGates: readonly [string, JourneyRoute][] = [
      [
        "aging",
        {
          ...verifiedPrimary,
          lineage: { ...verifiedPrimary.lineage, freshness: "aging" },
        },
      ],
      [
        "limited coverage",
        {
          ...verifiedPrimary,
          lineage: { ...verifiedPrimary.lineage, coverage: "limited" },
        },
      ],
      [
        "limited geometry",
        {
          ...verifiedPrimary,
          geometry: { ...verifiedPrimary.geometry, state: "limited" },
        },
      ],
      [
        "unknown access",
        {
          ...verifiedPrimary,
          accessEvidence: "Unknown",
          limitation: { ...verifiedPrimary.limitation, access: "Unknown" },
        },
      ],
      [
        "review access",
        {
          ...verifiedPrimary,
          accessEvidence: "Perlu dicek",
          limitation: { ...verifiedPrimary.limitation, access: "Perlu dicek" },
        },
      ],
      [
        "limited walking",
        {
          ...verifiedPrimary,
          legs: verifiedPrimary.legs.map((leg) =>
            leg.kind === "walking"
              ? { ...leg, evidenceState: "limited" as const }
              : leg,
          ),
        },
      ],
    ];

    for (const [label, primary] of failingGates) {
      const model = selectedModel(replacePrimary(completeTransfer, primary), {
        stopLabels: {
          origin: "Halte Asal",
          "hub-a": "Hub A",
          "hub-b": "Hub B",
          destination: "Halte Tujuan",
        },
      });
      expect(model.status.label, label).not.toBe("Terverifikasi");
      expect(["Data terbatas", "Perlu dicek"]).toContain(model.status.label);
    }
  });

  it("preserves interval semantics, after-midnight formatting, and fare limitation", () => {
    const result = selectDirectRoute();
    const intervalPrimary: JourneyRoute = {
      ...result.primary,
      timing: {
        semantics: "interval",
        start: parseGtfsTime("24:00:00"),
        end: parseGtfsTime("25:00:00"),
        headwaySeconds: 600,
        expectedDurationSeconds: 2_040,
      },
    };
    const model = selectedModel(replacePrimary(result, intervalPrimary), {
      fare: resolveFareStatus({
        amount: 3_500,
        currency: "IDR",
        source: "manual-tariff",
        basis: "single-trip",
        calculationComplete: false,
        approved: false,
      }),
    });

    expect(model.summary.timing).toMatchObject({
      label: "Tiap 10 mnt",
      detail: "Rentang layanan 00.00 (hari berikutnya)–01.00 (hari berikutnya)",
      isExact: false,
    });
    expect(model.summary.duration).toBe("Perkiraan 34 mnt");
    expect(model.summary.fare).toBe("Data terbatas");
    expect(model.summary.fare).not.toContain("3.500");
    expect(model.summary.departAt).not.toMatch(/tiba|arrive|deadline/i);
  });
});
