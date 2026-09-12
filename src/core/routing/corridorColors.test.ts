import { describe, expect, it } from "vitest";

import {
  CORRIDOR_HEX_COLORS,
  DEFAULT_FEEDER_HEX_COLOR,
  MIKROTRANS_HEX_COLOR,
  getCorridorHexColor,
} from "./corridorColors";

describe("corridorColors", () => {
  it("resolves primary BRT corridor colors correctly", () => {
    expect(getCorridorHexColor("1")).toBe(CORRIDOR_HEX_COLORS[1]);
    expect(getCorridorHexColor("6")).toBe(CORRIDOR_HEX_COLORS[6]);
    expect(getCorridorHexColor("13")).toBe(CORRIDOR_HEX_COLORS[13]);
  });

  it("resolves alphanumeric corridor variants like 6H and 1P to their parent corridor", () => {
    expect(getCorridorHexColor("6H")).toBe("#16a34a");
    expect(getCorridorHexColor("1P")).toBe("#e11d48");
    expect(getCorridorHexColor("8A")).toBe("#9333ea");
    expect(getCorridorHexColor("2A")).toBe("#2563eb");
  });

  it("resolves Mikrotrans routes to the official mikrotrans token", () => {
    expect(getCorridorHexColor("JAK-10")).toBe(MIKROTRANS_HEX_COLOR);
    expect(getCorridorHexColor("JAK10A")).toBe(MIKROTRANS_HEX_COLOR);
    expect(getCorridorHexColor("MIKRO-01")).toBe(MIKROTRANS_HEX_COLOR);
  });

  it("falls back to default feeder color for non-matching feeder names", () => {
    expect(getCorridorHexColor("S11")).toBe(DEFAULT_FEEDER_HEX_COLOR);
    expect(getCorridorHexColor("GR1")).toBe(DEFAULT_FEEDER_HEX_COLOR);
    expect(getCorridorHexColor("BW1")).toBe(DEFAULT_FEEDER_HEX_COLOR);
  });
});
