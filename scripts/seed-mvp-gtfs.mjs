import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Prisma, PrismaClient } from "../generated/prisma/index.js";

import { createMvpSnapshot, MVP_PROFILE_VERSION } from "./gtfsMvpProfile.mjs";
import {
  getSnapshotCounts,
  mapValidationIssue,
  sameRouteIds,
  sameStrings,
  sameValidationIssues,
} from "./seedMvpSnapshotSupport.mjs";
import {
  gtfsSnapshotInclude,
  mapGtfsSnapshotRow,
} from "../src/server/gtfs/gtfsSnapshotMapper.ts";
import {
  writeNormalizedSnapshot,
  writeValidationIssues,
} from "../src/server/gtfs/gtfsSnapshotWriteRows.ts";

const ACTIVE_SLOT = 1;
const MVP_SNAPSHOT_PREFIX = `${MVP_PROFILE_VERSION}-`;
const TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 120_000,
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

/** @typedef {import("../generated/prisma/index.js").PrismaClient} Database */
/** @typedef {import("../generated/prisma/index.js").Prisma.TransactionClient} Transaction */
/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsSnapshot} GtfsSnapshot */
/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsValidationIssue} GtfsValidationIssue */
/** @typedef {import("../src/server/gtfs/gtfsSnapshotMapper").GtfsSnapshotRow} GtfsSnapshotRow */

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    await runCli();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown seed error.";
    console.error(`MVP GTFS seed failed: ${message}`);
    process.exitCode = 1;
  }
}

export async function runCli() {
  assertLocalEnvironment();
  const database = new PrismaClient({ log: ["error"] });
  try {
    const result = await seedMvpSnapshot(database);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await database.$disconnect();
  }
}

/** @param {Database} db @param {string} [now] */
export async function seedMvpSnapshot(db, now = new Date().toISOString()) {
  assertLocalEnvironment();
  const source = await readSourceSnapshot(db);
  const snapshot = createMvpSnapshot(source.domain);

  const outcome = await db.$transaction(async (transaction) => {
    await assertSourceStillCurrent(transaction, source);
    const existing = await readExistingMvpSnapshot(
      transaction,
      snapshot.metadata.snapshotId,
    );
    if (existing) {
      assertExistingMvpSnapshot(
        existing,
        snapshot,
        source.rawStorageKey,
        source.validationIssues,
      );
    } else {
      await writeSnapshot(
        transaction,
        snapshot,
        source.validationIssues,
        source.rawStorageKey,
        now,
      );
    }

    const currentPointer = await transaction.gtfsActiveSnapshot.findUnique({
      where: { slot: ACTIVE_SLOT },
      select: { snapshotId: true },
    });
    if (currentPointer?.snapshotId !== snapshot.metadata.snapshotId) {
      await activateSnapshot(transaction, snapshot.metadata.snapshotId, now);
      await writePublicationDecision(
        transaction,
        snapshot.metadata.snapshotId,
        now,
      );
    }

    return { idempotent: existing !== undefined };
  }, TRANSACTION_OPTIONS);

  return {
    profile: MVP_PROFILE_VERSION,
    sourceSnapshotId: source.domain.metadata.snapshotId,
    snapshotId: snapshot.metadata.snapshotId,
    active: true,
    idempotent: outcome.idempotent,
    counts: getSnapshotCounts(snapshot),
  };
}

/** @param {Database} db */
async function readSourceSnapshot(db) {
  const pointer = await db.gtfsActiveSnapshot.findUnique({
    where: { slot: ACTIVE_SLOT },
    select: { snapshotId: true },
  });
  if (!pointer) {
    throw new Error(
      "No active GTFS snapshot exists. Import the local feed first.",
    );
  }

  const sourceSnapshotId = pointer.snapshotId.startsWith(MVP_SNAPSHOT_PREFIX)
    ? pointer.snapshotId.slice(MVP_SNAPSHOT_PREFIX.length)
    : pointer.snapshotId;
  const row = await db.gtfsSnapshot.findUnique({
    where: { snapshotId: sourceSnapshotId },
    include: gtfsSnapshotInclude,
  });
  if (!row || row.validationState !== "ACCEPTED") {
    throw new Error(
      "The active GTFS snapshot is missing or failed validation.",
    );
  }

  return {
    domain: mapGtfsSnapshotRow(row),
    validationIssues: row.validationIssues.map(mapValidationIssue),
    activePointerSnapshotId: pointer.snapshotId,
    rawStorageKey: row.rawStorageKey,
  };
}

/**
 * @param {Transaction} transaction
 * @param {{ domain: GtfsSnapshot; activePointerSnapshotId: string; rawStorageKey: string }} source
 */
async function assertSourceStillCurrent(transaction, source) {
  const [pointer, sourceRow] = await Promise.all([
    transaction.gtfsActiveSnapshot.findUnique({
      where: { slot: ACTIVE_SLOT },
      select: { snapshotId: true },
    }),
    transaction.gtfsSnapshot.findUnique({
      where: { snapshotId: source.domain.metadata.snapshotId },
      select: { contentHash: true, validationState: true },
    }),
  ]);
  if (
    pointer?.snapshotId !== source.activePointerSnapshotId ||
    sourceRow?.contentHash !== source.domain.metadata.contentHash ||
    sourceRow?.validationState !== "ACCEPTED"
  ) {
    throw new Error(
      "The active GTFS snapshot changed while preparing the MVP profile. Retry after the feed settles.",
    );
  }
}

/** @param {Transaction} transaction @param {string} snapshotId */
async function readExistingMvpSnapshot(transaction, snapshotId) {
  const row = await transaction.gtfsSnapshot.findUnique({
    where: { snapshotId },
    select: {
      snapshotId: true,
      sourceUrl: true,
      acquiredAt: true,
      contentHash: true,
      httpEtag: true,
      httpLastModified: true,
      feedVersion: true,
      serviceDate: true,
      coverage: true,
      limitations: true,
      rawStorageKey: true,
      validationState: true,
      routes: { select: { routeId: true } },
      validationIssues: {
        orderBy: { issueIndex: "asc" },
        select: {
          issueIndex: true,
          code: true,
          classification: true,
          message: true,
          fileName: true,
          rowNumber: true,
          fieldName: true,
        },
      },
    },
  });
  if (!row) {
    return undefined;
  }

  const [
    agencies,
    stops,
    trips,
    stopTimes,
    calendars,
    calendarDates,
    frequencies,
    transfers,
    shapes,
    fareAttributes,
    fareRules,
  ] = await Promise.all([
    transaction.gtfsAgency.count({ where: { snapshotId } }),
    transaction.gtfsStop.count({ where: { snapshotId } }),
    transaction.gtfsTrip.count({ where: { snapshotId } }),
    transaction.gtfsStopTime.count({ where: { snapshotId } }),
    transaction.gtfsCalendar.count({ where: { snapshotId } }),
    transaction.gtfsCalendarDate.count({ where: { snapshotId } }),
    transaction.gtfsFrequency.count({ where: { snapshotId } }),
    transaction.gtfsTransfer.count({ where: { snapshotId } }),
    transaction.gtfsShapePoint.count({ where: { snapshotId } }),
    transaction.gtfsFareAttribute.count({ where: { snapshotId } }),
    transaction.gtfsFareRule.count({ where: { snapshotId } }),
  ]);
  return {
    ...row,
    counts: {
      agencies,
      routes: row.routes.length,
      stops,
      trips,
      stopTimes,
      calendars,
      calendarDates,
      frequencies,
      transfers,
      shapes,
      fareAttributes,
      fareRules,
      validationIssues: row.validationIssues.length,
    },
  };
}

/**
 * @param {Awaited<ReturnType<typeof readExistingMvpSnapshot>>} existing
 * @param {GtfsSnapshot} snapshot
 * @param {string} rawStorageKey
 * @param {readonly GtfsValidationIssue[]} validationIssues
 */
function assertExistingMvpSnapshot(
  existing,
  snapshot,
  rawStorageKey,
  validationIssues,
) {
  if (!existing) {
    return;
  }
  const expectedCounts = getSnapshotCounts(snapshot);
  const expected = {
    agencies: snapshot.agencies.length,
    ...expectedCounts,
    validationIssues: validationIssues.length,
  };
  const metadataMatches =
    existing.snapshotId === snapshot.metadata.snapshotId &&
    existing.sourceUrl === snapshot.metadata.sourceUrl &&
    existing.acquiredAt === snapshot.metadata.acquiredAt &&
    existing.contentHash === snapshot.metadata.contentHash &&
    existing.httpEtag === (snapshot.metadata.httpMetadata?.etag ?? null) &&
    existing.httpLastModified ===
      (snapshot.metadata.httpMetadata?.lastModified ?? null) &&
    existing.feedVersion === (snapshot.metadata.feedVersion ?? null) &&
    existing.serviceDate === snapshot.serviceDate &&
    existing.rawStorageKey === rawStorageKey &&
    existing.validationState === "ACCEPTED" &&
    existing.coverage ===
      (snapshot.coverage === "complete" ? "COMPLETE" : "LIMITED") &&
    sameStrings(existing.limitations, snapshot.limitations) &&
    sameRouteIds(
      existing.routes.map((route) => route.routeId),
      snapshot.routes.map((route) => route.id),
    );
  const countsMatch = Object.entries(expected).every(
    ([key, value]) => existing.counts[key] === value,
  );
  if (!metadataMatches || !countsMatch) {
    throw new Error(
      "The existing MVP snapshot is incomplete or has conflicting provenance. Remove it only through an approved recovery operation.",
    );
  }
  if (!sameValidationIssues(existing.validationIssues, validationIssues)) {
    throw new Error(
      "The existing MVP snapshot contains conflicting validation issues and requires manual inspection.",
    );
  }
}

/** @param {Transaction} transaction @param {GtfsSnapshot} snapshot @param {readonly GtfsValidationIssue[]} validationIssues @param {string} rawStorageKey @param {string} now */
async function writeSnapshot(
  transaction,
  snapshot,
  validationIssues,
  rawStorageKey,
  now,
) {
  await transaction.gtfsSnapshot.create({
    data: {
      snapshotId: snapshot.metadata.snapshotId,
      sourceUrl: snapshot.metadata.sourceUrl,
      acquiredAt: snapshot.metadata.acquiredAt,
      contentHash: snapshot.metadata.contentHash,
      httpEtag: snapshot.metadata.httpMetadata?.etag ?? null,
      httpLastModified: snapshot.metadata.httpMetadata?.lastModified ?? null,
      feedVersion: snapshot.metadata.feedVersion ?? null,
      serviceDate: snapshot.serviceDate,
      coverage: snapshot.coverage === "complete" ? "COMPLETE" : "LIMITED",
      limitations: [...snapshot.limitations],
      rawStorageKey,
      validationState: "ACCEPTED",
      validationCompletedAt: now,
    },
  });
  await writeValidationIssues(
    transaction,
    snapshot.metadata.snapshotId,
    validationIssues,
  );
  await writeNormalizedSnapshot(transaction, snapshot);
}

/** @param {Transaction} transaction @param {string} snapshotId @param {string} now */
async function activateSnapshot(transaction, snapshotId, now) {
  await transaction.gtfsActiveSnapshot.upsert({
    where: { slot: ACTIVE_SLOT },
    create: { slot: ACTIVE_SLOT, snapshotId, activatedAt: new Date(now) },
    update: { snapshotId, activatedAt: new Date(now) },
  });
}

/** @param {Transaction} transaction @param {string} snapshotId @param {string} now */
async function writePublicationDecision(transaction, snapshotId, now) {
  await transaction.gtfsPublicationDecision.create({
    data: {
      candidateSnapshotId: snapshotId,
      outcome: "PUBLISHED",
      activeSnapshotId: snapshotId,
      decidedAt: new Date(now),
      operatorReason:
        "Local MVP seed activated the reduced TransJakarta profile.",
    },
  });
}

export function assertLocalEnvironment() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "The MVP GTFS seed is allowed only when NODE_ENV=development.",
    );
  }
}
