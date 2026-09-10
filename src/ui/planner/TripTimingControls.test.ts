import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TripTimingControls } from "./TripTimingControls";
import type { DepartAtValidation } from "~/core/timing/tripTiming";

const VALIDATION: DepartAtValidation = {
  state: "valid",
  draft: {
    localDate: "2026-09-11",
    localTime: "07:30",
  },
  input: {
    mode: "depart-at",
    localDate: "2026-09-11",
    localTime: "07:30",
    timezone: "Asia/Jakarta",
  },
};

function renderControl(validation: DepartAtValidation): string {
  return renderToStaticMarkup(
    createElement(TripTimingControls, {
      validation,
      serviceTimezone: "Asia/Jakarta",
      onValidationChange: () => undefined,
      onUseNow: () => undefined,
    }),
  );
}

describe("TripTimingControls markup contract", () => {
  it("shows one-column local depart-at controls without alternate modes", () => {
    const markup = renderControl(VALIDATION);

    expect(markup).toContain('type="date"');
    expect(markup).toContain('type="time"');
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("min-h-12");
    expect(markup).toContain("2026-09-11");
    expect(markup).toContain("07:30");
    expect(markup).toContain("Waktu lokal: Asia/Jakarta");
    expect(markup).not.toMatch(/arrive[- ]by|tiba|preferensi/i);
  });

  it("renders the no-service correction while preserving the selected draft", () => {
    const validation: DepartAtValidation = {
      state: "no-service",
      draft: {
        localDate: "2026-09-13",
        localTime: "02:00",
      },
      correction: "Pilih waktu lain",
      message: "Tidak ada layanan yang didukung pada waktu ini.",
    };

    const markup = renderControl(validation);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Tidak ada layanan yang didukung pada waktu ini.");
    expect(markup).toContain("Pilih waktu lain");
    expect(markup).toContain("2026-09-13");
    expect(markup).toContain("02:00");
  });
});
