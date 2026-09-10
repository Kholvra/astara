import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";

import {
  createDefaultDepartAt,
  createTripPlanningInput,
  describeTimingFact,
  normalizeDepartAt,
  resolveFareStatus,
  type DepartAtDraft,
} from "./tripTiming";

const NOW: DepartAtDraft = {
  localDate: "2026-09-10",
  localTime: "12:15",
};

describe("depart-at timing contract", () => {
  it("creates a normalized local default from an injected clock", () => {
    const result = createDefaultDepartAt({
      timezone: "Asia/Jakarta",
      clock: () => new Date("2026-09-10T05:15:30.000Z"),
    });

    expect(result).toEqual({
      state: "valid",
      draft: NOW,
      input: {
        mode: "depart-at",
        localDate: "2026-09-10",
        localTime: "12:15",
        timezone: "Asia/Jakarta",
      },
    });
  });

  it("preserves a valid edited value and its service timezone", () => {
    const draft: DepartAtDraft = {
      localDate: "2026-09-11",
      localTime: "07:30",
    };

    const result = normalizeDepartAt({
      draft,
      timezone: "Asia/Jakarta",
      now: NOW,
    });

    expect(result).toMatchObject({
      state: "valid",
      draft,
      input: {
        mode: "depart-at",
        ...draft,
        timezone: "Asia/Jakarta",
      },
    });
    if (result.state === "valid") {
      expect(Object.keys(result.input).sort()).toEqual([
        "localDate",
        "localTime",
        "mode",
        "timezone",
      ]);
    }
  });

  it("returns an actionable invalid state without changing the draft", () => {
    const draft: DepartAtDraft = {
      localDate: "2026-02-30",
      localTime: "",
    };

    const result = normalizeDepartAt({
      draft,
      timezone: "Asia/Jakarta",
      now: NOW,
    });

    expect(result).toMatchObject({
      state: "invalid",
      draft,
      correction: "Pakai waktu sekarang",
    });
    expect("input" in result).toBe(false);
  });

  it("rejects a past value without silently shifting it", () => {
    const draft: DepartAtDraft = {
      localDate: "2026-09-10",
      localTime: "12:14",
    };

    const result = normalizeDepartAt({
      draft,
      timezone: "Asia/Jakarta",
      now: NOW,
    });

    expect(result).toMatchObject({
      state: "past",
      draft,
      correction: "Pakai waktu sekarang",
    });
  });

  it("returns choose-another-time for a prepared no-service result", () => {
    const draft: DepartAtDraft = {
      localDate: "2026-09-10",
      localTime: "14:00",
    };

    const result = normalizeDepartAt({
      draft,
      timezone: "Asia/Jakarta",
      now: NOW,
      serviceAvailability: "no-service",
    });

    expect(result).toMatchObject({
      state: "no-service",
      draft,
      correction: "Pilih waktu lain",
    });
    expect("input" in result).toBe(false);
  });

  it("fails closed when timezone or clock data is unavailable", () => {
    const timezoneFailure = createDefaultDepartAt({
      timezone: "Not/A-Timezone",
      clock: () => new Date("2026-09-10T05:15:30.000Z"),
    });
    const clockFailure = createDefaultDepartAt({
      timezone: "Asia/Jakarta",
      clock: () => new Date("not-a-date"),
    });

    expect(timezoneFailure).toMatchObject({
      state: "invalid",
      correction: "Pakai waktu sekarang",
    });
    expect(clockFailure).toMatchObject({
      state: "invalid",
      correction: "Pakai waktu sekarang",
    });
  });
});

describe("timing display semantics", () => {
  it("keeps after-midnight exact schedules on the service-day contract", () => {
    const departure = parseGtfsTime("25:10:00");
    const display = describeTimingFact({
      semantics: "exact",
      departure,
    });

    expect(display).toMatchObject({
      semantics: "exact",
      label: "Jadwal 01.10 (hari berikutnya)",
      isExact: true,
    });
    expect(departure.secondsSinceServiceDayStart).toBe(90_600);
  });

  it("labels interval frequency as a headway rather than an exact departure", () => {
    const display = describeTimingFact({
      semantics: "interval",
      start: parseGtfsTime("05:00:00"),
      end: parseGtfsTime("25:00:00"),
      headwaySeconds: 600,
    });

    expect(display).toMatchObject({
      semantics: "interval",
      label: "Tiap 10 mnt",
      isExact: false,
    });
    expect(display.detail).toContain("Rentang layanan");
    expect(display.label).not.toContain("Jadwal");
    expect(display).not.toHaveProperty("departure");
  });

  it("degrades malformed timing facts to an explicit limited state", () => {
    const invalidInterval = describeTimingFact({
      semantics: "interval",
      start: parseGtfsTime("05:00:00"),
      end: parseGtfsTime("25:00:00"),
      headwaySeconds: 0,
    });
    const estimate = describeTimingFact({
      semantics: "estimate",
      durationSeconds: 2_040,
    });
    const unavailable = describeTimingFact({
      semantics: "unavailable",
      status: "Perlu dicek",
    });

    expect(invalidInterval).toMatchObject({
      semantics: "unavailable",
      label: "Data terbatas",
      isExact: false,
    });
    expect(estimate).toMatchObject({
      semantics: "estimate",
      label: "Perkiraan durasi 34 mnt",
      isExact: false,
    });
    expect(unavailable).toMatchObject({
      semantics: "unavailable",
      label: "Perlu dicek",
      isExact: false,
    });
  });
});

describe("fare and planning-input contracts", () => {
  it("shows an amount only after the complete approved fare gates pass", () => {
    const complete = resolveFareStatus({
      amount: 3_500,
      currency: "IDR",
      source: "manual-tariff-2026",
      basis: "single-trip static fare",
      calculationComplete: true,
      approved: true,
    });
    const incomplete = resolveFareStatus({
      amount: 3_500,
      currency: "IDR",
      source: "manual-tariff-2026",
      calculationComplete: false,
      approved: false,
    });
    const review = resolveFareStatus({
      amount: 3_500,
      currency: "IDR",
      source: "manual-tariff-2026",
      calculationComplete: true,
      approved: false,
      limitation: "Perlu dicek",
    });

    expect(complete).toMatchObject({
      state: "estimate",
      label: "Perkiraan tarif",
      amount: 3_500,
      currency: "IDR",
      source: "manual-tariff-2026",
      basis: "single-trip static fare",
    });
    expect(complete.state).toBe("estimate");
    if (complete.state === "estimate") {
      expect(complete.displayAmount).toContain("3.500");
    }
    expect(incomplete).toMatchObject({
      state: "limited",
      label: "Data terbatas",
    });
    expect(review).toMatchObject({
      state: "limited",
      label: "Perlu dicek",
    });
    expect("amount" in incomplete).toBe(false);
    expect("amount" in review).toBe(false);
  });

  it("creates a fixed-policy input without preference or arrive-by fields", () => {
    const departAt = normalizeDepartAt({
      draft: { localDate: "2026-09-11", localTime: "07:30" },
      timezone: "Asia/Jakarta",
      now: NOW,
    });

    expect(departAt.state).toBe("valid");
    if (departAt.state !== "valid") {
      return;
    }

    const input = createTripPlanningInput({
      originId: "origin-stop",
      destinationId: "destination-stop",
      departAt: departAt.input,
    });

    expect(input).toEqual({
      originId: "origin-stop",
      destinationId: "destination-stop",
      departAt: departAt.input,
      scoringPolicy: "fixed-explainable-v1",
    });
    expect(Object.keys(input)).not.toContain("preference");
    expect(Object.keys(input)).not.toContain("arriveBy");
  });

  it("returns deterministic output for repeated fixed calls", () => {
    const first = {
      validation: normalizeDepartAt({
        draft: { localDate: "2026-09-11", localTime: "07:30" },
        timezone: "Asia/Jakarta",
        now: NOW,
      }),
      timing: describeTimingFact({
        semantics: "estimate",
        durationSeconds: 2_040,
      }),
      fare: resolveFareStatus({
        calculationComplete: false,
        approved: false,
      }),
    };
    const second = {
      validation: normalizeDepartAt({
        draft: { localDate: "2026-09-11", localTime: "07:30" },
        timezone: "Asia/Jakarta",
        now: NOW,
      }),
      timing: describeTimingFact({
        semantics: "estimate",
        durationSeconds: 2_040,
      }),
      fare: resolveFareStatus({
        calculationComplete: false,
        approved: false,
      }),
    };

    expect(first).toEqual(second);
  });
});
