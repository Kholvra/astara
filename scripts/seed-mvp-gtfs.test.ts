import { describe, expect, it } from "vitest";

import { getSourceSnapshotId } from "./seed-mvp-gtfs.mjs";

describe("MVP seed source snapshot resolution", () => {
  it("unwraps any versioned profile ID to the terminal source ID", () => {
    expect(getSourceSnapshotId("tj-mvp-core-v1-tj-static-2026-09-10")).toBe(
      "tj-static-2026-09-10",
    );
    expect(getSourceSnapshotId("tj-mvp-core-v2-tj-static-2026-09-10")).toBe(
      "tj-static-2026-09-10",
    );
    expect(getSourceSnapshotId("tj-mvp-core-v17-source-with-hyphens")).toBe(
      "source-with-hyphens",
    );
  });

  it("unwraps nested profile IDs without treating a reduced snapshot as source", () => {
    expect(
      getSourceSnapshotId("tj-mvp-core-v2-tj-mvp-core-v1-tj-static-2026-09-10"),
    ).toBe("tj-static-2026-09-10");
  });

  it("preserves valid raw source IDs and rejects malformed profile IDs", () => {
    expect(getSourceSnapshotId("tj-static-2026-09-10")).toBe(
      "tj-static-2026-09-10",
    );

    for (const snapshotId of [
      "",
      " ",
      "tj-mvp-core-v0-source",
      "tj-mvp-core-v2-",
      "tj-mvp-core-vx-source",
      null,
      42,
    ]) {
      expect(() => getSourceSnapshotId(snapshotId as string)).toThrow(
        "active GTFS snapshot ID is missing or malformed",
      );
    }
  });
});
