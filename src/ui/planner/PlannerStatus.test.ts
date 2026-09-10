import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PLANNER_STATES,
  type PlannerStateSnapshot,
} from "~/core/planner/plannerTypes";
import { PlannerStatus } from "./PlannerStatus";

const base: PlannerStateSnapshot = {
  state: "error",
  origin: null,
  destination: null,
  departAt: null,
  catalog: null,
  route: null,
  operation: null,
  retryAvailable: true,
  mapRetryAvailable: false,
  detailOpen: false,
  mapReturnState: null,
  message: "Layanan sedang tidak tersedia.",
};

describe("PlannerStatus", () => {
  it.each(PLANNER_STATES)("renders the canonical %s state marker", (state) => {
    const html = renderToStaticMarkup(
      createElement(PlannerStatus, {
        snapshot: { ...base, state },
        onPrimaryAction: () => undefined,
        onReset: () => undefined,
      }),
    );

    expect(html).toContain(`data-planner-state="${state}"`);
    expect(html).toContain("STATUS PERJALANAN");
  });

  it("exposes a canonical state marker and safe retry action", () => {
    const html = renderToStaticMarkup(
      createElement(PlannerStatus, {
        snapshot: base,
        onPrimaryAction: () => undefined,
        onReset: () => undefined,
      }),
    );
    expect(html).toContain('data-planner-state="error"');
    expect(html).toContain("Layanan sedang tidak tersedia.");
    expect(html).toContain("Coba lagi");
    expect(html).toContain("Reset");
    expect(html).not.toContain("stack trace");
  });

  it("keeps a no-route state actionable without offering a retry", () => {
    const html = renderToStaticMarkup(
      createElement(PlannerStatus, {
        snapshot: { ...base, state: "no-route", retryAvailable: false },
        onPrimaryAction: () => undefined,
      }),
    );
    expect(html).toContain('data-planner-state="no-route"');
    expect(html).toContain("Ubah pilihan");
    expect(html).not.toContain("Coba lagi");
  });
});
