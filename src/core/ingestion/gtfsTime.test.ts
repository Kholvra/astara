import { describe, expect, it } from "vitest";

import { GtfsTimeParseError, parseGtfsTime } from "./gtfsTime";

describe("parseGtfsTime", () => {
  it("preserves service-day times beyond midnight", () => {
    expect(parseGtfsTime("25:10:00")).toEqual({
      raw: "25:10:00",
      secondsSinceServiceDayStart: 90_600,
    });
  });

  it("accepts the exact end-of-day boundary", () => {
    expect(parseGtfsTime("24:00:00").secondsSinceServiceDayStart).toBe(86_400);
  });

  it("rejects invalid GTFS time syntax and ranges", () => {
    for (const value of [
      "12:00",
      "-01:00:00",
      "12:60:00",
      "12:00:60",
      " 05:00:00",
    ]) {
      expect(() => parseGtfsTime(value)).toThrowError(GtfsTimeParseError);
    }
  });
});
