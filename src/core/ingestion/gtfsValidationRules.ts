import { parseIsoServiceDate } from "./gtfsCalendar";
import type { ParsedGtfsTables } from "./gtfsRecordParsers";
import { validateGtfsProvenance } from "./gtfsProvenance";
import { validateGtfsRelations } from "./gtfsValidationRelations";
import {
  GTFS_REQUIRED_FILES,
  isAcceptedWarningCode,
  type GtfsSnapshotMetadata,
  type GtfsValidationConfig,
  type GtfsValidationIssue,
} from "./gtfsTypes";

export function validateGtfsRules(
  metadata: GtfsSnapshotMetadata,
  config: GtfsValidationConfig,
  tables: ParsedGtfsTables,
  issues: GtfsValidationIssue[],
  limitations: string[],
): string | undefined {
  validateGtfsProvenance(metadata, config, issues);
  validateRequiredTables(tables, issues);
  addOptionalLimitations(tables, limitations, issues);
  validateIdentifiers(tables, issues);

  const normalizedServiceDate = parseIsoServiceDate(config.serviceDate);
  validateGtfsRelations(tables, normalizedServiceDate, issues);
  if (!normalizedServiceDate) {
    addBlocker(
      issues,
      "Invalid validation service date.",
      undefined,
      undefined,
      "serviceDate",
    );
  }

  addFailClosedFindings(issues);
  return normalizedServiceDate;
}

export function isBlockingIssue(issue: GtfsValidationIssue): boolean {
  return (
    issue.classification === "blocker" || !isAcceptedWarningCode(issue.code)
  );
}

function validateRequiredTables(
  tables: ParsedGtfsTables,
  issues: GtfsValidationIssue[],
): void {
  const rowCounts: Readonly<Record<string, number>> = {
    "agency.txt": tables.agencies.length,
    "routes.txt": tables.routes.length,
    "stops.txt": tables.stops.length,
    "trips.txt": tables.trips.length,
    "stop_times.txt": tables.stopTimes.length,
  };

  for (const fileName of GTFS_REQUIRED_FILES) {
    if (!tables.presentFiles.has(fileName)) {
      continue;
    }

    if (rowCounts[fileName] === 0 && !hasIssueForFile(issues, fileName)) {
      addBlocker(
        issues,
        `Required GTFS file '${fileName}' has no usable records.`,
        fileName,
        undefined,
        undefined,
        "DATA-HARD-001",
      );
    }
  }

  const hasCalendarBasis =
    tables.presentFiles.has("calendar.txt") ||
    tables.presentFiles.has("calendar_dates.txt");
  if (
    !hasCalendarBasis ||
    (tables.calendars.length === 0 && tables.calendarDates.length === 0)
  ) {
    addBlocker(
      issues,
      "At least one usable calendar service-date source is required.",
      "calendar.txt/calendar_dates.txt",
      undefined,
      undefined,
      "DATA-HARD-001",
    );
  }
}

function addOptionalLimitations(
  tables: ParsedGtfsTables,
  limitations: string[],
  issues: GtfsValidationIssue[],
): void {
  if (!tables.presentFiles.has("calendar_dates.txt")) {
    addLimitation(
      limitations,
      "Calendar exception coverage is limited: calendar_dates.txt is absent, so special-date additions and removals are not represented.",
      issues,
      "DATA-WARN-002",
      "calendar_dates.txt",
    );
  }

  if (!tables.presentFiles.has("pathways.txt")) {
    addLimitation(
      limitations,
      "Station access coverage is limited: pathways.txt is absent, so entrances and internal pathways are not verified.",
      issues,
      "DATA-WARN-003",
      "pathways.txt",
    );
  }

  if (!tables.presentFiles.has("feed_info.txt")) {
    addLimitation(
      limitations,
      "Feed version is unavailable: feed_info.txt is absent.",
      issues,
      "DATA-WARN-004",
      "feed_info.txt",
    );
  }

  if (!tables.presentFiles.has("shapes.txt")) {
    limitations.push(
      "Route geometry coverage is limited: shapes.txt is absent.",
    );
  }

  if (!tables.presentFiles.has("transfers.txt")) {
    limitations.push(
      "Explicit transfer coverage is limited: transfers.txt is absent.",
    );
  }
}

function validateIdentifiers(
  tables: ParsedGtfsTables,
  issues: GtfsValidationIssue[],
): void {
  validateUnique(tables.agencies, (record) => record.id, "agency.txt", issues);
  validateUnique(tables.routes, (record) => record.id, "routes.txt", issues);
  validateUnique(tables.stops, (record) => record.id, "stops.txt", issues);
  validateUnique(tables.trips, (record) => record.id, "trips.txt", issues);
  validateUnique(
    tables.calendars,
    (record) => record.serviceId,
    "calendar.txt",
    issues,
  );
  validateUnique(
    tables.fareAttributes,
    (record) => record.fareId,
    "fare_attributes.txt",
    issues,
  );
  validateUnique(
    tables.calendarDates,
    (record) => `${record.serviceId}:${record.date}`,
    "calendar_dates.txt",
    issues,
  );
  validateUnique(
    tables.shapes,
    (record) => `${record.shapeId}:${record.sequence}`,
    "shapes.txt",
    issues,
  );
}

function validateUnique<T>(
  records: readonly T[],
  getKey: (record: T) => string,
  fileName: string,
  issues: GtfsValidationIssue[],
): void {
  const seen = new Set<string>();
  for (const record of records) {
    const key = getKey(record);
    if (seen.has(key)) {
      const source = record as T & { lineage?: { rowNumber: number } };
      addBlocker(
        issues,
        `Duplicate identifier '${key}'.`,
        fileName,
        source.lineage?.rowNumber,
        undefined,
        "DATA-HARD-003",
      );
    }
    seen.add(key);
  }
}

function addOptionalWarning(
  issues: GtfsValidationIssue[],
  code: string,
  message: string,
  fileName: string,
): void {
  issues.push({ code, classification: "warning", message, fileName });
}

function addLimitation(
  limitations: string[],
  message: string,
  issues: GtfsValidationIssue[],
  code: string,
  fileName: string,
): void {
  limitations.push(message);
  addOptionalWarning(issues, code, message, fileName);
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

function addFailClosedFindings(issues: GtfsValidationIssue[]): void {
  const unclassified = issues.filter(
    (issue) =>
      issue.classification === "warning" && !isAcceptedWarningCode(issue.code),
  );
  if (unclassified.length > 0) {
    issues.push({
      code: "DATA-HARD-999",
      classification: "blocker",
      message: "An unclassified validation finding cannot be published.",
    });
  }
}

function hasIssueForFile(
  issues: readonly GtfsValidationIssue[],
  fileName: string,
): boolean {
  return issues.some((issue) => issue.fileName === fileName);
}
