import { getActiveServiceIds } from "~/core/ingestion/gtfsCalendar";
import type {
  GtfsFrequency,
  GtfsSnapshot,
  GtfsStopTime,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";
import type { TransferEdge } from "~/core/transfer/transferTypes";

import {
  DEFAULT_CANDIDATE_CONFIGURATION_HASH,
  DEFAULT_MAX_LABEL_EXPANSIONS,
  DEFAULT_MAX_SEARCH_DURATION_MS,
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

export type ResolvedRouteEngineConfig = Readonly<{
  supportedRouteTypes: readonly number[];
  maxTransfers: number;
  maxSearchStates: number;
  maxLabelExpansions: number;
  maxSearchDurationMs: number;
  routeRulesVersion: string;
  candidateConfigurationHash: string;
  freshness: NonNullable<RouteEngineConfig["freshness"]>;
  staticDemoNote?: string;
}>;

export type RouteConfigValidation =
  | Readonly<{ state: "valid"; config: ResolvedRouteEngineConfig }>
  | Readonly<{ state: "invalid"; failure: RouteSelectionFailure }>;

export function normalizeRouteEngineConfig(
  input: RouteEngineConfig | undefined,
): RouteConfigValidation {
  const supportedRouteTypes = input?.supportedRouteTypes
    ? [...input.supportedRouteTypes]
    : [...DEFAULT_SUPPORTED_ROUTE_TYPES];
  const maxTransfers = input?.maxTransfers ?? DEFAULT_MAX_TRANSFERS;
  const maxSearchStates = input?.maxSearchStates ?? DEFAULT_MAX_SEARCH_STATES;
  const maxLabelExpansions =
    input?.maxLabelExpansions ?? DEFAULT_MAX_LABEL_EXPANSIONS;
  const maxSearchDurationMs =
    input?.maxSearchDurationMs ?? DEFAULT_MAX_SEARCH_DURATION_MS;
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
    !Number.isInteger(maxLabelExpansions) ||
    maxLabelExpansions < 1 ||
    maxLabelExpansions > 200_000 ||
    !Number.isInteger(maxSearchDurationMs) ||
    maxSearchDurationMs < 1 ||
    maxSearchDurationMs > 60_000 ||
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
      maxLabelExpansions,
      maxSearchDurationMs,
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

  const tripsById = createUniqueMap(snapshot.trips, (trip) => trip.id);
  const tripsByStopId = new Map<string, GtfsTrip[]>();
  const routeIdsByStopId = new Map<string, Set<string>>();
  for (const [tripId, stopTimes] of stopTimesByTrip.entries()) {
    const trip = tripsById.get(tripId);
    if (!trip) continue;
    for (const stopTime of stopTimes) {
      const list = tripsByStopId.get(stopTime.stopId) ?? [];
      if (!list.some((entry) => entry.id === trip.id)) {
        list.push(trip);
      }
      tripsByStopId.set(stopTime.stopId, list);
      const routeIds = routeIdsByStopId.get(stopTime.stopId) ?? new Set();
      routeIds.add(trip.routeId);
      routeIdsByStopId.set(stopTime.stopId, routeIds);
    }
  }
  for (const trips of tripsByStopId.values()) {
    trips.sort(compareTrips);
  }
  const orderedRouteIdsByStopId = new Map<string, readonly string[]>();
  for (const [stopId, routeIds] of routeIdsByStopId.entries()) {
    orderedRouteIdsByStopId.set(stopId, [...routeIds].sort(compareOrdinal));
  }

  return {
    snapshot,
    stopsById: createUniqueMap(snapshot.stops, (stop) => stop.id),
    routesById: createUniqueMap(snapshot.routes, (route) => route.id),
    tripsById,
    stopTimesByTrip,
    frequenciesByTrip,
    tripsByStopId,
    routeIdsByStopId: orderedRouteIdsByStopId,
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
