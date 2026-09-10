import { describe, expect, it } from "vitest";

import { MOCK_SEARCH_ITEMS } from "~/core/search/mockSearchData";
import { resolveSearchSelection } from "./searchSelectionController";

describe("resolveSearchSelection", () => {
  it("does not emit a location before platform confirmation", () => {
    const parent = MOCK_SEARCH_ITEMS[0]!;
    const pending = resolveSearchSelection({
      type: "select_result",
      item: parent,
    });

    expect(pending).toEqual({ state: "platform_confirmation", item: parent });
    expect(pending.state).not.toBe("selected");
  });

  it("hands the exact selected platform identity, code, and coordinates to the page boundary", () => {
    const parent = MOCK_SEARCH_ITEMS[0]!;
    const selected = resolveSearchSelection({
      type: "select_platform",
      item: parent,
      platformId: "stop-monas-plat-1",
    });

    expect(selected).toMatchObject({
      state: "selected",
      location: {
        id: "stop-monas-plat-1",
        platformCode: "monas-kota",
        coordinates: [106.8271, -6.1753],
      },
    });
  });

  it("keeps place results pending until their approved local stop is confirmed", () => {
    const place = MOCK_SEARCH_ITEMS.find((item) => item.id === "poi-monas")!;
    const pending = resolveSearchSelection({
      type: "select_result",
      item: place,
    });
    const selected = resolveSearchSelection({
      type: "confirm_place_conversion",
      item: place,
      stopId: "stop-monas-barat",
    });

    expect(pending.state).toBe("place_conversion_required");
    expect(selected).toMatchObject({
      state: "selected",
      location: {
        id: "stop-monas-barat",
        convertedFromId: "poi-monas",
      },
    });
  });

  it("keeps low-confidence results pending until explicit confirmation", () => {
    const item = MOCK_SEARCH_ITEMS.find(
      (entry) => entry.id === "stop-senayan-lama",
    )!;
    const pending = resolveSearchSelection({ type: "select_result", item });
    const selected = resolveSearchSelection({
      type: "confirm_low_confidence",
      item,
    });

    expect(pending.state).toBe("low_confidence_confirmation");
    expect(selected).toMatchObject({
      state: "selected",
      location: { id: "stop-senayan-lama" },
    });
  });
});
