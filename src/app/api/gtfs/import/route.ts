import { NextResponse } from "next/server";
import { z } from "zod";

import { GtfsArchiveError } from "~/data/gtfs/readGtfsArchive";
import { GtfsImportServiceError } from "~/server/gtfs/gtfsImportService";
import { createConfiguredGtfsImportService } from "~/server/gtfs/gtfsImportComposition";
import {
  GtfsSnapshotConflictError,
  GtfsSnapshotRepositoryError,
} from "~/server/gtfs/gtfsSnapshotRepository";
import {
  GtfsRuntimeConfigError,
  readGtfsRuntimeConfig,
  requireGtfsImportConfiguration,
  requireGtfsImportToken,
  resolveGtfsImportPath,
} from "~/server/gtfs/gtfsRuntimeConfig";
import { isGtfsOperatorAuthorized } from "~/server/gtfs/gtfsOperatorAuth";

export const runtime = "nodejs";

const importInputSchema = z.object({
  archiveFileName: z.string().min(1).max(255),
  snapshotId: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/)
    .max(160),
  sourceUrl: z.string().url(),
  acquiredAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), {
    message: "acquiredAt must be a valid timestamp",
  }),
  httpEtag: z.string().max(500).optional(),
  httpLastModified: z.string().max(500).optional(),
  feedVersion: z.string().max(500).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let config: ReturnType<typeof readGtfsRuntimeConfig>;
  try {
    config = readGtfsRuntimeConfig();
    const token = requireGtfsImportToken(config);
    if (!isGtfsOperatorAuthorized(request, token)) {
      return jsonError("Unauthorized.", 401);
    }
  } catch (error) {
    return mapRouteError(error);
  }

  const parsedBody = await parseBody(request);
  if (!parsedBody.success) {
    return jsonError("Invalid GTFS import request.", 400);
  }

  return runImport(config, parsedBody.data);
}

async function runImport(
  config: ReturnType<typeof readGtfsRuntimeConfig>,
  input: z.infer<typeof importInputSchema>,
): Promise<Response> {
  try {
    const importConfig = requireGtfsImportConfiguration(config);
    const archivePath = resolveGtfsImportPath(
      config.importDirectory,
      input.archiveFileName,
    );
    const service = createConfiguredGtfsImportService(config);
    const result = await service.importSnapshot({
      archivePath,
      metadata: {
        snapshotId: input.snapshotId,
        sourceUrl: input.sourceUrl,
        acquiredAt: input.acquiredAt,
        ...(input.httpEtag || input.httpLastModified
          ? {
              httpMetadata: {
                etag: input.httpEtag,
                lastModified: input.httpLastModified,
              },
            }
          : {}),
        ...(input.feedVersion ? { feedVersion: input.feedVersion } : {}),
      },
      validationConfig: {
        serviceDate: importConfig.serviceDate,
        approvedSourceHosts: importConfig.approvedSourceHosts,
      },
      policy: config.freshnessPolicy,
    });
    return NextResponse.json(result, {
      status:
        result.outcome === "published"
          ? 200
          : result.outcome === "fallback"
            ? 422
            : 503,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

async function parseBody(
  request: Request,
): Promise<z.SafeParseReturnType<unknown, z.infer<typeof importInputSchema>>> {
  try {
    return importInputSchema.safeParse(await request.json());
  } catch {
    return { success: false, error: new z.ZodError([]) };
  }
}

function mapRouteError(error: unknown): Response {
  if (error instanceof GtfsRuntimeConfigError) {
    if (error.fieldName === "archiveFileName") {
      return jsonError("Invalid GTFS archive filename.", 400);
    }
    return jsonError("GTFS import is not configured on this server.", 503);
  }
  if (error instanceof GtfsSnapshotConflictError) {
    return jsonError(
      "This snapshot ID is already linked to different data.",
      409,
    );
  }
  if (error instanceof GtfsArchiveError) {
    return jsonError(
      "The GTFS ZIP could not be read. Check the file and retry.",
      422,
    );
  }
  if (error instanceof GtfsImportServiceError) {
    return jsonError(
      "The GTFS import could not be completed. Retry the same snapshot ID.",
      500,
    );
  }
  if (error instanceof GtfsSnapshotRepositoryError) {
    return jsonError(
      "The GTFS data could not be saved. Retry the same snapshot ID.",
      500,
    );
  }
  return jsonError("The GTFS import could not be completed.", 500);
}

function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}
