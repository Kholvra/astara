import { validateGtfsCandidate, isBlockingIssue } from "./gtfsValidation";
import type {
  GtfsRawFiles,
  GtfsSnapshot,
  GtfsSnapshotMetadata,
  GtfsValidationIssue,
  GtfsValidationConfig,
  GtfsValidationResult,
} from "./gtfsTypes";

export type GtfsNormalizationInput = Readonly<{
  files: GtfsRawFiles;
  metadata: GtfsSnapshotMetadata;
  config: GtfsValidationConfig;
}>;

export function normalizeGtfsFiles(
  input: GtfsNormalizationInput,
): GtfsValidationResult {
  const issues: GtfsValidationIssue[] = [];
  const limitations: string[] = [];
  const validation = validateGtfsCandidate(
    input.metadata,
    input.config,
    input.files,
    issues,
    limitations,
  );
  const accepted = !issues.some(isBlockingIssue);
  const snapshot = accepted
    ? buildSnapshot(
        input.metadata,
        validation.normalizedServiceDate ?? input.config.serviceDate,
        validation.tables,
        limitations,
      )
    : undefined;

  return {
    candidateSnapshotId: input.metadata.snapshotId,
    accepted,
    snapshot,
    issues,
    limitations,
  };
}

function buildSnapshot(
  metadata: GtfsSnapshotMetadata,
  serviceDate: string,
  tables: ReturnType<typeof validateGtfsCandidate>["tables"],
  limitations: readonly string[],
): GtfsSnapshot {
  return {
    metadata,
    serviceDate,
    coverage: limitations.length === 0 ? "complete" : "limited",
    limitations,
    agencies: tables.agencies,
    routes: tables.routes,
    stops: tables.stops,
    trips: tables.trips,
    stopTimes: tables.stopTimes,
    calendars: tables.calendars,
    calendarDates: tables.calendarDates,
    frequencies: tables.frequencies,
    transfers: tables.transfers,
    shapes: tables.shapes,
    fareAttributes: tables.fareAttributes,
    fareRules: tables.fareRules,
  };
}
