import { isGeoCoordinate } from "~/core/geojson/geometry";

import type { CsvTable } from "./csv";
import { parseGtfsDate } from "./gtfsCalendar";
import {
  lineage,
  optionalInteger,
  optionalText,
  parseBoundedInteger,
  parseRows,
  requiredInteger,
  requiredNumber,
  requiredText,
  requiredTime,
  type IssueSink,
} from "./gtfsTableReaders";
import type {
  GtfsAgency,
  GtfsCalendar,
  GtfsCalendarDate,
  GtfsRoute,
  GtfsSnapshotMetadata,
  GtfsStop,
  GtfsStopTime,
  GtfsTrip,
  GtfsWeekday,
} from "./gtfsTypes";

export function parseAgencies(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsAgency[] {
  return parseRows(table, (row) => {
    const id = requiredText(row, "agency_id", "agency.txt", issue);
    const name = requiredText(row, "agency_name", "agency.txt", issue);
    const url = requiredText(row, "agency_url", "agency.txt", issue);
    const timezone = requiredText(row, "agency_timezone", "agency.txt", issue);

    if (!id || !name || !url || !timezone) {
      return undefined;
    }

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: `Agency URL '${url}' is invalid.`,
        fileName: "agency.txt",
        rowNumber: row.rowNumber,
        fieldName: "agency_url",
      });
      return undefined;
    }

    return {
      id,
      name,
      url,
      timezone,
      lineage: lineage(metadata.snapshotId, "agency.txt", row),
    };
  });
}

export function parseRoutes(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsRoute[] {
  return parseRows(table, (row) => {
    const id = requiredText(row, "route_id", "routes.txt", issue);
    const agencyId = requiredText(row, "agency_id", "routes.txt", issue);
    const shortName = optionalText(row, "route_short_name");
    const longName = optionalText(row, "route_long_name");
    const routeType = requiredInteger(
      row,
      "route_type",
      "routes.txt",
      issue,
      0,
    );

    if (
      !id ||
      !agencyId ||
      (shortName === undefined && longName === undefined) ||
      routeType === undefined
    ) {
      return undefined;
    }

    return {
      id,
      agencyId,
      shortName: shortName ?? "",
      longName: longName ?? "",
      routeType,
      lineage: lineage(metadata.snapshotId, "routes.txt", row),
    };
  });
}

export function parseStops(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsStop[] {
  return parseRows(table, (row) => {
    const id = requiredText(row, "stop_id", "stops.txt", issue);
    const name = requiredText(row, "stop_name", "stops.txt", issue);
    const latitude = requiredNumber(row, "stop_lat", "stops.txt", issue);
    const longitude = requiredNumber(row, "stop_lon", "stops.txt", issue);

    if (!id || !name || latitude === undefined || longitude === undefined) {
      return undefined;
    }

    const coordinate = [longitude, latitude] as const;
    if (!isGeoCoordinate(coordinate)) {
      issue({
        code: "DATA-HARD-004",
        classification: "blocker",
        message: "Stop coordinate is outside WGS84 bounds.",
        fileName: "stops.txt",
        rowNumber: row.rowNumber,
        fieldName: "stop_lat/stop_lon",
      });
      return undefined;
    }

    return {
      id,
      name,
      coordinate,
      stopCode: optionalText(row, "stop_code"),
      locationType: optionalInteger(
        row,
        "location_type",
        "stops.txt",
        issue,
        0,
      ),
      parentStationId: optionalText(row, "parent_station"),
      lineage: lineage(metadata.snapshotId, "stops.txt", row),
    };
  });
}

export function parseTrips(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsTrip[] {
  return parseRows(table, (row) => {
    const id = requiredText(row, "trip_id", "trips.txt", issue);
    const routeId = requiredText(row, "route_id", "trips.txt", issue);
    const serviceId = requiredText(row, "service_id", "trips.txt", issue);

    if (!id || !routeId || !serviceId) {
      return undefined;
    }

    return {
      id,
      routeId,
      serviceId,
      headsign: optionalText(row, "trip_headsign"),
      directionId: optionalInteger(row, "direction_id", "trips.txt", issue, 0),
      shapeId: optionalText(row, "shape_id"),
      lineage: lineage(metadata.snapshotId, "trips.txt", row),
    };
  });
}

export function parseStopTimes(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsStopTime[] {
  return parseRows(table, (row) => {
    const tripId = requiredText(row, "trip_id", "stop_times.txt", issue);
    const stopId = requiredText(row, "stop_id", "stop_times.txt", issue);
    const stopSequence = requiredInteger(
      row,
      "stop_sequence",
      "stop_times.txt",
      issue,
      0,
    );
    const arrivalTime = requiredTime(
      row,
      "arrival_time",
      "stop_times.txt",
      issue,
    );
    const departureTime = requiredTime(
      row,
      "departure_time",
      "stop_times.txt",
      issue,
    );

    if (
      !tripId ||
      !stopId ||
      stopSequence === undefined ||
      !arrivalTime ||
      !departureTime
    ) {
      return undefined;
    }

    if (
      departureTime.secondsSinceServiceDayStart <
      arrivalTime.secondsSinceServiceDayStart
    ) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Departure time must not be earlier than arrival time.",
        fileName: "stop_times.txt",
        rowNumber: row.rowNumber,
        fieldName: "arrival_time/departure_time",
      });
      return undefined;
    }

    const timepointValue = row.values.timepoint;
    let timepoint: number | undefined;
    if (timepointValue?.length === 0) {
      issue({
        code: "DATA-WARN-001",
        classification: "warning",
        message:
          "Stop time has no timepoint value; arrival/departure times remain required facts.",
        fileName: "stop_times.txt",
        rowNumber: row.rowNumber,
        fieldName: "timepoint",
      });
    } else if (timepointValue !== undefined) {
      timepoint = parseBoundedInteger(
        timepointValue,
        "timepoint",
        "stop_times.txt",
        row,
        issue,
        0,
        1,
      );
    }

    return {
      tripId,
      stopId,
      stopSequence,
      arrivalTime,
      departureTime,
      timepoint,
      lineage: lineage(metadata.snapshotId, "stop_times.txt", row),
    };
  });
}

export function parseCalendars(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsCalendar[] {
  const weekdays: readonly GtfsWeekday[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return parseRows(table, (row) => {
    const serviceId = requiredText(row, "service_id", "calendar.txt", issue);
    const startDateValue = requiredText(
      row,
      "start_date",
      "calendar.txt",
      issue,
    );
    const endDateValue = requiredText(row, "end_date", "calendar.txt", issue);

    if (!serviceId || !startDateValue || !endDateValue) {
      return undefined;
    }

    const startDate = parseGtfsDate(startDateValue);
    const endDate = parseGtfsDate(endDateValue);
    if (!startDate || !endDate || startDate > endDate) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Calendar start/end dates are invalid or reversed.",
        fileName: "calendar.txt",
        rowNumber: row.rowNumber,
        fieldName: "start_date/end_date",
      });
      return undefined;
    }

    const weekdayValues: Record<GtfsWeekday, boolean> = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };

    for (const weekday of weekdays) {
      const value = parseBoundedInteger(
        row.values[weekday],
        weekday,
        "calendar.txt",
        row,
        issue,
        0,
        1,
      );
      if (value === undefined) {
        return undefined;
      }
      weekdayValues[weekday] = value === 1;
    }

    return {
      serviceId,
      weekdays: weekdayValues,
      startDate,
      endDate,
      lineage: lineage(metadata.snapshotId, "calendar.txt", row),
    };
  });
}

export function parseCalendarDates(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsCalendarDate[] {
  return parseRows(table, (row) => {
    const serviceId = requiredText(
      row,
      "service_id",
      "calendar_dates.txt",
      issue,
    );
    const dateValue = requiredText(row, "date", "calendar_dates.txt", issue);
    const exceptionType = requiredInteger(
      row,
      "exception_type",
      "calendar_dates.txt",
      issue,
      1,
    );

    if (!serviceId || !dateValue || exceptionType === undefined) {
      return undefined;
    }

    const date = parseGtfsDate(dateValue);
    if (!date || (exceptionType !== 1 && exceptionType !== 2)) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Calendar exception date or type is invalid.",
        fileName: "calendar_dates.txt",
        rowNumber: row.rowNumber,
        fieldName: "date/exception_type",
      });
      return undefined;
    }

    return {
      serviceId,
      date,
      exceptionType,
      lineage: lineage(metadata.snapshotId, "calendar_dates.txt", row),
    };
  });
}
