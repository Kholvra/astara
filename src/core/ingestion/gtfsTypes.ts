import type { GeoCoordinate } from "~/core/geojson/geometry";

import type { GtfsTime } from "./gtfsTime";

export const GTFS_REQUIRED_FILES = [
  "agency.txt",
  "routes.txt",
  "stops.txt",
  "trips.txt",
  "stop_times.txt",
] as const;

export const GTFS_ACCEPTED_WARNING_CODES = [
  "DATA-WARN-001",
  "DATA-WARN-002",
  "DATA-WARN-003",
  "DATA-WARN-004",
] as const;

export type GtfsKnownIssueCode =
  | "DATA-HARD-001"
  | "DATA-HARD-002"
  | "DATA-HARD-003"
  | "DATA-HARD-004"
  | "DATA-HARD-005"
  | "DATA-HARD-999"
  | (typeof GTFS_ACCEPTED_WARNING_CODES)[number];

export type GtfsRawFiles = Readonly<Record<string, string>>;

export type GtfsSnapshotMetadata = Readonly<{
  snapshotId: string;
  sourceUrl: string;
  acquiredAt: string;
  contentHash: string;
  httpMetadata?: Readonly<{
    etag?: string;
    lastModified?: string;
  }>;
  feedVersion?: string;
}>;

export type GtfsValidationConfig = Readonly<{
  serviceDate: string;
  approvedSourceHosts: readonly string[];
}>;

export type GtfsIssueClassification = "blocker" | "warning";

export type GtfsValidationIssue = Readonly<{
  code: string;
  classification: GtfsIssueClassification;
  message: string;
  fileName?: string;
  rowNumber?: number;
  fieldName?: string;
}>;

export type GtfsRecordLineage = Readonly<{
  snapshotId: string;
  fileName: string;
  rowNumber: number;
}>;

export type GtfsAgency = Readonly<{
  id: string;
  name: string;
  url: string;
  timezone: string;
  lineage: GtfsRecordLineage;
}>;

export type GtfsRoute = Readonly<{
  id: string;
  agencyId: string;
  shortName: string;
  longName: string;
  routeType: number;
  lineage: GtfsRecordLineage;
}>;

export type GtfsStop = Readonly<{
  id: string;
  name: string;
  coordinate: GeoCoordinate;
  stopCode?: string;
  locationType?: number;
  parentStationId?: string;
  lineage: GtfsRecordLineage;
}>;

export type GtfsTrip = Readonly<{
  id: string;
  routeId: string;
  serviceId: string;
  headsign?: string;
  directionId?: number;
  shapeId?: string;
  lineage: GtfsRecordLineage;
}>;

export type GtfsStopTime = Readonly<{
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: GtfsTime;
  departureTime: GtfsTime;
  timepoint?: number;
  lineage: GtfsRecordLineage;
}>;

export type GtfsWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type GtfsCalendar = Readonly<{
  serviceId: string;
  weekdays: Readonly<Record<GtfsWeekday, boolean>>;
  startDate: string;
  endDate: string;
  lineage: GtfsRecordLineage;
}>;

export type GtfsCalendarDate = Readonly<{
  serviceId: string;
  date: string;
  exceptionType: 1 | 2;
  lineage: GtfsRecordLineage;
}>;

export type GtfsFrequency = Readonly<{
  tripId: string;
  startTime: GtfsTime;
  endTime: GtfsTime;
  headwaySeconds: number;
  timingSemantics: "exact" | "interval";
  lineage: GtfsRecordLineage;
}>;

export type GtfsTransfer = Readonly<{
  fromStopId: string;
  toStopId: string;
  transferType: number;
  minimumTransferTimeSeconds?: number;
  lineage: GtfsRecordLineage;
}>;

export type GtfsShapePoint = Readonly<{
  shapeId: string;
  coordinate: GeoCoordinate;
  sequence: number;
  lineage: GtfsRecordLineage;
}>;

export type GtfsFareAttribute = Readonly<{
  fareId: string;
  price: number;
  currencyType: string;
  paymentMethod: number;
  transfers?: number;
  agencyId?: string;
  transferDurationSeconds?: number;
  lineage: GtfsRecordLineage;
}>;

export type GtfsFareRule = Readonly<{
  fareId: string;
  routeId?: string;
  originId?: string;
  destinationId?: string;
  containsId?: string;
  lineage: GtfsRecordLineage;
}>;

export type GtfsCoverage = "complete" | "limited" | "unknown";

export type GtfsSnapshot = Readonly<{
  metadata: GtfsSnapshotMetadata;
  serviceDate: string;
  coverage: Exclude<GtfsCoverage, "unknown">;
  limitations: readonly string[];
  agencies: readonly GtfsAgency[];
  routes: readonly GtfsRoute[];
  stops: readonly GtfsStop[];
  trips: readonly GtfsTrip[];
  stopTimes: readonly GtfsStopTime[];
  calendars: readonly GtfsCalendar[];
  calendarDates: readonly GtfsCalendarDate[];
  frequencies: readonly GtfsFrequency[];
  transfers: readonly GtfsTransfer[];
  shapes: readonly GtfsShapePoint[];
  fareAttributes: readonly GtfsFareAttribute[];
  fareRules: readonly GtfsFareRule[];
}>;

export type GtfsValidationResult = Readonly<{
  candidateSnapshotId: string;
  accepted: boolean;
  snapshot?: GtfsSnapshot;
  issues: readonly GtfsValidationIssue[];
  limitations: readonly string[];
}>;

export type NetworkAvailability = "available" | "unavailable";
export type Freshness = "current" | "aging" | "stale" | "unknown";
export type EvidenceState =
  "Terverifikasi" | "limited" | "Perlu dicek" | "Unknown";
export type ConnectionState = "routable" | "no-edge" | "review-only";
export type GeometryState = "supported" | "limited" | "unknown" | "unavailable";

export type GtfsConsumerStatus = Readonly<{
  networkAvailability: NetworkAvailability;
  freshness: Freshness;
  coverage: GtfsCoverage;
  evidenceState: EvidenceState;
  connectionState: ConnectionState;
  timingSemantics: "exact" | "interval" | "estimate" | "unavailable";
  geometryState: GeometryState;
  activeSnapshotId?: string;
  limitations: readonly string[];
  staticDemoNote?: string;
  operatorReason?: string;
}>;

export type FreshnessPolicy = Readonly<{
  agingAfterHours: number;
  staleAfterHours: number;
  allowStaleDemo: boolean;
  staleDemoNote: string;
}>;

export type PublicationDecision = Readonly<{
  outcome: "published" | "fallback" | "unavailable";
  activeSnapshot?: GtfsSnapshot;
  rejectedCandidateId?: string;
  rejectionIssues: readonly GtfsValidationIssue[];
  status: GtfsConsumerStatus;
}>;

export function isAcceptedWarningCode(code: string): boolean {
  return (GTFS_ACCEPTED_WARNING_CODES as readonly string[]).includes(code);
}
