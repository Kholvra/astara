import { describe, expect, it } from "vitest";

import { isGeoCoordinate } from "./geometry";

describe("isGeoCoordinate", () => {
  it("accepts a longitude-latitude pair within GeoJSON bounds", () => {
    expect(isGeoCoordinate([106.827, -6.175])).toBe(true);
  });

  it("rejects malformed or out-of-bounds coordinate values", () => {
    expect(isGeoCoordinate([106.827])).toBe(false);
    expect(isGeoCoordinate([106.827, -91])).toBe(false);
    expect(isGeoCoordinate([Number.NaN, -6.175])).toBe(false);
  });
});
