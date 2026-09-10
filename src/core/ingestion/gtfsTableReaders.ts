import {
  parseCsvTable,
  type CsvRecord,
  type CsvTable,
  CsvParseError,
} from "./csv";
import {
  type GtfsRawFiles,
  type GtfsRecordLineage,
  type GtfsValidationIssue,
} from "./gtfsTypes";
import { parseGtfsTime, GtfsTimeParseError, type GtfsTime } from "./gtfsTime";

export type IssueSink = (issue: GtfsValidationIssue) => void;

export function readTable(
  files: GtfsRawFiles,
  fileName: string,
  requiredColumns: readonly string[],
  issue: IssueSink,
  required: boolean,
): CsvTable | undefined {
  const content = files[fileName];

  if (content === undefined) {
    if (required) {
      issue({
        code: "DATA-HARD-001",
        classification: "blocker",
        message: `Required GTFS file '${fileName}' is missing.`,
        fileName,
      });
    }
    return undefined;
  }

  let table: CsvTable;

  try {
    table = parseCsvTable(content, fileName);
  } catch (error) {
    const parseError = error instanceof CsvParseError ? error : undefined;
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: parseError?.message ?? `Could not parse '${fileName}'.`,
      fileName,
      rowNumber: parseError?.rowNumber,
    });
    return undefined;
  }

  for (const column of requiredColumns) {
    if (!table.headers.includes(column)) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: `Required column '${column}' is missing.`,
        fileName,
        fieldName: column,
      });
    }
  }

  return table;
}

export function parseRows<T>(
  table: CsvTable | undefined,
  parser: (row: CsvRecord) => T | undefined,
): readonly T[] {
  if (!table) {
    return [];
  }

  return table.records.flatMap((row) => {
    const value = parser(row);
    return value === undefined ? [] : [value];
  });
}

export function requiredText(
  row: CsvRecord,
  fieldName: string,
  fileName: string,
  issue: IssueSink,
): string | undefined {
  const value = row.values[fieldName];
  if (value === undefined || value.length === 0) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Required field '${fieldName}' is blank.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }
  if (value !== value.trim()) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Field '${fieldName}' must not have leading or trailing whitespace.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }
  return value;
}

export function optionalText(
  row: CsvRecord,
  fieldName: string,
): string | undefined {
  const value = row.values[fieldName];
  return value === undefined || value.length === 0 ? undefined : value;
}

export function requiredNumber(
  row: CsvRecord,
  fieldName: string,
  fileName: string,
  issue: IssueSink,
): number | undefined {
  return parseNumber(
    row.values[fieldName],
    fieldName,
    fileName,
    row,
    issue,
    false,
  );
}

export function requiredInteger(
  row: CsvRecord,
  fieldName: string,
  fileName: string,
  issue: IssueSink,
  minimum: number,
): number | undefined {
  return parseBoundedInteger(
    row.values[fieldName],
    fieldName,
    fileName,
    row,
    issue,
    minimum,
  );
}

export function optionalInteger(
  row: CsvRecord,
  fieldName: string,
  fileName: string,
  issue: IssueSink,
  minimum: number,
): number | undefined {
  const value = row.values[fieldName];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return parseBoundedInteger(value, fieldName, fileName, row, issue, minimum);
}

export function parseBoundedInteger(
  value: string | undefined,
  fieldName: string,
  fileName: string,
  row: CsvRecord,
  issue: IssueSink,
  minimum: number,
  maximum?: number,
): number | undefined {
  const parsed = parseNumber(value, fieldName, fileName, row, issue, true);
  if (
    parsed === undefined ||
    parsed < minimum ||
    (maximum !== undefined && parsed > maximum)
  ) {
    if (parsed !== undefined) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: `Field '${fieldName}' is outside its allowed integer range.`,
        fileName,
        rowNumber: row.rowNumber,
        fieldName,
      });
    }
    return undefined;
  }
  return parsed;
}

export function parseNumber(
  value: string | undefined,
  fieldName: string,
  fileName: string,
  row: CsvRecord,
  issue: IssueSink,
  integer: boolean,
): number | undefined {
  if (value === undefined || value.length === 0) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Required field '${fieldName}' is blank.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }

  if (value !== value.trim()) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Field '${fieldName}' must not have leading or trailing whitespace.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Field '${fieldName}' must be a valid ${integer ? "integer" : "number"}.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }
  return parsed;
}

export function requiredTime(
  row: CsvRecord,
  fieldName: string,
  fileName: string,
  issue: IssueSink,
): GtfsTime | undefined {
  const value = row.values[fieldName];
  if (value === undefined || value.length === 0) {
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message: `Required field '${fieldName}' is blank.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }

  try {
    return parseGtfsTime(value);
  } catch (error) {
    const timeError = error instanceof GtfsTimeParseError ? error : undefined;
    issue({
      code: "DATA-HARD-002",
      classification: "blocker",
      message:
        timeError?.message ?? `Field '${fieldName}' is not a valid GTFS time.`,
      fileName,
      rowNumber: row.rowNumber,
      fieldName,
    });
    return undefined;
  }
}

export function lineage(
  snapshotId: string,
  fileName: string,
  row: CsvRecord,
): GtfsRecordLineage {
  return { snapshotId, fileName, rowNumber: row.rowNumber };
}
