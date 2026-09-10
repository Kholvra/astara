import { beforeEach, describe, expect, it, vi } from "vitest";

const createConfiguredService = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.GTFS_IMPORT_TOKEN = "route-test-token";
  process.env.GTFS_SERVICE_DATE = "2026-09-09";
  process.env.GTFS_APPROVED_SOURCE_HOSTS = "example.test";
});

vi.mock("~/server/gtfs/gtfsImportComposition", () => ({
  createConfiguredGtfsImportService: createConfiguredService,
}));

import { POST } from "./route";

function createRequest(
  authorization: string | undefined,
  body: unknown,
): Request {
  return new Request("http://localhost/api/gtfs/import", {
    method: "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  archiveFileName: "feed.zip",
  snapshotId: "snapshot-1",
  sourceUrl: "https://example.test/feed.zip",
  acquiredAt: "2026-09-09T00:00:00.000Z",
};

describe("POST /api/gtfs/import", () => {
  beforeEach(() => {
    createConfiguredService.mockReset();
  });

  it("rejects an unauthorized request before creating the import service", async () => {
    const response = await POST(createRequest("Bearer wrong-token", validBody));

    expect(response.status).toBe(401);
    expect(createConfiguredService).not.toHaveBeenCalled();
  });

  it("rejects traversal before creating the import service", async () => {
    const response = await POST(
      createRequest("Bearer route-test-token", {
        ...validBody,
        archiveFileName: "../feed.zip",
      }),
    );

    expect(response.status).toBe(400);
    expect(createConfiguredService).not.toHaveBeenCalled();
  });

  it("returns a safe import result for an authorized request", async () => {
    const importSnapshot = vi.fn(async () => ({
      snapshotId: "snapshot-1",
      contentHash: "a".repeat(64),
      rawStorageKey: `${"a".repeat(64)}.zip`,
      accepted: true,
      outcome: "published" as const,
      status: {
        networkAvailability: "available" as const,
        freshness: "current" as const,
        coverage: "limited" as const,
        evidenceState: "limited" as const,
        connectionState: "no-edge" as const,
        timingSemantics: "interval" as const,
        geometryState: "supported" as const,
        activeSnapshotId: "snapshot-1",
        limitations: [],
      },
      issues: [],
      limitations: [],
    }));
    createConfiguredService.mockReturnValue({
      importSnapshot,
      recoverSnapshot: vi.fn(),
    });

    const response = await POST(
      createRequest("Bearer route-test-token", validBody),
    );

    expect(response.status).toBe(200);
    expect(importSnapshot).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual(
      expect.objectContaining({ outcome: "published" }),
    );
  });
});
