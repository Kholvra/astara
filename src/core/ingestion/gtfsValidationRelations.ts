import { getActiveServiceIds } from "./gtfsCalendar";
import type { ParsedGtfsTables } from "./gtfsRecordParsers";
import type { GtfsValidationIssue } from "./gtfsTypes";

export function validateGtfsRelations(
  tables: ParsedGtfsTables,
  serviceDate: string | undefined,
  issues: GtfsValidationIssue[],
): void {
  validateReferences(tables, issues);
  validateSequences(tables, issues);
  if (serviceDate) {
    validateActiveService(tables, serviceDate, issues);
  }
}

function validateReferences(
  tables: ParsedGtfsTables,
  issues: GtfsValidationIssue[],
): void {
  const agencyIds = new Set(tables.agencies.map((record) => record.id));
  const routeIds = new Set(tables.routes.map((record) => record.id));
  const stopIds = new Set(tables.stops.map((record) => record.id));
  const tripIds = new Set(tables.trips.map((record) => record.id));
  const serviceIds = new Set([
    ...tables.calendars.map((record) => record.serviceId),
    ...tables.calendarDates.map((record) => record.serviceId),
  ]);
  const shapeIds = new Set(tables.shapes.map((record) => record.shapeId));
  const fareIds = new Set(tables.fareAttributes.map((record) => record.fareId));

  for (const route of tables.routes) {
    requireReference(
      agencyIds,
      route.agencyId,
      "routes.txt",
      route.lineage.rowNumber,
      "agency_id",
      issues,
    );
  }

  for (const stop of tables.stops) {
    if (stop.parentStationId) {
      requireReference(
        stopIds,
        stop.parentStationId,
        "stops.txt",
        stop.lineage.rowNumber,
        "parent_station",
        issues,
      );
    }
  }

  for (const trip of tables.trips) {
    requireReference(
      routeIds,
      trip.routeId,
      "trips.txt",
      trip.lineage.rowNumber,
      "route_id",
      issues,
    );
    requireReference(
      serviceIds,
      trip.serviceId,
      "trips.txt",
      trip.lineage.rowNumber,
      "service_id",
      issues,
    );
    if (trip.shapeId && tables.presentFiles.has("shapes.txt")) {
      requireReference(
        shapeIds,
        trip.shapeId,
        "trips.txt",
        trip.lineage.rowNumber,
        "shape_id",
        issues,
      );
    }
  }

  for (const stopTime of tables.stopTimes) {
    requireReference(
      tripIds,
      stopTime.tripId,
      "stop_times.txt",
      stopTime.lineage.rowNumber,
      "trip_id",
      issues,
    );
    requireReference(
      stopIds,
      stopTime.stopId,
      "stop_times.txt",
      stopTime.lineage.rowNumber,
      "stop_id",
      issues,
    );
  }

  for (const frequency of tables.frequencies) {
    requireReference(
      tripIds,
      frequency.tripId,
      "frequencies.txt",
      frequency.lineage.rowNumber,
      "trip_id",
      issues,
    );
  }

  for (const transfer of tables.transfers) {
    requireReference(
      stopIds,
      transfer.fromStopId,
      "transfers.txt",
      transfer.lineage.rowNumber,
      "from_stop_id",
      issues,
    );
    requireReference(
      stopIds,
      transfer.toStopId,
      "transfers.txt",
      transfer.lineage.rowNumber,
      "to_stop_id",
      issues,
    );
  }

  for (const fareAttribute of tables.fareAttributes) {
    if (fareAttribute.agencyId) {
      requireReference(
        agencyIds,
        fareAttribute.agencyId,
        "fare_attributes.txt",
        fareAttribute.lineage.rowNumber,
        "agency_id",
        issues,
      );
    }
  }

  for (const fareRule of tables.fareRules) {
    requireReference(
      fareIds,
      fareRule.fareId,
      "fare_rules.txt",
      fareRule.lineage.rowNumber,
      "fare_id",
      issues,
    );
    if (fareRule.routeId) {
      requireReference(
        routeIds,
        fareRule.routeId,
        "fare_rules.txt",
        fareRule.lineage.rowNumber,
        "route_id",
        issues,
      );
    }
  }
}

function validateSequences(
  tables: ParsedGtfsTables,
  issues: GtfsValidationIssue[],
): void {
  const stopTimesByTrip = new Map<
    string,
    (typeof tables.stopTimes)[number][]
  >();
  for (const stopTime of tables.stopTimes) {
    const tripStopTimes = stopTimesByTrip.get(stopTime.tripId) ?? [];
    tripStopTimes.push(stopTime);
    stopTimesByTrip.set(stopTime.tripId, tripStopTimes);
  }

  for (const tripStopTimes of stopTimesByTrip.values()) {
    const orderedStopTimes = [...tripStopTimes].sort(
      (left, right) => left.stopSequence - right.stopSequence,
    );
    for (let index = 1; index < orderedStopTimes.length; index += 1) {
      const previous = orderedStopTimes[index - 1];
      const current = orderedStopTimes[index];
      if (!previous || !current) {
        continue;
      }
      if (current.stopSequence <= previous.stopSequence) {
        addBlocker(
          issues,
          "Stop sequence must increase within each trip.",
          "stop_times.txt",
          current.lineage.rowNumber,
          "stop_sequence",
          "DATA-HARD-002",
        );
      }
      if (
        current.arrivalTime.secondsSinceServiceDayStart <
        previous.departureTime.secondsSinceServiceDayStart
      ) {
        addBlocker(
          issues,
          "Stop times must not move backwards within a trip.",
          "stop_times.txt",
          current.lineage.rowNumber,
          "arrival_time",
          "DATA-HARD-002",
        );
      }
    }
  }

  const shapesById = new Map<string, (typeof tables.shapes)[number][]>();
  for (const shape of tables.shapes) {
    const shapePoints = shapesById.get(shape.shapeId) ?? [];
    shapePoints.push(shape);
    shapesById.set(shape.shapeId, shapePoints);
  }

  for (const shapePoints of shapesById.values()) {
    const orderedShapePoints = [...shapePoints].sort(
      (left, right) => left.sequence - right.sequence,
    );
    for (let index = 1; index < orderedShapePoints.length; index += 1) {
      const previous = orderedShapePoints[index - 1];
      const current = orderedShapePoints[index];
      if (previous && current && current.sequence <= previous.sequence) {
        addBlocker(
          issues,
          "Shape point sequence must increase within each shape.",
          "shapes.txt",
          current.lineage.rowNumber,
          "shape_pt_sequence",
          "DATA-HARD-002",
        );
      }
    }
  }
}

function validateActiveService(
  tables: ParsedGtfsTables,
  serviceDate: string,
  issues: GtfsValidationIssue[],
): void {
  const activeServiceIds = getActiveServiceIds(
    tables.calendars,
    tables.calendarDates,
    serviceDate,
  );
  const stopTimesByTrip = new Map<string, number>();
  for (const stopTime of tables.stopTimes) {
    stopTimesByTrip.set(
      stopTime.tripId,
      (stopTimesByTrip.get(stopTime.tripId) ?? 0) + 1,
    );
  }

  const hasSupportedTrip = tables.trips.some(
    (trip) =>
      activeServiceIds.has(trip.serviceId) &&
      (stopTimesByTrip.get(trip.id) ?? 0) >= 2,
  );

  if (!hasSupportedTrip) {
    addBlocker(
      issues,
      `No active supported service exists for ${serviceDate}.`,
      undefined,
      undefined,
      "serviceDate",
      "DATA-HARD-005",
    );
  }
}

function requireReference(
  knownIds: ReadonlySet<string>,
  value: string,
  fileName: string,
  rowNumber: number,
  fieldName: string,
  issues: GtfsValidationIssue[],
): void {
  if (!knownIds.has(value)) {
    addBlocker(
      issues,
      `Reference '${value}' in '${fieldName}' does not exist.`,
      fileName,
      rowNumber,
      fieldName,
      "DATA-HARD-003",
    );
  }
}

function addBlocker(
  issues: GtfsValidationIssue[],
  message: string,
  fileName?: string,
  rowNumber?: number,
  fieldName?: string,
  code = "DATA-HARD-999",
): void {
  issues.push({
    code,
    classification: "blocker",
    message,
    fileName,
    rowNumber,
    fieldName,
  });
}
