import { readGtfsArchive } from "~/data/gtfs/readGtfsArchive";
import { createFileGtfsRawSnapshotStorage } from "~/data/gtfs/gtfsRawSnapshotStorage";
import { db } from "~/server/db";

import {
  createGtfsImportService,
  type GtfsImportService,
} from "./gtfsImportService";
import { createGtfsSnapshotRepository } from "./gtfsSnapshotRepository";
import type { GtfsRuntimeConfig } from "./gtfsRuntimeConfig";

export function createConfiguredGtfsImportService(
  config: GtfsRuntimeConfig,
): GtfsImportService {
  return createGtfsImportService({
    readArchive: readGtfsArchive,
    storage: createFileGtfsRawSnapshotStorage(config.storageDirectory),
    repository: createGtfsSnapshotRepository(db),
  });
}
