import { describe, expect, it } from "vitest";

import { searchLocations } from "./searchAdapter";

describe("searchLocations", () => {
  it("returns matching local stops immediately for title and route queries", () => {
    expect(searchLocations("Monas")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stop-monas-ambiguous" }),
      ]),
    );
    expect(searchLocations("JAK-10")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stop-monas-barat" }),
      ]),
    );
  });

  it("returns no results for a blank query", () => {
    expect(searchLocations("   ")).toEqual([]);
  });
});
