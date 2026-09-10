import { describe, expect, it } from "vitest";

import { selectPrimaryRoute } from "~/core/routing/routeEngine";
import type {
  JourneyRoute,
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

import {
  createRouteCardViewModel,
  type RouteCardInput,
} from "./routeCardModel";

const DIRECT_PLANNING = makePlanningInput("2026-09-11", "08:00");

function selectDirectRoute(): RouteSelectionSuccess {
  const result = selectPrimaryRoute({
    snapshot: makeSnapshot(),
    planning: DIRECT_PLANNING,
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
    planning: DIRECT_PLANNING,
    transferEdges: [makeTransferEdge()],
  });

  expect(result.state).toBe("selected");
  if (result.state !== "selected") {
    throw new Error("Expected a selected transfer route fixture");
  }
  return result;
}

function directInput(result: RouteSelectionResult): RouteCardInput {
  return {
    result,
    stopLabels: {
      origin: "Halte Asal",
      destination: "Halte Tujuan",
    },
    departAt: DIRECT_PLANNING.departAt,
  };
}

function replacePrimary(
  result: RouteSelectionSuccess,
  primary: JourneyRoute,
): RouteSelectionSuccess {
  return { ...result, primary };
}

describe("route-card recovery boundary", () => {
  it("maps every route failure to safe recovery copy and hides upstream messages", () => {
    const failures: readonly RouteSelectionFailure[] = [
      {
        state: "invalid-input",
        code: "INVALID_PLANNING_INPUT",
        message: "INTERNAL route-id=secret",
        recoveryAction: "stack trace / retry token",
      },
      {
        state: "unavailable",
        code: "NO_ACTIVE_SNAPSHOT",
        message: "INTERNAL snapshot path",
        recoveryAction: "retry internal endpoint",
      },
      {
        state: "unsupported",
        code: "UNSUPPORTED_NETWORK",
        message: "raw network details",
        recoveryAction: "use gtfs id",
      },
      {
        state: "no-route",
        code: "NO_ELIGIBLE_JOURNEY",
        message: "raw route-1 failure",
        recoveryAction: "choose stop origin",
      },
      {
        state: "limited-data",
        code: "SEARCH_EXHAUSTED",
        message: "search state bound 5000",
        recoveryAction: "increase maxSearchStates",
      },
    ];

    for (const failure of failures) {
      const model = createRouteCardViewModel(directInput(failure));
      expect(model.state).toBe("recovery");
      expect(model).not.toHaveProperty("steps");
      expect(JSON.stringify(model)).not.toMatch(
        /INTERNAL|secret|stack trace|route-1|gtfs id|maxSearchStates|NO_/i,
      );
    }

    const noRoute = failures.find((failure) => failure.state === "no-route");
    expect(noRoute).toBeDefined();
    if (!noRoute) {
      return;
    }
    expect(createRouteCardViewModel(directInput(noRoute))).toMatchObject({
      state: "recovery",
      title: "Tidak ada rute",
    });
  });

  it("fails closed for missing labels, empty legs, duplicate IDs, and no-edge walks", () => {
    const direct = selectDirectRoute();
    const missingLabels = createRouteCardViewModel({
      ...directInput(direct),
      stopLabels: {},
    });
    expect(missingLabels.state).toBe("selected");
    if (missingLabels.state !== "selected") {
      return;
    }
    expect(missingLabels.summary.origin).toBe("Halte belum tersedia");
    expect(missingLabels.status.label).toBe("Data terbatas");
    expect(
      JSON.stringify([
        missingLabels.summary.origin,
        missingLabels.summary.destination,
        ...missingLabels.steps.map((step) => `${step.title} ${step.detail}`),
      ]),
    ).not.toMatch(/\borigin\b|route-1/i);

    const emptyLegs = replacePrimary(direct, { ...direct.primary, legs: [] });
    expect(createRouteCardViewModel(directInput(emptyLegs))).toMatchObject({
      state: "recovery",
      title: "Perlu dicek",
    });

    const firstLeg = direct.primary.legs[0];
    if (!firstLeg) {
      throw new Error("Direct fixture must include a leg");
    }
    const duplicateLegs = replacePrimary(direct, {
      ...direct.primary,
      legs: [firstLeg, firstLeg],
    });
    expect(createRouteCardViewModel(directInput(duplicateLegs))).toMatchObject({
      state: "recovery",
      title: "Perlu dicek",
    });

    const transfer = selectTransferRoute();
    const invalidTransfer = replacePrimary(transfer, {
      ...transfer.primary,
      legs: transfer.primary.legs.map((leg) =>
        leg.kind === "walking"
          ? { ...leg, connectionState: "no-edge" as const }
          : leg,
      ),
    });
    const invalidModel = createRouteCardViewModel({
      result: invalidTransfer,
      stopLabels: {
        origin: "Halte Asal",
        "hub-a": "Hub A",
        "hub-b": "Hub B",
        destination: "Halte Tujuan",
      },
      departAt: DIRECT_PLANNING.departAt,
    });
    expect(invalidModel).toMatchObject({
      state: "recovery",
      title: "Perlu dicek",
    });
    expect(JSON.stringify(invalidModel)).not.toContain("Jalan kaki dari");
  });

  it("does not mutate caller-owned route and label inputs", () => {
    const result = selectTransferRoute();
    const input = {
      result,
      stopLabels: {
        origin: "Halte Asal",
        "hub-a": "Hub A",
        "hub-b": "Hub B",
        destination: "Halte Tujuan",
      },
      departAt: DIRECT_PLANNING.departAt,
    } satisfies RouteCardInput;
    const before = JSON.stringify(input);

    createRouteCardViewModel(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});
