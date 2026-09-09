import { isGeoCoordinate } from "~/core/geojson/geometry";

import type { CsvTable } from "./csv";
import {
  lineage,
  optionalInteger,
  optionalText,
  parseRows,
  requiredInteger,
  requiredNumber,
  requiredText,
  requiredTime,
  type IssueSink,
} from "./gtfsTableReaders";
import type {
  GtfsFareAttribute,
  GtfsFareRule,
  GtfsFrequency,
  GtfsShapePoint,
  GtfsSnapshotMetadata,
  GtfsTransfer,
} from "./gtfsTypes";

export function parseFrequencies(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsFrequency[] {
  return parseRows(table, (row) => {
    const tripId = requiredText(row, "trip_id", "frequencies.txt", issue);
    const startTime = requiredTime(row, "start_time", "frequencies.txt", issue);
    const endTime = requiredTime(row, "end_time", "frequencies.txt", issue);
    const headwaySeconds = requiredInteger(
      row,
      "headway_secs",
      "frequencies.txt",
      issue,
      1,
    );

    if (!tripId || !startTime || !endTime || headwaySeconds === undefined) {
      return undefined;
    }

    if (
      endTime.secondsSinceServiceDayStart <=
      startTime.secondsSinceServiceDayStart
    ) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Frequency end time must be later than start time.",
        fileName: "frequencies.txt",
        rowNumber: row.rowNumber,
        fieldName: "start_time/end_time",
      });
      return undefined;
    }

    const exactTimes = row.values.exact_times;
    if (
      exactTimes !== undefined &&
      exactTimes !== "" &&
      exactTimes !== "0" &&
      exactTimes !== "1"
    ) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Frequency exact_times must be 0 or 1 when provided.",
        fileName: "frequencies.txt",
        rowNumber: row.rowNumber,
        fieldName: "exact_times",
      });
      return undefined;
    }

    return {
      tripId,
      startTime,
      endTime,
      headwaySeconds,
      timingSemantics: exactTimes === "1" ? "exact" : "interval",
      lineage: lineage(metadata.snapshotId, "frequencies.txt", row),
    };
  });
}

export function parseTransfers(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsTransfer[] {
  return parseRows(table, (row) => {
    const fromStopId = requiredText(
      row,
      "from_stop_id",
      "transfers.txt",
      issue,
    );
    const toStopId = requiredText(row, "to_stop_id", "transfers.txt", issue);
    const transferType = requiredInteger(
      row,
      "transfer_type",
      "transfers.txt",
      issue,
      0,
    );

    if (!fromStopId || !toStopId || transferType === undefined) {
      return undefined;
    }

    if (transferType > 5) {
      issue({
        code: "DATA-HARD-002",
        classification: "blocker",
        message: "Transfer type must be a GTFS value from 0 through 5.",
        fileName: "transfers.txt",
        rowNumber: row.rowNumber,
        fieldName: "transfer_type",
      });
      return undefined;
    }

    return {
      fromStopId,
      toStopId,
      transferType,
      minimumTransferTimeSeconds: optionalInteger(
        row,
        "min_transfer_time",
        "transfers.txt",
        issue,
        0,
      ),
      lineage: lineage(metadata.snapshotId, "transfers.txt", row),
    };
  });
}

export function parseShapes(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsShapePoint[] {
  return parseRows(table, (row) => {
    const shapeId = requiredText(row, "shape_id", "shapes.txt", issue);
    const sequence = requiredInteger(
      row,
      "shape_pt_sequence",
      "shapes.txt",
      issue,
      0,
    );
    const latitude = requiredNumber(row, "shape_pt_lat", "shapes.txt", issue);
    const longitude = requiredNumber(row, "shape_pt_lon", "shapes.txt", issue);

    if (
      !shapeId ||
      sequence === undefined ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return undefined;
    }

    const coordinate = [longitude, latitude] as const;
    if (!isGeoCoordinate(coordinate)) {
      issue({
        code: "DATA-HARD-004",
        classification: "blocker",
        message: "Shape coordinate is outside WGS84 bounds.",
        fileName: "shapes.txt",
        rowNumber: row.rowNumber,
        fieldName: "shape_pt_lat/shape_pt_lon",
      });
      return undefined;
    }

    return {
      shapeId,
      coordinate,
      sequence,
      lineage: lineage(metadata.snapshotId, "shapes.txt", row),
    };
  });
}

export function parseFareAttributes(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsFareAttribute[] {
  return parseRows(table, (row) => {
    const fareId = requiredText(row, "fare_id", "fare_attributes.txt", issue);
    const price = requiredNumber(row, "price", "fare_attributes.txt", issue);
    const currencyType = requiredText(
      row,
      "currency_type",
      "fare_attributes.txt",
      issue,
    );
    const paymentMethod = requiredInteger(
      row,
      "payment_method",
      "fare_attributes.txt",
      issue,
      0,
    );

    if (
      !fareId ||
      price === undefined ||
      !currencyType ||
      paymentMethod === undefined
    ) {
      return undefined;
    }

    return {
      fareId,
      price,
      currencyType,
      paymentMethod,
      transfers: optionalInteger(
        row,
        "transfers",
        "fare_attributes.txt",
        issue,
        0,
      ),
      agencyId: optionalText(row, "agency_id"),
      transferDurationSeconds: optionalInteger(
        row,
        "transfer_duration",
        "fare_attributes.txt",
        issue,
        0,
      ),
      lineage: lineage(metadata.snapshotId, "fare_attributes.txt", row),
    };
  });
}

export function parseFareRules(
  table: CsvTable | undefined,
  metadata: GtfsSnapshotMetadata,
  issue: IssueSink,
): readonly GtfsFareRule[] {
  return parseRows(table, (row) => {
    const fareId = requiredText(row, "fare_id", "fare_rules.txt", issue);

    if (!fareId) {
      return undefined;
    }

    return {
      fareId,
      routeId: optionalText(row, "route_id"),
      originId: optionalText(row, "origin_id"),
      destinationId: optionalText(row, "destination_id"),
      containsId: optionalText(row, "contains_id"),
      lineage: lineage(metadata.snapshotId, "fare_rules.txt", row),
    };
  });
}
