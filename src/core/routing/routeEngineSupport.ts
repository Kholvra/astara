import { getActiveServiceIds } from "~/core/ingestion/gtfsCalendar";
import type {
  GtfsFrequency,
  GtfsRoute,
  GtfsSnapshot,
  GtfsStopTime,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";
import type { TransferEdge } from "~/core/transfer/transferTypes";

import {
  DEFAULT_CANDIDATE_CONFIGURATION_HASH,
  DEFAULT_MAX_SEARCH_STATES,
  DEFAULT_MAX_TRANSFERS,
  DEFAULT_ROUTE_RULES_VERSION,
  DEFAULT_SUPPORTED_ROUTE_TYPES,
  type RouteEngineConfig,
  type RouteEngineIndex,
  type RouteLineage,
  type RouteSelectionErrorCode,
  type RouteSelectionFailure,
} from "./routingTypes";
import { findNextTripRide, type ScheduledTripRide } from "./routeSchedule";

export type ResolvedRouteEngineConfig = Readonly<{
  supportedRouteTypes: readonly number[];
  maxTransfers: number;
  maxSearchStates: number;
  routeRulesVersion: string;
  candidateConfigurationHash: string;
  freshness: NonNullable<RouteEngineConfig["freshness"]>;
  staticDemoNote?: string;
}>;

export type RouteConfigValidation =
  | Readonly<{ state: "valid"; config: ResolvedRouteEngineConfig }>
  | Readonly<{ state: "invalid"; failure: RouteSelectionFailure }>;

export type TripRideOption = Readonly<{
  trip: GtfsTrip;
  route: GtfsRoute;
  serviceDate: string;
  fromStopIndex: number;
  toStopIndex: number;
  fromStopTime: GtfsStopTime;
  toStopTime: GtfsStopTime;
  stopTimes: readonly GtfsStopTime[];
  scheduled: ScheduledTripRide;
}>;

export type TripRideSearchOptions = Readonly<{
  index: RouteEngineIndex;
  stopId: string;
  targetStopIds: ReadonlySet<string>;
  supportedRouteTypes: readonly number[];
  requestedDate: string;
  requestedTime: string;
  readyAtSeconds: number;
  requiredRouteId?: string;
  activeServiceIdsByDate: ReadonlyMap<string, ReadonlySet<string>>;
}>;

export function normalizeRouteEngineConfig(
  input: RouteEngineConfig | undefined,
): RouteConfigValidation {
  const supportedRouteTypes = input?.supportedRouteTypes
    ? [...input.supportedRouteTypes]
    : [...DEFAULT_SUPPORTED_ROUTE_TYPES];
  const maxTransfers = input?.maxTransfers ?? DEFAULT_MAX_TRANSFERS;
  const maxSearchStates = input?.maxSearchStates ?? DEFAULT_MAX_SEARCH_STATES;
  const routeRulesVersion =
    input?.routeRulesVersion?.trim() ?? DEFAULT_ROUTE_RULES_VERSION;
  const candidateConfigurationHash =
    input?.candidateConfigurationHash?.trim() ??
    DEFAULT_CANDIDATE_CONFIGURATION_HASH;

  if (
    supportedRouteTypes.length === 0 ||
    supportedRouteTypes.some(
      (routeType) => !Number.isInteger(routeType) || routeType < 0,
    ) ||
    !Number.isInteger(maxTransfers) ||
    maxTransfers < 0 ||
    maxTransfers > 10 ||
    !Number.isInteger(maxSearchStates) ||
    maxSearchStates < 1 ||
    maxSearchStates > 100_000 ||
    !routeRulesVersion ||
    !candidateConfigurationHash
  ) {
    return {
      state: "invalid",
      failure: createFailure(
        "INVALID_PLANNING_INPUT",
        "Route-engine configuration is incomplete or outside supported bounds.",
        "Use the fixed route policy and a supported search configuration.",
      ),
    };
  }

  return {
    state: "valid",
    config: {
      supportedRouteTypes,
      maxTransfers,
      maxSearchStates,
      routeRulesVersion,
      candidateConfigurationHash,
      freshness: input?.freshness ?? "unknown",
      ...(input?.staticDemoNote
        ? { staticDemoNote: input.staticDemoNote }
        : {}),
    },
  };
}

export function createRouteEngineIndex(
  snapshot: GtfsSnapshot,
): RouteEngineIndex {
  const stopTimesByTrip = new Map<string, GtfsStopTime[]>();
  for (const stopTime of snapshot.stopTimes) {
    const current = stopTimesByTrip.get(stopTime.tripId) ?? [];
    current.push(stopTime);
    stopTimesByTrip.set(stopTime.tripId, current);
  }
  for (const stopTimes of stopTimesByTrip.values()) {
    stopTimes.sort(compareStopTimes);
  }

  const frequenciesByTrip = new Map<string, GtfsFrequency[]>();
  for (const frequency of snapshot.frequencies) {
    const current = frequenciesByTrip.get(frequency.tripId) ?? [];
    current.push(frequency);
    frequenciesByTrip.set(frequency.tripId, current);
  }
  for (const frequencies of frequenciesByTrip.values()) {
    frequencies.sort(compareFrequencies);
  }

  return {
    snapshot,
    stopsById: createUniqueMap(snapshot.stops, (stop) => stop.id),
    routesById: createUniqueMap(snapshot.routes, (route) => route.id),
    tripsById: createUniqueMap(snapshot.trips, (trip) => trip.id),
    stopTimesByTrip,
    frequenciesByTrip,
  };
}

export function createRouteLineage(
  snapshot: GtfsSnapshot,
  config: ResolvedRouteEngineConfig,
): RouteLineage {
  return {
    snapshotId: snapshot.metadata.snapshotId,
    sourceUrl: snapshot.metadata.sourceUrl,
    acquiredAt: snapshot.metadata.acquiredAt,
    contentHash: snapshot.metadata.contentHash,
    coverage: snapshot.coverage,
    freshness: config.freshness,
    ...(snapshot.metadata.feedVersion
      ? { feedVersion: snapshot.metadata.feedVersion }
      : {}),
    ...(config.staticDemoNote ? { staticDemoNote: config.staticDemoNote } : {}),
  };
}

export function getActiveServicesByDate(
  snapshot: GtfsSnapshot,
  serviceDates: readonly string[],
): ReadonlyMap<string, ReadonlySet<string>> {
  return new Map(
    serviceDates.map((serviceDate) => [
      serviceDate,
      getActiveServiceIds(
        snapshot.calendars,
        snapshot.calendarDates,
        serviceDate,
      ),
    ]),
  );
}

export function findTripRideOptions(
  options: TripRideSearchOptions,
): readonly TripRideOption[] {
  const results: TripRideOption[] = [];
  const tripEntries = [...options.index.tripsById.values()].sort(compareTrips);

  for (const trip of tripEntries) {
    const route = options.index.routesById.get(trip.routeId);
    const stopTimes = options.index.stopTimesByTrip.get(trip.id);
    if (!route || !stopTimes || stopTimes.length < 2) {
      continue;
    }
    if (!options.supportedRouteTypes.includes(route.routeType)) {
      continue;
    }
    if (
      options.requiredRouteId !== undefined &&
      route.id !== options.requiredRouteId
    ) {
      continue;
    }

    const boardingIndexes = stopTimes
      .map((stopTime, index) =>
        stopTime.stopId === options.stopId ? index : undefined,
      )
      .filter(isNumber);
    for (const fromStopIndex of boardingIndexes) {
      const fromStopTime = stopTimes[fromStopIndex];
      if (!fromStopTime) {
        continue;
      }

      const downstream = stopTimes
        .slice(fromStopIndex + 1)
        .map((stopTime, offset) => ({
          stopTime,
          index: fromStopIndex + offset + 1,
        }))
        .filter(({ stopTime }) => options.targetStopIds.has(stopTime.stopId));
      for (const destination of downstream) {
        const rides = findRidesForServiceDates({
          trip,
          stopTimes,
          fromStopTime,
          toStopTime: destination.stopTime,
          fromStopIndex,
          toStopIndex: destination.index,
          frequencies: options.index.frequenciesByTrip.get(trip.id) ?? [],
          options,
        });
        results.push(...rides);
      }
    }
  }

  return results.sort(compareTripRideOptions);
}

export function isRoutableTransferEdge(
  edge: TransferEdge,
  index: RouteEngineIndex,
): boolean {
  return (
    edge.eligibleForRouting &&
    edge.connectionState === "routable" &&
    edge.evidenceState !== "Perlu dicek" &&
    edge.evidenceState !== "Unknown" &&
    edge.barrierState !== "present" &&
    index.stopsById.has(edge.from.stopId) &&
    index.stopsById.has(edge.to.stopId) &&
    edge.from.stopId !== edge.to.stopId
  );
}

export function getTransferDurationSeconds(edge: TransferEdge): number {
  return (
    edge.costs.transferDurationSeconds ??
    edge.costs.minimumTransferTimeSeconds ??
    (edge.walkingPath?.durationSeconds ?? 0) + edge.costs.safetyBufferSeconds
  );
}

export function createFailure(
  code: RouteSelectionErrorCode,
  message: string,
  recoveryAction: string,
  state: RouteSelectionFailure["state"] = "invalid-input",
): RouteSelectionFailure {
  return { state, code, message, recoveryAction };
}

function findRidesForServiceDates(input: {
  trip: GtfsTrip;
  stopTimes: readonly GtfsStopTime[];
  fromStopTime: GtfsStopTime;
  toStopTime: GtfsStopTime;
  fromStopIndex: number;
  toStopIndex: number;
  frequencies: readonly GtfsFrequency[];
  options: TripRideSearchOptions;
}): readonly TripRideOption[] {
  const serviceDates = [...input.options.activeServiceIdsByDate.entries()]
    .filter(([, activeServiceIds]) =>
      activeServiceIds.has(input.trip.serviceId),
    )
    .map(([serviceDate]) => serviceDate);
  const firstStopDeparture = input.stopTimes[0]?.departureTime;
  if (!firstStopDeparture) {
    return [];
  }

  const frequencies: readonly (GtfsFrequency | undefined)[] =
    input.frequencies.length > 0 ? input.frequencies : [undefined];
  const rides: TripRideOption[] = [];
  for (const serviceDate of serviceDates) {
    for (const frequency of frequencies) {
      const scheduled = findNextTripRide({
        requestedDate: input.options.requestedDate,
        requestedTime: input.options.requestedTime,
        requestedSeconds: input.options.readyAtSeconds,
        serviceDate,
        boardingDeparture: input.fromStopTime.departureTime,
        alightingArrival: input.toStopTime.arrivalTime,
        firstStopDeparture,
        ...(frequency ? { frequency } : {}),
      });
      if (scheduled) {
        rides.push({
          trip: input.trip,
          route: input.options.index.routesById.get(input.trip.routeId)!,
          serviceDate,
          fromStopIndex: input.fromStopIndex,
          toStopIndex: input.toStopIndex,
          fromStopTime: input.fromStopTime,
          toStopTime: input.toStopTime,
          stopTimes: input.stopTimes,
          scheduled,
        });
      }
    }
  }
  return rides;
}

function createUniqueMap<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (!map.has(key)) {
      map.set(key, value);
    }
  }
  return map;
}

function compareStopTimes(left: GtfsStopTime, right: GtfsStopTime): number {
  return (
    left.stopSequence - right.stopSequence ||
    compareOrdinal(left.stopId, right.stopId) ||
    left.lineage.rowNumber - right.lineage.rowNumber
  );
}

function compareFrequencies(left: GtfsFrequency, right: GtfsFrequency): number {
  return (
    left.startTime.secondsSinceServiceDayStart -
      right.startTime.secondsSinceServiceDayStart ||
    left.endTime.secondsSinceServiceDayStart -
      right.endTime.secondsSinceServiceDayStart ||
    left.headwaySeconds - right.headwaySeconds ||
    left.lineage.rowNumber - right.lineage.rowNumber
  );
}

function compareTrips(left: GtfsTrip, right: GtfsTrip): number {
  return compareOrdinal(left.id, right.id);
}

function compareTripRideOptions(
  left: TripRideOption,
  right: TripRideOption,
): number {
  return (
    left.scheduled.actualDepartureSeconds -
      right.scheduled.actualDepartureSeconds ||
    left.scheduled.actualArrivalSeconds -
      right.scheduled.actualArrivalSeconds ||
    compareOrdinal(left.route.id, right.route.id) ||
    compareOrdinal(left.trip.id, right.trip.id) ||
    left.toStopTime.stopSequence - right.toStopTime.stopSequence ||
    compareOrdinal(left.serviceDate, right.serviceDate)
  );
}

function compareOrdinal(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return left.length - right.length;
}

function isNumber(value: number | undefined): value is number {
  return value !== undefined;
}
