import { describe, expect, it, vi } from "vitest";

const createConfiguredService = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.GTFS_IMPORT_TOKEN = "route-test-token";
});

vi.mock("~/server/gtfs/gtfsImportComposition", () => ({
  createConfiguredGtfsImportService: createConfiguredService,
}));

import { POST } from "./route";

function createRequest(
  authorization: string | undefined,
  body: unknown,
): Request {
  return new Request("http://localhost/api/gtfs/recover", {
    method: "POST",
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gtfs/recover", () => {
  it("rejects an unauthorized request before creating the recovery service", async () => {
    const response = await POST(
      createRequest("Bearer wrong-token", { snapshotId: "snapshot-1" }),
    );

    expect(response.status).toBe(401);
    expect(createConfiguredService).not.toHaveBeenCalled();
  });

  it("rejects malformed recovery input without touching the service", async () => {
    const response = await POST(
      createRequest("Bearer route-test-token", { snapshotId: "../secret" }),
    );

    expect(response.status).toBe(400);
    expect(createConfiguredService).not.toHaveBeenCalled();
  });
});
