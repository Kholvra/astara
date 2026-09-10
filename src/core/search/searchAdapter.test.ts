import { describe, expect, it } from "vitest";

import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import { assignSearchEndpoint } from "./searchEndpoints";
import {
  calculateDistanceMeters,
  MAX_CURRENT_LOCATION_ACCURACY_METERS,
  resolveCurrentLocation,
  resolveSearchResult,
} from "./searchResolution";
import {
  MAX_QUERY_LENGTH,
  resolveSearchQuery,
  searchLocations,
} from "./searchAdapter";
import {
  type RoutableLocation,
  type SearchEndpointState,
  type SearchResultItem,
} from "./search.types";

const lowConfidenceItem = MOCK_SEARCH_ITEMS.find(
  (item) => item.id === "stop-senayan-lama",
);

const makeStop = (
  id: string,
  coordinates: readonly [number, number],
): SearchResultItem => ({
  id,
  title: id,
  type: "stop_or_route",
  coordinates,
  source: "gtfs_local",
  verification: "Data terbatas",
  confidence: "high",
});

describe("searchLocations", () => {
  it("ranks exact local identity before alias, route, and text matches", () => {
    const results = searchLocations("Halte Monas");

    expect(results[0]).toEqual(
      expect.objectContaining({
        id: "stop-monas-ambiguous",
        source: "gtfs_local",
        matchKind: "title_exact",
      }),
    );
    expect(searchLocations("Monas").map((result) => result.id)).toContain(
      "poi-monas",
    );
    expect(searchLocations("monumen nasional")[0]).toEqual(
      expect.objectContaining({ id: "stop-monas-ambiguous" }),
    );
    expect(searchLocations("10H")[0]).toEqual(
      expect.objectContaining({
        id: "stop-blok-m",
        matchKind: "route_exact",
      }),
    );
  });

  it("keeps stable ordering and does not mutate the catalog across repeated calls", () => {
    const before = JSON.stringify(MOCK_SEARCH_ITEMS);
    const first = searchLocations("halte").map((result) => result.id);
    const second = searchLocations("halte").map((result) => result.id);

    expect(second).toEqual(first);
    expect(JSON.stringify(MOCK_SEARCH_ITEMS)).toBe(before);
  });

  it("returns no results for a blank query and bounds long input", () => {
    expect(searchLocations("   ")).toEqual([]);

    const query = "x".repeat(MAX_QUERY_LENGTH + 20);
    expect(resolveSearchQuery(query)).toMatchObject({
      state: "no_result",
      query: query.slice(0, MAX_QUERY_LENGTH),
    });

    const emojiQuery = "🙂".repeat(MAX_QUERY_LENGTH + 1);
    expect(resolveSearchQuery(emojiQuery)).toMatchObject({
      state: "no_result",
      query: "🙂".repeat(MAX_QUERY_LENGTH),
    });
  });
});

describe("resolveSearchQuery", () => {
  it("preserves a no-result query and offers bounded selectable local alternatives", () => {
    const outcome = resolveSearchQuery("tidak ada halte seperti ini");

    expect(outcome).toMatchObject({
      state: "no_result",
      query: "tidak ada halte seperti ini",
    });
    if (outcome.state !== "no_result") return;

    expect(outcome.alternatives.length).toBeLessThanOrEqual(3);
    expect(
      outcome.alternatives.every((item) => item.type === "stop_or_route"),
    ).toBe(true);
  });

  it("keeps index-unavailable recovery separate from an empty result", () => {
    const outcome = resolveSearchQuery("Monas", {
      available: false,
      items: MOCK_SEARCH_ITEMS,
      fallbackItems: [MOCK_SEARCH_ITEMS[1]!],
    });

    expect(outcome).toEqual({
      state: "index_unavailable",
      query: "Monas",
      alternatives: [MOCK_SEARCH_ITEMS[1]],
    });
  });
});

describe("resolveSearchResult", () => {
  it("requires an explicit platform and preserves its identity and coordinates", () => {
    const parent = MOCK_SEARCH_ITEMS[0]!;
    const pending = resolveSearchResult(parent);

    expect(pending).toEqual({ state: "platform_confirmation", item: parent });

    const selected = resolveSearchResult(parent, {
      platformId: "stop-monas-plat-2",
    });

    expect(selected).toMatchObject({
      state: "selected",
      location: {
        id: "stop-monas-plat-2",
        platformCode: "monas-blok-m",
        coordinates: [106.8273, -6.1755],
      },
    });
    expect(
      resolveSearchResult(parent, { platformId: "not-a-platform" }),
    ).toEqual(expect.objectContaining({ state: "not_routable" }));
  });

  it("requires explicit conversion before a place can become a stop", () => {
    const place = MOCK_SEARCH_ITEMS.find((item) => item.id === "poi-monas")!;

    expect(resolveSearchResult(place)).toMatchObject({
      state: "place_conversion_required",
      suggestedStop: { id: "stop-monas-barat" },
    });

    expect(
      resolveSearchResult(place, { conversionStopId: "stop-monas-barat" }),
    ).toMatchObject({
      state: "selected",
      location: {
        id: "stop-monas-barat",
        convertedFromId: "poi-monas",
      },
    });
  });

  it("requires confirmation for low-confidence results and rejects malformed identity or coordinates", () => {
    expect(lowConfidenceItem).toBeDefined();
    if (!lowConfidenceItem) return;

    expect(resolveSearchResult(lowConfidenceItem)).toEqual(
      expect.objectContaining({
        state: "low_confidence_confirmation",
        item: lowConfidenceItem,
      }),
    );
    expect(
      resolveSearchResult(lowConfidenceItem, { confirmLowConfidence: true }),
    ).toEqual(expect.objectContaining({ state: "selected" }));

    expect(
      resolveSearchResult({
        id: "",
        title: "Rusak",
        type: "stop_or_route",
        coordinates: [999, 999],
      }),
    ).toEqual(expect.objectContaining({ state: "not_routable" }));
  });
});

describe("resolveCurrentLocation", () => {
  it("uses supported walking evidence before straight-line distance", () => {
    const first = makeStop("stop-a", [106.8001, -6.2]);
    const second = makeStop("stop-b", [106.801, -6.2]);
    const outcome = resolveCurrentLocation(
      { coordinates: [106.8, -6.2], accuracyMeters: 10 },
      [first, second],
      {
        walkingDistanceMetersByStopId: {
          "stop-a": 500,
          "stop-b": 100,
        },
      },
    );

    expect(outcome).toMatchObject({
      state: "selected",
      location: {
        id: "stop-b",
        source: "session_gps",
        distanceBasis: "walking_evidence",
      },
      distanceMeters: 100,
      distanceBasis: "walking_evidence",
    });
  });

  it("uses a labeled straight-line fallback and deterministic ties when walking evidence is absent", () => {
    const first = makeStop("stop-a", [106.8, -6.2]);
    const second = makeStop("stop-b", [106.8, -6.2]);
    const outcome = resolveCurrentLocation(
      { coordinates: [106.8, -6.2], accuracyMeters: 10 },
      [second, first],
    );

    expect(outcome).toMatchObject({
      state: "selected",
      location: {
        id: "stop-a",
        source: "session_gps",
        distanceBasis: "straight_line_only",
      },
      distanceMeters: 0,
      distanceBasis: "straight_line_only",
    });
    if (outcome.state === "selected") {
      expect("rawCoordinates" in outcome).toBe(false);
    }
  });

  it("accepts the accuracy threshold exactly, rejects imprecise/invalid readings, and enforces the radius", () => {
    const stop = makeStop("stop-nearby", [106.8, -6.2]);
    const reading = [106.80001, -6.2] as const;
    const exactAccuracy = resolveCurrentLocation(
      {
        coordinates: reading,
        accuracyMeters: MAX_CURRENT_LOCATION_ACCURACY_METERS,
      },
      [stop],
    );
    const imprecise = resolveCurrentLocation(
      {
        coordinates: reading,
        accuracyMeters: MAX_CURRENT_LOCATION_ACCURACY_METERS + 0.01,
      },
      [stop],
    );
    const invalid = resolveCurrentLocation(
      { coordinates: reading, accuracyMeters: -1 },
      [stop],
    );
    const distance = calculateDistanceMeters(reading, stop.coordinates);
    const exactRadius = resolveCurrentLocation(
      { coordinates: reading, accuracyMeters: 1 },
      [stop],
      { maxDistanceMeters: distance },
    );
    const outsideRadius = resolveCurrentLocation(
      { coordinates: reading, accuracyMeters: 1 },
      [stop],
      { maxDistanceMeters: Math.max(0, distance - 0.01) },
    );

    expect(exactAccuracy.state).toBe("selected");
    expect(imprecise.state).toBe("imprecise");
    expect(invalid.state).toBe("invalid");
    expect(exactRadius.state).toBe("selected");
    expect(outsideRadius.state).toBe("no_nearby_stop");
  });

  it("does not automatically choose an ambiguous platform", () => {
    const outcome = resolveCurrentLocation(
      { coordinates: [106.8272, -6.1754], accuracyMeters: 10 },
      MOCK_SEARCH_ITEMS,
    );

    if (outcome.state === "selected") {
      expect(outcome.location.id).not.toBe("stop-monas-ambiguous");
    }
  });

  it("does not automatically choose a low-confidence stop", () => {
    const outcome = resolveCurrentLocation(
      { coordinates: [106.802, -6.214], accuracyMeters: 10 },
      lowConfidenceItem ? [lowConfidenceItem] : [],
    );

    expect(outcome.state).toBe("no_nearby_stop");
  });
});

describe("endpoint ownership", () => {
  const origin: RoutableLocation = {
    id: "origin",
    name: "Origin",
    type: "stop_or_route",
    coordinates: [106.8, -6.2],
    source: "gtfs_local",
    confidence: "high",
    verification: "Data terbatas",
  };
  const destination: RoutableLocation = {
    ...origin,
    id: "destination",
    name: "Destination",
  };

  it("preserves the inactive endpoint in both assignment orders", () => {
    const empty: SearchEndpointState = { origin: null, destination: null };
    const originFirst = assignSearchEndpoint(
      assignSearchEndpoint(empty, "origin", origin),
      "destination",
      destination,
    );
    const destinationFirst = assignSearchEndpoint(
      assignSearchEndpoint(empty, "destination", destination),
      "origin",
      origin,
    );

    expect(originFirst).toEqual({ origin, destination });
    expect(destinationFirst).toEqual({ origin, destination });
    expect(assignSearchEndpoint(originFirst, "origin", destination)).toEqual({
      origin: destination,
      destination,
    });
  });
});
