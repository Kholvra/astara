import { NextResponse } from "next/server";
import { z } from "zod";

import { GtfsImportServiceError } from "~/server/gtfs/gtfsImportService";
import { createConfiguredGtfsImportService } from "~/server/gtfs/gtfsImportComposition";
import {
  GtfsSnapshotConflictError,
  GtfsSnapshotRepositoryError,
} from "~/server/gtfs/gtfsSnapshotRepository";
import {
  GtfsRuntimeConfigError,
  readGtfsRuntimeConfig,
  requireGtfsImportToken,
} from "~/server/gtfs/gtfsRuntimeConfig";
import { isGtfsOperatorAuthorized } from "~/server/gtfs/gtfsOperatorAuth";

export const runtime = "nodejs";

const recoveryInputSchema = z.object({
  snapshotId: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/)
    .max(160),
});

export async function POST(request: Request): Promise<Response> {
  let config: ReturnType<typeof readGtfsRuntimeConfig>;
  try {
    config = readGtfsRuntimeConfig();
    const token = requireGtfsImportToken(config);
    if (!isGtfsOperatorAuthorized(request, token)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } catch (error) {
    return mapRecoveryError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid GTFS recovery request." },
      { status: 400 },
    );
  }
  const parsed = recoveryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid GTFS recovery request." },
      { status: 400 },
    );
  }

  try {
    const service = createConfiguredGtfsImportService(config);
    const result = await service.recoverSnapshot(
      parsed.data.snapshotId,
      config.freshnessPolicy,
    );
    return NextResponse.json(result, {
      status: result.outcome === "published" ? 200 : 503,
    });
  } catch (error) {
    return mapRecoveryError(error);
  }
}

function mapRecoveryError(error: unknown): Response {
  if (error instanceof GtfsRuntimeConfigError) {
    return NextResponse.json(
      { error: "GTFS recovery is not configured on this server." },
      { status: 503 },
    );
  }
  if (error instanceof GtfsSnapshotConflictError) {
    return NextResponse.json(
      {
        error: "The stored snapshot association conflicts with existing data.",
      },
      { status: 409 },
    );
  }
  if (error instanceof GtfsImportServiceError) {
    return NextResponse.json(
      { error: "The requested GTFS snapshot could not be recovered." },
      { status: 404 },
    );
  }
  if (error instanceof GtfsSnapshotRepositoryError) {
    return NextResponse.json(
      { error: "The stored GTFS snapshot could not be activated." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: "The stored GTFS snapshot could not be recovered." },
    { status: 500 },
  );
}
