import type {
  GtfsFrequency,
  GtfsRoute,
  GtfsStopTime,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";

import { findNextTripRide, type ScheduledTripRide } from "./routeSchedule";
import type { RouteEngineIndex } from "./routingTypes";

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
  excludedTripIds?: ReadonlySet<string>;
  shouldContinue?: () => boolean;
}>;

export function findTripRideOptions(
  options: TripRideSearchOptions,
): readonly TripRideOption[] {
  const bestByDestinationStop = new Map<string, TripRideOption>();
  const tripEntries = options.index.tripsByStopId.get(options.stopId) ?? [];

  for (const trip of tripEntries) {
    if (options.shouldContinue && !options.shouldContinue()) {
      return [...bestByDestinationStop.values()].sort(compareTripRideOptions);
    }
    if (options.excludedTripIds?.has(trip.id)) {
      continue;
    }
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

    const boardingIndexes: number[] = [];
    for (let index = 0; index < stopTimes.length; index += 1) {
      if (options.shouldContinue && !options.shouldContinue()) {
        return [...bestByDestinationStop.values()].sort(compareTripRideOptions);
      }
      if (stopTimes[index]?.stopId === options.stopId) {
        boardingIndexes.push(index);
      }
    }
    for (const fromStopIndex of boardingIndexes) {
      if (options.shouldContinue && !options.shouldContinue()) {
        return [...bestByDestinationStop.values()].sort(compareTripRideOptions);
      }
      const fromStopTime = stopTimes[fromStopIndex];
      if (!fromStopTime) {
        continue;
      }

      for (
        let destinationIndex = fromStopIndex + 1;
        destinationIndex < stopTimes.length;
        destinationIndex += 1
      ) {
        if (options.shouldContinue && !options.shouldContinue()) {
          return [...bestByDestinationStop.values()].sort(
            compareTripRideOptions,
          );
        }
        const destination = stopTimes[destinationIndex];
        if (!destination || !options.targetStopIds.has(destination.stopId)) {
          continue;
        }
        const rides = findRidesForServiceDates({
          trip,
          stopTimes,
          fromStopTime,
          toStopTime: destination,
          fromStopIndex,
          toStopIndex: destinationIndex,
          frequencies: options.index.frequenciesByTrip.get(trip.id) ?? [],
          options,
        });
        for (const ride of rides) {
          const current = bestByDestinationStop.get(ride.toStopTime.stopId);
          if (
            current === undefined ||
            compareTripRideOptions(ride, current) < 0
          ) {
            bestByDestinationStop.set(ride.toStopTime.stopId, ride);
          }
        }
      }
    }
  }

  return [...bestByDestinationStop.values()].sort(compareTripRideOptions);
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
    if (input.options.shouldContinue && !input.options.shouldContinue()) {
      return rides;
    }
    for (const frequency of frequencies) {
      if (input.options.shouldContinue && !input.options.shouldContinue()) {
        return rides;
      }
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
        const route = input.options.index.routesById.get(input.trip.routeId);
        if (!route) {
          continue;
        }
        rides.push({
          trip: input.trip,
          route,
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
