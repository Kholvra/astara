export const MVP_PROFILE_VERSION = "tj-mvp-core-v2";

/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsSnapshot} GtfsSnapshot */
/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsStop} GtfsStop */

const MVP_PROFILE_LIMITATION =
  "MVP profile excludes Mikrotrans and Bus Wisata services.";
const BRT_ROUTE_IDS = new Set(
  Array.from({ length: 14 }, (_, index) => String(index + 1)),
);
const REGULAR_ROUTE_ID_PATTERN = /^\d+[A-Z]$/;
const TRANSJABODETABEK_ROUTE_IDS = new Set([
  "B11",
  "B21",
  "B25",
  "B41",
  "B51",
  "D11",
  "D21",
  "D41",
  "P11",
  "S11",
  "S21",
  "S22",
  "S61",
  "SH1",
  "SH2",
  "T11",
  "T12",
  "T31",
]);

/** @param {string} routeId */
export function isMvpRouteId(routeId) {
  if (typeof routeId !== "string") {
    return false;
  }
  const normalizedRouteId = routeId.trim().toUpperCase();
  return (
    BRT_ROUTE_IDS.has(normalizedRouteId) ||
    REGULAR_ROUTE_ID_PATTERN.test(normalizedRouteId) ||
    TRANSJABODETABEK_ROUTE_IDS.has(normalizedRouteId)
  );
}

/** @param {GtfsSnapshot} sourceSnapshot @returns {GtfsSnapshot} */
export function createMvpSnapshot(sourceSnapshot) {
  assertSourceSnapshot(sourceSnapshot);
  const snapshotId = `${MVP_PROFILE_VERSION}-${sourceSnapshot.metadata.snapshotId}`;
  const routes = sourceSnapshot.routes.filter((route) =>
    isMvpRouteId(route.id),
  );
  const routeIds = new Set(routes.map((route) => route.id));
  const trips = sourceSnapshot.trips.filter((trip) =>
    routeIds.has(trip.routeId),
  );
  const tripIds = new Set(trips.map((trip) => trip.id));
  const stopTimes = sourceSnapshot.stopTimes.filter((stopTime) =>
    tripIds.has(stopTime.tripId),
  );
  const stopIds = new Set(stopTimes.map((stopTime) => stopTime.stopId));
  const shapeIds = new Set(
    trips.flatMap((trip) => (trip.shapeId ? [trip.shapeId] : [])),
  );
  const serviceIds = new Set(trips.map((trip) => trip.serviceId));
  const stopById = new Map(sourceSnapshot.stops.map((stop) => [stop.id, stop]));

  addParentStops(stopIds, stopById);

  const transfers = sourceSnapshot.transfers.filter(
    (transfer) =>
      stopIds.has(transfer.fromStopId) && stopIds.has(transfer.toStopId),
  );
  const fareRules = sourceSnapshot.fareRules.filter(
    (fareRule) =>
      fareRule.routeId === undefined || routeIds.has(fareRule.routeId),
  );
  const fareIds = new Set(fareRules.map((fareRule) => fareRule.fareId));
  const agencyIds = new Set(routes.map((route) => route.agencyId));

  const result = {
    ...sourceSnapshot,
    metadata: { ...sourceSnapshot.metadata, snapshotId },
    limitations: uniqueStrings([
      ...sourceSnapshot.limitations,
      MVP_PROFILE_LIMITATION,
    ]),
    agencies: sourceSnapshot.agencies
      .filter((agency) => agencyIds.has(agency.id))
      .map((agency) => rebaseLineage(agency, snapshotId)),
    routes: routes.map((route) => rebaseLineage(route, snapshotId)),
    stops: sourceSnapshot.stops
      .filter((stop) => stopIds.has(stop.id))
      .map((stop) => rebaseLineage(stop, snapshotId)),
    trips: trips.map((trip) => rebaseLineage(trip, snapshotId)),
    stopTimes: stopTimes.map((stopTime) => rebaseLineage(stopTime, snapshotId)),
    calendars: sourceSnapshot.calendars
      .filter((calendar) => serviceIds.has(calendar.serviceId))
      .map((calendar) => rebaseLineage(calendar, snapshotId)),
    calendarDates: sourceSnapshot.calendarDates
      .filter((calendarDate) => serviceIds.has(calendarDate.serviceId))
      .map((calendarDate) => rebaseLineage(calendarDate, snapshotId)),
    frequencies: sourceSnapshot.frequencies
      .filter((frequency) => tripIds.has(frequency.tripId))
      .map((frequency) => rebaseLineage(frequency, snapshotId)),
    transfers: transfers.map((transfer) => rebaseLineage(transfer, snapshotId)),
    shapes: sourceSnapshot.shapes
      .filter((shape) => shapeIds.has(shape.shapeId))
      .map((shape) => rebaseLineage(shape, snapshotId)),
    fareAttributes: sourceSnapshot.fareAttributes
      .filter((fareAttribute) => fareIds.has(fareAttribute.fareId))
      .map((fareAttribute) => rebaseLineage(fareAttribute, snapshotId)),
    fareRules: fareRules.map((fareRule) => rebaseLineage(fareRule, snapshotId)),
  };
  assertMvpSnapshotClosure(result);
  return result;
}

/** @param {Set<string>} stopIds @param {Map<string, GtfsStop>} stopById */
function addParentStops(stopIds, stopById) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const stopId of [...stopIds]) {
      const stop = stopById.get(stopId);
      const parentStationId = stop?.parentStationId;
      if (parentStationId && !stopIds.has(parentStationId)) {
        if (!stopById.has(parentStationId)) {
          throw new Error(
            `MVP profile cannot retain stop ${stopId}: parent station ${parentStationId} is missing.`,
          );
        }
        stopIds.add(parentStationId);
        changed = true;
      }
    }
  }
}

/**
 * @template T
 * @param {T & { lineage: { snapshotId: string } }} record
 * @param {string} snapshotId
 * @returns {T}
 */
function rebaseLineage(record, snapshotId) {
  return /** @type {T} */ ({
    ...record,
    lineage: { ...record.lineage, snapshotId },
  });
}

/** @param {readonly string[]} values */
function uniqueStrings(values) {
  return [...new Set(values)];
}

/** @param {GtfsSnapshot} snapshot */
function assertSourceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("The source GTFS snapshot is malformed.");
  }
  assertNonEmptyString("snapshot ID", snapshot.metadata?.snapshotId);
  assertNonEmptyString("source URL", snapshot.metadata?.sourceUrl);
  assertNonEmptyString("content hash", snapshot.metadata?.contentHash);
  assertNonEmptyString("service date", snapshot.serviceDate);
  assertArrayCollection("agencies", snapshot.agencies);
  assertArrayCollection("routes", snapshot.routes);
  assertArrayCollection("stops", snapshot.stops);
  assertArrayCollection("trips", snapshot.trips);
  assertArrayCollection("stopTimes", snapshot.stopTimes);
  assertArrayCollection("calendars", snapshot.calendars);
  assertArrayCollection("calendarDates", snapshot.calendarDates);
  assertArrayCollection("frequencies", snapshot.frequencies);
  assertArrayCollection("transfers", snapshot.transfers);
  assertArrayCollection("shapes", snapshot.shapes);
  assertArrayCollection("fareAttributes", snapshot.fareAttributes);
  assertArrayCollection("fareRules", snapshot.fareRules);
  assertUniqueIds("agency", snapshot.agencies, (agency) => agency.id);
  assertUniqueIds("route", snapshot.routes, (route) => route.id);
  assertUniqueIds("stop", snapshot.stops, (stop) => stop.id);
  assertUniqueIds("trip", snapshot.trips, (trip) => trip.id);
  assertUniqueIds(
    "calendar",
    snapshot.calendars,
    (calendar) => calendar.serviceId,
  );
  assertUniqueIds("fare", snapshot.fareAttributes, (fare) => fare.fareId);
}

/** @param {GtfsSnapshot} snapshot */
function assertMvpSnapshotClosure(snapshot) {
  if (snapshot.routes.length === 0 || snapshot.trips.length === 0) {
    throw new Error("The MVP profile retains no usable transit service.");
  }
  if (snapshot.stopTimes.length === 0) {
    throw new Error("The MVP profile retains no usable stop times.");
  }

  const agencyIds = new Set(snapshot.agencies.map((agency) => agency.id));
  const routeIds = new Set(snapshot.routes.map((route) => route.id));
  const tripIds = new Set(snapshot.trips.map((trip) => trip.id));
  const stopIds = new Set(snapshot.stops.map((stop) => stop.id));
  const shapeIds = new Set(snapshot.shapes.map((shape) => shape.shapeId));
  const serviceIds = new Set([
    ...snapshot.calendars.map((calendar) => calendar.serviceId),
    ...snapshot.calendarDates.map((calendarDate) => calendarDate.serviceId),
  ]);
  const fareIds = new Set(
    snapshot.fareAttributes.map((fareAttribute) => fareAttribute.fareId),
  );
  const stopTimesByTrip = new Map();

  for (const route of snapshot.routes) {
    if (!agencyIds.has(route.agencyId)) {
      throw new Error(
        `MVP profile route ${route.id} references a missing agency.`,
      );
    }
  }
  for (const trip of snapshot.trips) {
    if (!routeIds.has(trip.routeId)) {
      throw new Error(
        `MVP profile trip ${trip.id} references a missing route.`,
      );
    }
    if (!serviceIds.has(trip.serviceId)) {
      throw new Error(
        `MVP profile trip ${trip.id} references a missing service calendar.`,
      );
    }
    if (trip.shapeId && !shapeIds.has(trip.shapeId)) {
      throw new Error(
        `MVP profile trip ${trip.id} references missing shape ${trip.shapeId}.`,
      );
    }
    stopTimesByTrip.set(trip.id, []);
  }
  for (const stopTime of snapshot.stopTimes) {
    if (!tripIds.has(stopTime.tripId)) {
      throw new Error(
        `MVP profile stop time references missing trip ${stopTime.tripId}.`,
      );
    }
    if (!stopIds.has(stopTime.stopId)) {
      throw new Error(
        `MVP profile stop time references missing stop ${stopTime.stopId}.`,
      );
    }
    stopTimesByTrip.get(stopTime.tripId)?.push(stopTime);
  }
  for (const trip of snapshot.trips) {
    if ((stopTimesByTrip.get(trip.id)?.length ?? 0) < 2) {
      throw new Error(
        `MVP profile trip ${trip.id} has fewer than two stop times.`,
      );
    }
  }
  for (const stop of snapshot.stops) {
    if (stop.parentStationId && !stopIds.has(stop.parentStationId)) {
      throw new Error(
        `MVP profile stop ${stop.id} references a missing parent station.`,
      );
    }
  }
  for (const frequency of snapshot.frequencies) {
    if (!tripIds.has(frequency.tripId)) {
      throw new Error(
        `MVP profile frequency references missing trip ${frequency.tripId}.`,
      );
    }
  }
  for (const transfer of snapshot.transfers) {
    if (!stopIds.has(transfer.fromStopId) || !stopIds.has(transfer.toStopId)) {
      throw new Error("MVP profile transfer references a missing stop.");
    }
  }
  for (const fareRule of snapshot.fareRules) {
    if (!fareIds.has(fareRule.fareId)) {
      throw new Error(
        `MVP profile fare rule references missing fare ${fareRule.fareId}.`,
      );
    }
    if (fareRule.routeId && !routeIds.has(fareRule.routeId)) {
      throw new Error(
        `MVP profile fare rule references a missing route ${fareRule.routeId}.`,
      );
    }
  }
  for (const fareAttribute of snapshot.fareAttributes) {
    if (fareAttribute.agencyId && !agencyIds.has(fareAttribute.agencyId)) {
      throw new Error(
        `MVP profile fare ${fareAttribute.fareId} references a missing agency.`,
      );
    }
  }
}

/** @param {string} label @param {unknown} value */
function assertNonEmptyString(label, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The source GTFS ${label} is missing or malformed.`);
  }
}

/** @param {string} label @param {unknown} value */
function assertArrayCollection(label, value) {
  if (!Array.isArray(value)) {
    throw new Error(`The source GTFS ${label} collection is malformed.`);
  }
}

/**
 * @template T
 * @param {string} label
 * @param {readonly T[]} records
 * @param {(record: T) => unknown} getId
 */
function assertUniqueIds(label, records, getId) {
  const ids = new Set();
  for (const record of records) {
    const id = getId(record);
    assertNonEmptyString(`${label} ID`, id);
    if (ids.has(id)) {
      throw new Error(`The source GTFS contains duplicate ${label} ID ${id}.`);
    }
    ids.add(id);
  }
}
