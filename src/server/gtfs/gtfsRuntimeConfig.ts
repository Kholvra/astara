import { basename, isAbsolute, resolve } from "node:path";

import type { FreshnessPolicy } from "~/core/ingestion/gtfsTypes";

const DEFAULT_IMPORT_DIRECTORY = ".gtfs-import";
const DEFAULT_STORAGE_DIRECTORY = ".gtfs-snapshots";
const DEFAULT_AGING_AFTER_HOURS = 24;
const DEFAULT_STALE_AFTER_HOURS = 72;
const DEFAULT_STALE_DEMO_NOTE =
  "Data jadwal bersifat statis untuk demo dan dapat berubah.";

export type GtfsRuntimeConfig = Readonly<{
  importToken: string | undefined;
  importDirectory: string;
  storageDirectory: string;
  serviceDate: string | undefined;
  approvedSourceHosts: readonly string[];
  freshnessPolicy: FreshnessPolicy;
}>;

export type GtfsRuntimeEnvironment = Readonly<
  Record<string, string | undefined>
>;

export class GtfsRuntimeConfigError extends Error {
  public readonly fieldName: string | undefined;

  public constructor(message: string, fieldName?: string) {
    super(message);
    this.name = "GtfsRuntimeConfigError";
    this.fieldName = fieldName;
  }
}

export function readGtfsRuntimeConfig(
  environment: GtfsRuntimeEnvironment = process.env,
): GtfsRuntimeConfig {
  const agingAfterHours = readNumber(
    environment.GTFS_AGING_AFTER_HOURS,
    DEFAULT_AGING_AFTER_HOURS,
    "GTFS_AGING_AFTER_HOURS",
  );
  const staleAfterHours = readNumber(
    environment.GTFS_STALE_AFTER_HOURS,
    DEFAULT_STALE_AFTER_HOURS,
    "GTFS_STALE_AFTER_HOURS",
  );
  if (staleAfterHours <= agingAfterHours) {
    throw new GtfsRuntimeConfigError(
      "GTFS stale threshold must be greater than the aging threshold.",
      "GTFS_STALE_AFTER_HOURS",
    );
  }

  const staleDemoNote = environment.GTFS_STALE_DEMO_NOTE?.trim() ?? "";
  return {
    importToken: environment.GTFS_IMPORT_TOKEN,
    importDirectory: resolve(
      process.cwd(),
      environment.GTFS_IMPORT_DIR ?? DEFAULT_IMPORT_DIRECTORY,
    ),
    storageDirectory: resolve(
      process.cwd(),
      environment.GTFS_SNAPSHOT_STORAGE_DIR ?? DEFAULT_STORAGE_DIRECTORY,
    ),
    serviceDate: environment.GTFS_SERVICE_DATE,
    approvedSourceHosts: readHosts(environment.GTFS_APPROVED_SOURCE_HOSTS),
    freshnessPolicy: {
      agingAfterHours,
      staleAfterHours,
      allowStaleDemo: readBoolean(environment.GTFS_ALLOW_STALE_DEMO, true),
      staleDemoNote:
        staleDemoNote.length > 0 ? staleDemoNote : DEFAULT_STALE_DEMO_NOTE,
    },
  };
}

export function requireGtfsImportConfiguration(
  config: GtfsRuntimeConfig,
): Readonly<{
  importToken: string;
  serviceDate: string;
  approvedSourceHosts: readonly string[];
}> {
  const importToken = requireGtfsImportToken(config);
  if (!config.serviceDate) {
    throw new GtfsRuntimeConfigError(
      "GTFS service date is not configured.",
      "GTFS_SERVICE_DATE",
    );
  }
  if (config.approvedSourceHosts.length === 0) {
    throw new GtfsRuntimeConfigError(
      "Approved GTFS source hosts are not configured.",
      "GTFS_APPROVED_SOURCE_HOSTS",
    );
  }
  return {
    importToken,
    serviceDate: config.serviceDate,
    approvedSourceHosts: config.approvedSourceHosts,
  };
}

export function requireGtfsImportToken(config: GtfsRuntimeConfig): string {
  if (!config.importToken) {
    throw new GtfsRuntimeConfigError(
      "GTFS import token is not configured.",
      "GTFS_IMPORT_TOKEN",
    );
  }
  return config.importToken;
}

export function resolveGtfsImportPath(
  importDirectory: string,
  archiveFileName: string,
): string {
  if (
    archiveFileName.length === 0 ||
    isAbsolute(archiveFileName) ||
    archiveFileName.includes("/") ||
    archiveFileName.includes("\\") ||
    basename(archiveFileName) !== archiveFileName ||
    !/\.zip$/i.test(archiveFileName)
  ) {
    throw new GtfsRuntimeConfigError(
      "GTFS archive must be a ZIP filename in the configured import directory.",
      "archiveFileName",
    );
  }
  return resolve(importDirectory, archiveFileName);
}

function readHosts(value: string | undefined): readonly string[] {
  return value
    ? value
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter((host) => host.length > 0)
    : [];
}

function readNumber(
  value: string | undefined,
  fallback: number,
  field: string,
): number {
  if (value === undefined) {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new GtfsRuntimeConfigError(
      `${field} must be a non-negative number.`,
      field,
    );
  }
  return number;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new GtfsRuntimeConfigError(
    "GTFS_ALLOW_STALE_DEMO must be true or false.",
    "GTFS_ALLOW_STALE_DEMO",
  );
}
