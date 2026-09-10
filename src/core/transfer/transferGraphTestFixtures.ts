import type {
  GtfsRecordLineage,
  GtfsSnapshot,
  GtfsSnapshotMetadata,
  GtfsStop,
  GtfsTransfer,
} from "~/core/ingestion/gtfsTypes";

import type {
  TransferCostPolicy,
  TransferEdge,
  TransferEndpoint,
  TransferEvaluation,
  TransferWalkingEvidence,
  TransferWalkingPath,
} from "./transferTypes";

export const SNAPSHOT_ID = "snapshot-1";
export const ACQUIRED_AT = "2026-09-09T09:00:00.000Z";
export const COST_POLICY: TransferCostPolicy = {
  safetyBufferSeconds: 30,
  cognitiveDecisionCostSeconds: 45,
};
export const FROM_ENDPOINT: TransferEndpoint = { stopId: "from-stop" };
export const TO_ENDPOINT: TransferEndpoint = { stopId: "to-stop" };

export const VERIFIED_PATH: TransferWalkingPath = {
  pathId: "path-1",
  coordinates: [
    [106.82, -6.18],
    [106.821, -6.181],
  ],
  distanceMeters: 420,
  durationSeconds: 300,
};

export const VERIFIED_WALK: TransferWalkingEvidence = {
  source: "curated-osm-audit",
  evidenceDate: "2026-09-08",
  status: "verified",
  barrierState: "clear",
  path: VERIFIED_PATH,
};

export function expectEdge(result: TransferEvaluation): TransferEdge {
  if (result.kind !== "edge") {
    throw new Error(`Expected edge result, got ${result.error.code}.`);
  }
  return result.edge;
}

export function makeSnapshot(
  input: {
    stops?: readonly GtfsStop[];
    transfers?: readonly GtfsTransfer[];
    metadata?: Partial<GtfsSnapshotMetadata>;
  } = {},
): GtfsSnapshot {
  const metadata: GtfsSnapshotMetadata = {
    snapshotId: SNAPSHOT_ID,
    sourceUrl: "https://example.test/transjakarta.zip",
    acquiredAt: ACQUIRED_AT,
    contentHash: "hash-1",
    ...input.metadata,
  };

  return {
    metadata,
    serviceDate: "2026-09-10",
    coverage: "complete",
    limitations: [],
    agencies: [],
    routes: [],
    stops: input.stops ?? [makeStop("from-stop"), makeStop("to-stop")],
    trips: [],
    stopTimes: [],
    calendars: [],
    calendarDates: [],
    frequencies: [],
    transfers: input.transfers ?? [],
    shapes: [],
    fareAttributes: [],
    fareRules: [],
  };
}

export function makeStationStops(): readonly GtfsStop[] {
  return [
    makeStop("from-stop", { parentStationId: "station-1" }),
    makeStop("to-stop", { parentStationId: "station-1" }),
  ];
}

export function makeStop(
  id: string,
  overrides: Partial<Omit<GtfsStop, "id" | "lineage">> = {},
  lineageSnapshotId = SNAPSHOT_ID,
): GtfsStop {
  return {
    id,
    name: "Shared stop name",
    coordinate: [106.82, -6.18],
    lineage: makeLineage(
      "stops.txt",
      id === "from-stop" ? 1 : 2,
      lineageSnapshotId,
    ),
    ...overrides,
  };
}

export function makeTransfer(
  transferType = 0,
  rowNumber = 1,
  minimumTransferTimeSeconds?: number,
): GtfsTransfer {
  return {
    fromStopId: "from-stop",
    toStopId: "to-stop",
    transferType,
    minimumTransferTimeSeconds,
    lineage: makeLineage("transfers.txt", rowNumber),
  };
}

function makeLineage(
  fileName: string,
  rowNumber: number,
  snapshotId = SNAPSHOT_ID,
): GtfsRecordLineage {
  return { snapshotId, fileName, rowNumber };
}
