import { parseGtfsTables, type ParsedGtfsTables } from "./gtfsRecordParsers";
import { validateGtfsRules, isBlockingIssue } from "./gtfsValidationRules";
import type {
  GtfsRawFiles,
  GtfsSnapshotMetadata,
  GtfsValidationConfig,
  GtfsValidationIssue,
} from "./gtfsTypes";

export type GtfsCandidateValidation = Readonly<{
  normalizedServiceDate: string | undefined;
  tables: ParsedGtfsTables;
}>;

export function validateGtfsCandidate(
  metadata: GtfsSnapshotMetadata,
  config: GtfsValidationConfig,
  files: GtfsRawFiles,
  issues: GtfsValidationIssue[],
  limitations: string[],
): GtfsCandidateValidation {
  const tables = parseGtfsTables(files, metadata, issues);
  const normalizedServiceDate = validateGtfsRules(
    metadata,
    config,
    tables,
    issues,
    limitations,
  );

  return { normalizedServiceDate, tables };
}

export { isBlockingIssue };
