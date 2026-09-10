import type { Prisma } from "../../../generated/prisma";

import { isPublishableGtfsCandidate } from "~/core/ingestion/gtfsLifecycle";
import type {
  GtfsSnapshotMetadata,
  GtfsValidationResult,
} from "~/core/ingestion/gtfsTypes";

export type GtfsSnapshotWriteInput = Readonly<{
  metadata: GtfsSnapshotMetadata;
  serviceDate: string;
  rawStorageKey: string;
  validationCompletedAt: string;
  candidate: GtfsValidationResult;
}>;

type NormalizedSnapshot = NonNullable<
  GtfsSnapshotWriteInput["candidate"]["snapshot"]
>;

export async function persistGtfsSnapshot(
  transaction: Prisma.TransactionClient,
  input: GtfsSnapshotWriteInput,
): Promise<void> {
  const snapshot = input.candidate.snapshot;
  await transaction.gtfsSnapshot.create({
    data: {
      snapshotId: input.metadata.snapshotId,
      sourceUrl: input.metadata.sourceUrl,
      acquiredAt: input.metadata.acquiredAt,
      contentHash: input.metadata.contentHash,
      httpEtag: input.metadata.httpMetadata?.etag ?? null,
      httpLastModified: input.metadata.httpMetadata?.lastModified ?? null,
      feedVersion: input.metadata.feedVersion ?? null,
      serviceDate: input.serviceDate,
      coverage: snapshot?.coverage === "complete" ? "COMPLETE" : "LIMITED",
      limitations: [...input.candidate.limitations],
      rawStorageKey: input.rawStorageKey,
      validationState: isPublishableGtfsCandidate(input.candidate)
        ? "ACCEPTED"
        : "REJECTED",
      validationCompletedAt: input.validationCompletedAt,
    },
  });

  await writeIssues(transaction, input);
  if (snapshot) {
    await writeNormalizedSnapshot(transaction, snapshot);
  }
}

async function writeNormalizedSnapshot(
  transaction: Prisma.TransactionClient,
  snapshot: NormalizedSnapshot,
): Promise<void> {
  await writeAgencies(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.agencies,
  );
  await writeRoutes(transaction, snapshot.metadata.snapshotId, snapshot.routes);
  await writeStops(transaction, snapshot.metadata.snapshotId, snapshot.stops);
  await writeTrips(transaction, snapshot.metadata.snapshotId, snapshot.trips);
  await writeStopTimes(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.stopTimes,
  );
  await writeCalendars(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.calendars,
  );
  await writeCalendarDates(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.calendarDates,
  );
  await writeFrequencies(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.frequencies,
  );
  await writeTransfers(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.transfers,
  );
  await writeShapes(transaction, snapshot.metadata.snapshotId, snapshot.shapes);
  await writeFareAttributes(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.fareAttributes,
  );
  await writeFareRules(
    transaction,
    snapshot.metadata.snapshotId,
    snapshot.fareRules,
  );
}

async function writeIssues(
  transaction: Prisma.TransactionClient,
  input: GtfsSnapshotWriteInput,
): Promise<void> {
  const data: Prisma.GtfsValidationIssueCreateManyInput[] =
    input.candidate.issues.map((issue, issueIndex) => ({
      snapshotId: input.metadata.snapshotId,
      issueIndex,
      code: issue.code,
      classification:
        issue.classification === "blocker" ? "BLOCKER" : "WARNING",
      message: issue.message,
      fileName: issue.fileName ?? null,
      rowNumber: issue.rowNumber ?? null,
      fieldName: issue.fieldName ?? null,
    }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsValidationIssue.createMany({ data: rows }),
  );
}

async function writeAgencies(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  agencies: NormalizedSnapshot["agencies"],
): Promise<void> {
  const data = agencies.map((agency) => ({
    snapshotId,
    agencyId: agency.id,
    name: agency.name,
    url: agency.url,
    timezone: agency.timezone,
    ...lineageFields(agency.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsAgency.createMany({ data: rows }),
  );
}

async function writeRoutes(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  routes: NormalizedSnapshot["routes"],
): Promise<void> {
  const data = routes.map((route) => ({
    snapshotId,
    routeId: route.id,
    agencyId: route.agencyId,
    shortName: route.shortName,
    longName: route.longName,
    routeType: route.routeType,
    ...lineageFields(route.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsRoute.createMany({ data: rows }),
  );
}

async function writeStops(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  stops: NormalizedSnapshot["stops"],
): Promise<void> {
  const data = stops.map((stop) => ({
    snapshotId,
    stopId: stop.id,
    name: stop.name,
    latitude: stop.coordinate[1],
    longitude: stop.coordinate[0],
    stopCode: stop.stopCode ?? null,
    locationType: stop.locationType ?? null,
    parentStationId: stop.parentStationId ?? null,
    ...lineageFields(stop.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsStop.createMany({ data: rows }),
  );
}

async function writeTrips(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  trips: NormalizedSnapshot["trips"],
): Promise<void> {
  const data = trips.map((trip) => ({
    snapshotId,
    tripId: trip.id,
    routeId: trip.routeId,
    serviceId: trip.serviceId,
    headsign: trip.headsign ?? null,
    directionId: trip.directionId ?? null,
    shapeId: trip.shapeId ?? null,
    ...lineageFields(trip.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsTrip.createMany({ data: rows }),
  );
}

async function writeStopTimes(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  stopTimes: NormalizedSnapshot["stopTimes"],
): Promise<void> {
  const data = stopTimes.map((stopTime) => ({
    snapshotId,
    tripId: stopTime.tripId,
    stopSequence: stopTime.stopSequence,
    stopId: stopTime.stopId,
    arrivalTimeRaw: stopTime.arrivalTime.raw,
    arrivalTimeSeconds: stopTime.arrivalTime.secondsSinceServiceDayStart,
    departureTimeRaw: stopTime.departureTime.raw,
    departureTimeSeconds: stopTime.departureTime.secondsSinceServiceDayStart,
    timepoint: stopTime.timepoint ?? null,
    ...lineageFields(stopTime.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsStopTime.createMany({ data: rows }),
  );
}

async function writeCalendars(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  calendars: NormalizedSnapshot["calendars"],
): Promise<void> {
  const data = calendars.map((calendar) => ({
    snapshotId,
    serviceId: calendar.serviceId,
    ...calendar.weekdays,
    startDate: calendar.startDate,
    endDate: calendar.endDate,
    ...lineageFields(calendar.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsCalendar.createMany({ data: rows }),
  );
}

async function writeCalendarDates(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  calendarDates: NormalizedSnapshot["calendarDates"],
): Promise<void> {
  const data = calendarDates.map((calendarDate) => ({
    snapshotId,
    serviceId: calendarDate.serviceId,
    date: calendarDate.date,
    exceptionType: calendarDate.exceptionType,
    ...lineageFields(calendarDate.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsCalendarDate.createMany({ data: rows }),
  );
}

async function writeFrequencies(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  frequencies: NormalizedSnapshot["frequencies"],
): Promise<void> {
  const data = frequencies.map((frequency) => ({
    snapshotId,
    tripId: frequency.tripId,
    startTimeRaw: frequency.startTime.raw,
    startTimeSeconds: frequency.startTime.secondsSinceServiceDayStart,
    endTimeRaw: frequency.endTime.raw,
    endTimeSeconds: frequency.endTime.secondsSinceServiceDayStart,
    headwaySeconds: frequency.headwaySeconds,
    timingSemantics:
      frequency.timingSemantics === "exact"
        ? ("EXACT" as const)
        : ("INTERVAL" as const),
    ...lineageFields(frequency.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsFrequency.createMany({ data: rows }),
  );
}

async function writeTransfers(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  transfers: NormalizedSnapshot["transfers"],
): Promise<void> {
  const data = transfers.map((transfer) => ({
    snapshotId,
    lineageRowNumber: transfer.lineage.rowNumber,
    fromStopId: transfer.fromStopId,
    toStopId: transfer.toStopId,
    transferType: transfer.transferType,
    minimumTransferTimeSeconds: transfer.minimumTransferTimeSeconds ?? null,
    lineageFileName: transfer.lineage.fileName,
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsTransfer.createMany({ data: rows }),
  );
}

async function writeShapes(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  shapes: NormalizedSnapshot["shapes"],
): Promise<void> {
  const data = shapes.map((shape) => ({
    snapshotId,
    shapeId: shape.shapeId,
    sequence: shape.sequence,
    latitude: shape.coordinate[1],
    longitude: shape.coordinate[0],
    ...lineageFields(shape.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsShapePoint.createMany({ data: rows }),
  );
}

async function writeFareAttributes(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  fareAttributes: NormalizedSnapshot["fareAttributes"],
): Promise<void> {
  const data = fareAttributes.map((fare) => ({
    snapshotId,
    fareId: fare.fareId,
    price: fare.price,
    currencyType: fare.currencyType,
    paymentMethod: fare.paymentMethod,
    transfers: fare.transfers ?? null,
    agencyId: fare.agencyId ?? null,
    transferDurationSeconds: fare.transferDurationSeconds ?? null,
    ...lineageFields(fare.lineage),
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsFareAttribute.createMany({ data: rows }),
  );
}

async function writeFareRules(
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  fareRules: NormalizedSnapshot["fareRules"],
): Promise<void> {
  const data = fareRules.map((fareRule) => ({
    snapshotId,
    lineageRowNumber: fareRule.lineage.rowNumber,
    fareId: fareRule.fareId,
    routeId: fareRule.routeId ?? null,
    originId: fareRule.originId ?? null,
    destinationId: fareRule.destinationId ?? null,
    containsId: fareRule.containsId ?? null,
    lineageFileName: fareRule.lineage.fileName,
  }));
  await insertInBatches(data, (rows) =>
    transaction.gtfsFareRule.createMany({ data: rows }),
  );
}

function lineageFields(lineage: {
  fileName: string;
  rowNumber: number;
}): Readonly<{ lineageFileName: string; lineageRowNumber: number }> {
  return {
    lineageFileName: lineage.fileName,
    lineageRowNumber: lineage.rowNumber,
  };
}

async function insertInBatches<T>(
  rows: readonly T[],
  insert: (rows: T[]) => Promise<unknown>,
  batchSize = 5_000,
): Promise<void> {
  for (let start = 0; start < rows.length; start += batchSize) {
    await insert([...rows.slice(start, start + batchSize)]);
  }
}
