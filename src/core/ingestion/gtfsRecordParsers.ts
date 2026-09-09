import {
  parseAgencies,
  parseCalendarDates,
  parseCalendars,
  parseRoutes,
  parseStopTimes,
  parseStops,
  parseTrips,
} from "./gtfsCoreTableParsers";
import {
  parseFareAttributes,
  parseFareRules,
  parseFrequencies,
  parseShapes,
  parseTransfers,
} from "./gtfsOptionalTableParsers";
import { readTable, type IssueSink } from "./gtfsTableReaders";
import type {
  GtfsRawFiles,
  GtfsSnapshotMetadata,
  GtfsValidationIssue,
} from "./gtfsTypes";

export type ParsedGtfsTables = Readonly<{
  agencies: ReturnType<typeof parseAgencies>;
  routes: ReturnType<typeof parseRoutes>;
  stops: ReturnType<typeof parseStops>;
  trips: ReturnType<typeof parseTrips>;
  stopTimes: ReturnType<typeof parseStopTimes>;
  calendars: ReturnType<typeof parseCalendars>;
  calendarDates: ReturnType<typeof parseCalendarDates>;
  frequencies: ReturnType<typeof parseFrequencies>;
  transfers: ReturnType<typeof parseTransfers>;
  shapes: ReturnType<typeof parseShapes>;
  fareAttributes: ReturnType<typeof parseFareAttributes>;
  fareRules: ReturnType<typeof parseFareRules>;
  presentFiles: ReadonlySet<string>;
}>;

export function parseGtfsTables(
  files: GtfsRawFiles,
  metadata: GtfsSnapshotMetadata,
  issues: GtfsValidationIssue[],
): ParsedGtfsTables {
  const issue: IssueSink = (finding) => issues.push(finding);
  const presentFiles = new Set(Object.keys(files));

  const agencyTable = readTable(
    files,
    "agency.txt",
    ["agency_id", "agency_name", "agency_url", "agency_timezone"],
    issue,
    true,
  );
  const routeTable = readTable(
    files,
    "routes.txt",
    ["route_id", "agency_id", "route_type"],
    issue,
    true,
  );
  const stopTable = readTable(
    files,
    "stops.txt",
    ["stop_id", "stop_name", "stop_lat", "stop_lon"],
    issue,
    true,
  );
  const tripTable = readTable(
    files,
    "trips.txt",
    ["trip_id", "route_id", "service_id"],
    issue,
    true,
  );
  const stopTimeTable = readTable(
    files,
    "stop_times.txt",
    ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"],
    issue,
    true,
  );
  const calendarTable = readTable(
    files,
    "calendar.txt",
    [
      "service_id",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "start_date",
      "end_date",
    ],
    issue,
    false,
  );
  const calendarDateTable = readTable(
    files,
    "calendar_dates.txt",
    ["service_id", "date", "exception_type"],
    issue,
    false,
  );
  const frequencyTable = readTable(
    files,
    "frequencies.txt",
    ["trip_id", "start_time", "end_time", "headway_secs"],
    issue,
    false,
  );
  const transferTable = readTable(
    files,
    "transfers.txt",
    ["from_stop_id", "to_stop_id", "transfer_type"],
    issue,
    false,
  );
  const shapeTable = readTable(
    files,
    "shapes.txt",
    ["shape_id", "shape_pt_sequence", "shape_pt_lat", "shape_pt_lon"],
    issue,
    false,
  );
  const fareAttributeTable = readTable(
    files,
    "fare_attributes.txt",
    ["fare_id", "price", "currency_type", "payment_method"],
    issue,
    false,
  );
  const fareRuleTable = readTable(
    files,
    "fare_rules.txt",
    ["fare_id"],
    issue,
    false,
  );

  return {
    agencies: parseAgencies(agencyTable, metadata, issue),
    routes: parseRoutes(routeTable, metadata, issue),
    stops: parseStops(stopTable, metadata, issue),
    trips: parseTrips(tripTable, metadata, issue),
    stopTimes: parseStopTimes(stopTimeTable, metadata, issue),
    calendars: parseCalendars(calendarTable, metadata, issue),
    calendarDates: parseCalendarDates(calendarDateTable, metadata, issue),
    frequencies: parseFrequencies(frequencyTable, metadata, issue),
    transfers: parseTransfers(transferTable, metadata, issue),
    shapes: parseShapes(shapeTable, metadata, issue),
    fareAttributes: parseFareAttributes(fareAttributeTable, metadata, issue),
    fareRules: parseFareRules(fareRuleTable, metadata, issue),
    presentFiles,
  };
}
