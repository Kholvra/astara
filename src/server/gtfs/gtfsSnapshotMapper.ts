import type { Prisma } from "../../../generated/prisma";

import type {
  GtfsAccessEvidenceAssociation,
  GtfsAgency,
  GtfsCalendar,
  GtfsCalendarDate,
  GtfsFareAttribute,
  GtfsFareRule,
  GtfsFrequency,
  GtfsRoute,
  GtfsShapePoint,
  GtfsSnapshot,
  GtfsSnapshotMetadata,
  GtfsStop,
  GtfsStopTime,
  GtfsTransfer,
  GtfsTrip,
} from "~/core/ingestion/gtfsTypes";

export const gtfsSnapshotInclude = {
  agencies: true,
  routes: true,
  stops: true,
  trips: true,
  stopTimes: true,
  calendars: true,
  calendarDates: true,
  frequencies: true,
  transfers: true,
  shapes: true,
  fareAttributes: true,
  fareRules: true,
  validationIssues: true,
  publicationDecisions: true,
  activePointer: true,
  accessEvidenceAssociations: true,
} satisfies Prisma.GtfsSnapshotInclude;

export type GtfsSnapshotRow = Prisma.GtfsSnapshotGetPayload<{
  include: typeof gtfsSnapshotInclude;
}>;

export function mapGtfsSnapshotRow(row: GtfsSnapshotRow): GtfsSnapshot {
  return {
    metadata: mapMetadata(row),
    serviceDate: row.serviceDate,
    coverage: row.coverage === "COMPLETE" ? "complete" : "limited",
    limitations: row.limitations,
    agencies: row.agencies.map(mapAgency),
    routes: row.routes.map(mapRoute),
    stops: row.stops.map(mapStop),
    trips: row.trips.map(mapTrip),
    stopTimes: row.stopTimes.map(mapStopTime),
    calendars: row.calendars.map(mapCalendar),
    calendarDates: row.calendarDates.map(mapCalendarDate),
    frequencies: row.frequencies.map(mapFrequency),
    transfers: row.transfers.map(mapTransfer),
    shapes: row.shapes.map(mapShape),
    fareAttributes: row.fareAttributes.map(mapFareAttribute),
    fareRules: row.fareRules.map(mapFareRule),
  };
}

export function mapAccessEvidenceAssociation(row: {
  evidenceVersionId: string;
  transitSnapshotId: string;
  recordedAt: Date;
}): GtfsAccessEvidenceAssociation {
  return {
    evidenceVersionId: row.evidenceVersionId,
    transitSnapshotId: row.transitSnapshotId,
    recordedAt: row.recordedAt.toISOString(),
  };
}

function mapMetadata(row: GtfsSnapshotRow): GtfsSnapshotMetadata {
  const metadata: {
    snapshotId: string;
    sourceUrl: string;
    acquiredAt: string;
    contentHash: string;
    httpMetadata?: {
      etag?: string;
      lastModified?: string;
    };
    feedVersion?: string;
  } = {
    snapshotId: row.snapshotId,
    sourceUrl: row.sourceUrl,
    acquiredAt: row.acquiredAt,
    contentHash: row.contentHash,
  };

  if (row.httpEtag !== null || row.httpLastModified !== null) {
    metadata.httpMetadata = {
      etag: row.httpEtag ?? undefined,
      lastModified: row.httpLastModified ?? undefined,
    };
  }
  if (row.feedVersion !== null) {
    metadata.feedVersion = row.feedVersion;
  }
  return metadata;
}

function mapAgency(row: GtfsSnapshotRow["agencies"][number]): GtfsAgency {
  return {
    id: row.agencyId,
    name: row.name,
    url: row.url,
    timezone: row.timezone,
    lineage: mapLineage(row),
  };
}

function mapRoute(row: GtfsSnapshotRow["routes"][number]): GtfsRoute {
  return {
    id: row.routeId,
    agencyId: row.agencyId,
    shortName: row.shortName,
    longName: row.longName,
    routeType: row.routeType,
    lineage: mapLineage(row),
  };
}

function mapStop(row: GtfsSnapshotRow["stops"][number]): GtfsStop {
  return {
    id: row.stopId,
    name: row.name,
    coordinate: [row.longitude, row.latitude],
    stopCode: row.stopCode ?? undefined,
    locationType: row.locationType ?? undefined,
    parentStationId: row.parentStationId ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapTrip(row: GtfsSnapshotRow["trips"][number]): GtfsTrip {
  return {
    id: row.tripId,
    routeId: row.routeId,
    serviceId: row.serviceId,
    headsign: row.headsign ?? undefined,
    directionId: row.directionId ?? undefined,
    shapeId: row.shapeId ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapStopTime(row: GtfsSnapshotRow["stopTimes"][number]): GtfsStopTime {
  return {
    tripId: row.tripId,
    stopId: row.stopId,
    stopSequence: row.stopSequence,
    arrivalTime: {
      raw: row.arrivalTimeRaw,
      secondsSinceServiceDayStart: row.arrivalTimeSeconds,
    },
    departureTime: {
      raw: row.departureTimeRaw,
      secondsSinceServiceDayStart: row.departureTimeSeconds,
    },
    timepoint: row.timepoint ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapCalendar(row: GtfsSnapshotRow["calendars"][number]): GtfsCalendar {
  return {
    serviceId: row.serviceId,
    weekdays: {
      monday: row.monday,
      tuesday: row.tuesday,
      wednesday: row.wednesday,
      thursday: row.thursday,
      friday: row.friday,
      saturday: row.saturday,
      sunday: row.sunday,
    },
    startDate: row.startDate,
    endDate: row.endDate,
    lineage: mapLineage(row),
  };
}

function mapCalendarDate(
  row: GtfsSnapshotRow["calendarDates"][number],
): GtfsCalendarDate {
  return {
    serviceId: row.serviceId,
    date: row.date,
    exceptionType: row.exceptionType === 1 ? 1 : 2,
    lineage: mapLineage(row),
  };
}

function mapFrequency(
  row: GtfsSnapshotRow["frequencies"][number],
): GtfsFrequency {
  return {
    tripId: row.tripId,
    startTime: {
      raw: row.startTimeRaw,
      secondsSinceServiceDayStart: row.startTimeSeconds,
    },
    endTime: {
      raw: row.endTimeRaw,
      secondsSinceServiceDayStart: row.endTimeSeconds,
    },
    headwaySeconds: row.headwaySeconds,
    timingSemantics: row.timingSemantics === "EXACT" ? "exact" : "interval",
    lineage: mapLineage(row),
  };
}

function mapTransfer(row: GtfsSnapshotRow["transfers"][number]): GtfsTransfer {
  return {
    fromStopId: row.fromStopId,
    toStopId: row.toStopId,
    transferType: row.transferType,
    minimumTransferTimeSeconds: row.minimumTransferTimeSeconds ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapShape(row: GtfsSnapshotRow["shapes"][number]): GtfsShapePoint {
  return {
    shapeId: row.shapeId,
    coordinate: [row.longitude, row.latitude],
    sequence: row.sequence,
    lineage: mapLineage(row),
  };
}

function mapFareAttribute(
  row: GtfsSnapshotRow["fareAttributes"][number],
): GtfsFareAttribute {
  return {
    fareId: row.fareId,
    price: row.price,
    currencyType: row.currencyType,
    paymentMethod: row.paymentMethod,
    transfers: row.transfers ?? undefined,
    agencyId: row.agencyId ?? undefined,
    transferDurationSeconds: row.transferDurationSeconds ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapFareRule(row: GtfsSnapshotRow["fareRules"][number]): GtfsFareRule {
  return {
    fareId: row.fareId,
    routeId: row.routeId ?? undefined,
    originId: row.originId ?? undefined,
    destinationId: row.destinationId ?? undefined,
    containsId: row.containsId ?? undefined,
    lineage: mapLineage(row),
  };
}

function mapLineage(row: {
  snapshotId: string;
  lineageFileName: string;
  lineageRowNumber: number;
}) {
  return {
    snapshotId: row.snapshotId,
    fileName: row.lineageFileName,
    rowNumber: row.lineageRowNumber,
  };
}
