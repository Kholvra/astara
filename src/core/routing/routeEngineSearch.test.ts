import { describe, expect, it } from "vitest";

import { parseGtfsTime } from "~/core/ingestion/gtfsTime";

import { selectPrimaryRoute } from "./routeEngine";
import { createRouteEngineIndex } from "./routeEngineSupport";
import { findTripRideOptions } from "./routeEngineRides";
import {
  makePlanningInput,
  makeSnapshot,
  makeTransferEdge,
  makeTransferSnapshot,
} from "./routeEngineTestFixtures";

describe("RAPTOR route search", () => {
  it("indexes each route once at a stop for route-based round scans", () => {
    const snapshot = makeSnapshot({
      stopTimes: [
        {
          ...makeSnapshot().stopTimes[0]!,
          stopId: "origin",
          stopSequence: 1,
        },
        {
          ...makeSnapshot().stopTimes[0]!,
          stopId: "origin",
          stopSequence: 2,
        },
        makeSnapshot().stopTimes[1]!,
      ],
    });

    const index = createRouteEngineIndex(snapshot);

    expect(index.routeIdsByStopId.get("origin")).toEqual(["route-1"]);
  });

  it("skips a previously used trip before selecting a compatible ride", () => {
    const base = makeSnapshot();
    const baseTrip = base.trips[0];
    if (!baseTrip) {
      throw new Error("Ride fixture requires a base trip");
    }
    const alternativeTrip = {
      ...baseTrip,
      id: "trip-2",
      serviceId: "service-2",
      lineage: { ...baseTrip.lineage, rowNumber: 2 },
    };
    const alternativeStopTimes = base.stopTimes.map((stopTime) => ({
      ...stopTime,
      tripId: alternativeTrip.id,
      lineage: {
        ...stopTime.lineage,
        rowNumber: stopTime.lineage.rowNumber + 10,
      },
    }));
    const index = createRouteEngineIndex({
      ...base,
      trips: [...base.trips, alternativeTrip],
      stopTimes: [...base.stopTimes, ...alternativeStopTimes],
    });

    const rides = findTripRideOptions({
      index,
      stopId: "origin",
      targetStopIds: new Set(["destination"]),
      supportedRouteTypes: [3],
      requestedDate: "2026-09-11",
      requestedTime: "08:00",
      readyAtSeconds: 8 * 60 * 60,
      activeServiceIdsByDate: new Map([
        ["2026-09-11", new Set(["service-1", "service-2"])],
      ]),
      excludedTripIds: new Set(["trip-1"]),
    });

    expect(rides.map((ride) => ride.trip.id)).toEqual(["trip-2"]);
  });

  it("evaluates every direct route before choosing the fastest eligible one", () => {
    const base = makeSnapshot();
    const baseRoute = base.routes[0];
    const baseTrip = base.trips[0];
    if (!baseRoute || !baseTrip) {
      throw new Error("Direct-route fixture requires a base route and trip");
    }
    const fasterRoute = {
      ...baseRoute,
      id: "route-2",
      shortName: "2",
      lineage: { ...baseRoute.lineage, rowNumber: 2 },
    };
    const fasterTrip = {
      ...baseTrip,
      id: "trip-2",
      routeId: fasterRoute.id,
      shapeId: "shape-2",
      lineage: { ...baseTrip.lineage, rowNumber: 2 },
    };
    const fasterStopTimes = base.stopTimes.map((stopTime, index) => ({
      ...stopTime,
      tripId: fasterTrip.id,
      arrivalTime: parseGtfsTime(index === 0 ? "08:01:00" : "08:10:00"),
      departureTime: parseGtfsTime(index === 0 ? "08:01:00" : "08:10:00"),
      lineage: { ...stopTime.lineage, rowNumber: index + 10 },
    }));
    const fasterShapes = base.shapes.map((shape) => ({
      ...shape,
      shapeId: fasterTrip.shapeId,
      lineage: { ...shape.lineage, rowNumber: shape.lineage.rowNumber + 10 },
    }));

    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        routes: [...base.routes, fasterRoute],
        trips: [...base.trips, fasterTrip],
        stopTimes: [...base.stopTimes, ...fasterStopTimes],
        shapes: [...base.shapes, ...fasterShapes],
      },
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.routeId).toContain("route-2:trip-2");
    expect(result.primary.timing).toMatchObject({
      semantics: "exact",
      arrival: { raw: "08:10:00" },
    });
  });

  it("succeeds at the exact route-scan budget boundary", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { maxSearchStates: 2 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "walking",
      "transit",
    ]);
  });

  it("does not rank a destination label when a later route scan exhausts", () => {
    const base = makeTransferSnapshot();
    const routeThree = {
      ...base.routes[1]!,
      id: "route-3",
      shortName: "3",
      lineage: { ...base.routes[1]!.lineage, rowNumber: 4 },
    };
    const branchStop = {
      ...base.stops[base.stops.length - 1]!,
      id: "hub-c",
      name: "Hub C",
      coordinate: [106.807, -6.193] as [number, number],
      lineage: { ...base.stops[base.stops.length - 1]!.lineage, rowNumber: 6 },
    };
    const branchTrip = {
      ...base.trips[1]!,
      id: "trip-3",
      routeId: routeThree.id,
      serviceId: "service-3",
      shapeId: "shape-3",
      lineage: { ...base.trips[1]!.lineage, rowNumber: 4 },
    };
    const branchStopTime = {
      ...base.stopTimes[2]!,
      tripId: branchTrip.id,
      stopId: branchStop.id,
      stopSequence: 1,
      lineage: { ...base.stopTimes[2]!.lineage, rowNumber: 6 },
    };
    const branchDestinationTime = {
      ...base.stopTimes[3]!,
      tripId: branchTrip.id,
      stopId: "destination",
      stopSequence: 2,
      lineage: { ...base.stopTimes[3]!.lineage, rowNumber: 7 },
    };
    const laterBranch = makeTransferEdge({
      edgeId: "edge-z",
      to: { stopId: branchStop.id, transitServiceId: routeThree.id },
    });
    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        routes: [...base.routes, routeThree],
        stops: [...base.stops, branchStop],
        trips: [...base.trips, branchTrip],
        stopTimes: [...base.stopTimes, branchStopTime, branchDestinationTime],
        calendars: [
          ...base.calendars,
          { ...base.calendars[1]!, serviceId: branchTrip.serviceId },
        ],
      },
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge(), laterBranch],
      config: { maxSearchStates: 2 },
    });

    expect(result).toMatchObject({
      state: "limited-data",
      code: "SEARCH_EXHAUSTED",
    });
    expect(result).not.toHaveProperty("primary");
    expect(result).not.toHaveProperty("candidates");
  });

  it("succeeds at the exact ride-label budget boundary for a direct route", () => {
    const result = selectPrimaryRoute({
      snapshot: makeSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
      config: { maxLabelExpansions: 1 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.routeId).toContain("route-1:trip-1");
  });

  it("fails closed when ride-label expansion reaches its safety budget", () => {
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { maxLabelExpansions: 1 },
    });

    expect(result).toMatchObject({
      state: "limited-data",
      code: "SEARCH_EXHAUSTED",
    });
    expect(result).not.toHaveProperty("primary");
  });

  it("prioritizes a direct journey over lower-priority transfer branches", () => {
    const base = makeTransferSnapshot();
    const baseRoute = base.routes[0];
    const baseTrip = base.trips[0];
    if (!baseRoute || !baseTrip) {
      throw new Error("Branching fixture requires a base route and trip");
    }
    const directRoute = {
      ...baseRoute,
      id: "route-0",
      shortName: "0",
      lineage: { ...baseRoute.lineage, rowNumber: 0 },
    };
    const directTrip = {
      ...baseTrip,
      id: "trip-0",
      routeId: directRoute.id,
      serviceId: "service-0",
      shapeId: "shape-0",
      lineage: { ...baseTrip.lineage, rowNumber: 0 },
    };
    const directStopTimes = [
      {
        ...base.stopTimes[0]!,
        tripId: directTrip.id,
        stopId: "origin",
        stopSequence: 1,
        departureTime: parseGtfsTime("08:01:00"),
        arrivalTime: parseGtfsTime("08:01:00"),
        lineage: { ...base.stopTimes[0]!.lineage, rowNumber: 0 },
      },
      {
        ...base.stopTimes[1]!,
        tripId: directTrip.id,
        stopId: "destination",
        stopSequence: 2,
        departureTime: parseGtfsTime("08:05:00"),
        arrivalTime: parseGtfsTime("08:05:00"),
        lineage: { ...base.stopTimes[1]!.lineage, rowNumber: 0 },
      },
    ];
    const branchingSnapshot = {
      ...base,
      routes: [directRoute, ...base.routes],
      trips: [directTrip, ...base.trips],
      stopTimes: [...directStopTimes, ...base.stopTimes],
      calendars: [
        {
          ...base.calendars[0]!,
          serviceId: directTrip.serviceId,
          lineage: { ...base.calendars[0]!.lineage, rowNumber: 0 },
        },
        ...base.calendars,
      ],
      shapes: [
        {
          ...base.shapes[0]!,
          shapeId: directTrip.shapeId,
          lineage: { ...base.shapes[0]!.lineage, rowNumber: 0 },
        },
        ...base.shapes,
      ],
    };

    const result = selectPrimaryRoute({
      snapshot: branchingSnapshot,
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { maxLabelExpansions: 1 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.routeId).toContain("route-0:trip-0");
  });

  it("prioritizes a destination-serving route at a dense generic transfer", () => {
    const base = makeTransferSnapshot();
    const route = base.routes[1];
    const trip = base.trips[1];
    const hubB = base.stops.find((stop) => stop.id === "hub-b");
    const hubBStopTime = base.stopTimes.find(
      (stopTime) => stopTime.tripId === trip?.id && stopTime.stopId === "hub-b",
    );
    const destinationStopTime = base.stopTimes.find(
      (stopTime) =>
        stopTime.tripId === trip?.id && stopTime.stopId === "destination",
    );
    if (!route || !trip || !hubB || !hubBStopTime || !destinationStopTime) {
      throw new Error("Dense transfer fixture requires the second route");
    }

    const branchStops = Array.from({ length: 3 }, (_, index) => ({
      ...hubB,
      id: `branch-destination-${index}`,
      name: `Branch destination ${index}`,
      coordinate: [106.807 + index / 10_000, -6.193] as [number, number],
      lineage: { ...hubB.lineage, rowNumber: 30 + index },
    }));
    const branchRoutes = branchStops.map((stop, index) => ({
      ...route,
      id: `route-0${index}`,
      shortName: `0${index}`,
      lineage: { ...route.lineage, rowNumber: 30 + index },
    }));
    const branchTrips = branchRoutes.map((branchRoute, index) => ({
      ...trip,
      id: `trip-branch-${index}`,
      routeId: branchRoute.id,
      serviceId: `service-branch-${index}`,
      shapeId: undefined,
      lineage: { ...trip.lineage, rowNumber: 30 + index },
    }));
    const branchStopTimes = branchTrips.flatMap((branchTrip, index) => [
      {
        ...hubBStopTime,
        tripId: branchTrip.id,
        stopSequence: 1,
        lineage: { ...hubBStopTime.lineage, rowNumber: 30 + index },
      },
      {
        ...destinationStopTime,
        tripId: branchTrip.id,
        stopId: branchStops[index]?.id ?? "missing-branch-stop",
        stopSequence: 2,
        lineage: { ...destinationStopTime.lineage, rowNumber: 40 + index },
      },
    ]);
    const branchCalendars = branchTrips.map((branchTrip, index) => ({
      ...base.calendars[1]!,
      serviceId: branchTrip.serviceId,
      lineage: { ...base.calendars[1]!.lineage, rowNumber: 30 + index },
    }));

    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        routes: [...base.routes, ...branchRoutes],
        stops: [...base.stops, ...branchStops],
        trips: [...base.trips, ...branchTrips],
        stopTimes: [...base.stopTimes, ...branchStopTimes],
        calendars: [...base.calendars, ...branchCalendars],
      },
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge({ to: { stopId: "hub-b" } })],
      config: { maxSearchStates: 2 },
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.routeId).toContain("route-2:trip-2");
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "walking",
      "transit",
    ]);
  });

  it("switches services at the same GTFS stop without inventing a walking leg", () => {
    const base = makeTransferSnapshot();
    const routeTwo = base.routes[1];
    const tripTwo = base.trips[1];
    if (!routeTwo || !tripTwo) {
      throw new Error("Same-stop transfer fixture requires the second route");
    }

    const sharedStopTimes = base.stopTimes.map((stopTime) =>
      stopTime.tripId === tripTwo.id && stopTime.stopId === "hub-b"
        ? { ...stopTime, stopId: "hub-a" }
        : stopTime,
    );
    const result = selectPrimaryRoute({
      snapshot: { ...base, stopTimes: sharedStopTimes },
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "transit",
    ]);
    expect(
      result.primary.legs
        .filter((leg) => leg.kind === "transit")
        .map((leg) => leg.routeId),
    ).toEqual(["route-1", "route-2"]);
    expect(result.primary.transferCount).toBe(1);
  });

  it("keeps a later physical transfer after the correct service-switch leg", () => {
    const base = makeTransferSnapshot();
    const routeTwo = base.routes[1];
    const tripTwo = base.trips[1];
    const destination = base.stops.find((stop) => stop.id === "destination");
    if (!routeTwo || !tripTwo || !destination) {
      throw new Error("Service-switch fixture requires the second route");
    }

    const finalDestination = {
      ...destination,
      id: "destination-parent",
      name: "Destination parent",
      coordinate: [106.811, -6.189] as [number, number],
      lineage: { ...destination.lineage, rowNumber: 8 },
    };
    const sharedStopTimes = base.stopTimes.map((stopTime) =>
      stopTime.tripId === tripTwo.id && stopTime.stopId === "hub-b"
        ? { ...stopTime, stopId: "hub-a" }
        : stopTime,
    );
    const result = selectPrimaryRoute({
      snapshot: {
        ...base,
        stops: [...base.stops, finalDestination],
        stopTimes: sharedStopTimes,
      },
      planning: {
        ...makePlanningInput("2026-09-11", "08:00"),
        destinationId: finalDestination.id,
      },
      transferEdges: [
        makeTransferEdge({
          edgeId: "edge-final",
          from: { stopId: destination.id },
          to: { stopId: finalDestination.id },
        }),
      ],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }
    expect(result.primary.legs.map((leg) => leg.kind)).toEqual([
      "transit",
      "transit",
      "walking",
    ]);
    expect(result.primary.legs[2]).toMatchObject({
      kind: "walking",
      edgeId: "edge-final",
      fromStopId: destination.id,
      toStopId: finalDestination.id,
    });
  });

  it("honors an injected synchronous deadline inside route scanning", () => {
    let nowMs = 0;
    const result = selectPrimaryRoute({
      snapshot: makeTransferSnapshot(),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
      config: { maxSearchDurationMs: 5 },
      searchClock: () => {
        const current = nowMs;
        nowMs += 2;
        return current;
      },
    });

    expect(result).toMatchObject({
      state: "limited-data",
      code: "SEARCH_EXHAUSTED",
    });
    expect(result).not.toHaveProperty("primary");
  });

  it("keeps route output deterministic when snapshot collections are reordered", () => {
    const snapshot = makeTransferSnapshot();
    const reorderedSnapshot = {
      ...snapshot,
      routes: [...snapshot.routes].reverse(),
      stops: [...snapshot.stops].reverse(),
      trips: [...snapshot.trips].reverse(),
      stopTimes: [...snapshot.stopTimes].reverse(),
      calendars: [...snapshot.calendars].reverse(),
      frequencies: [...snapshot.frequencies].reverse(),
      shapes: [...snapshot.shapes].reverse(),
    };
    const request = {
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [makeTransferEdge()],
    };

    const original = selectPrimaryRoute({ snapshot, ...request });
    const reordered = selectPrimaryRoute({
      snapshot: reorderedSnapshot,
      ...request,
    });

    expect(reordered).toEqual(original);
  });
});
