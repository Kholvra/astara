import { describe, expect, it } from "vitest";

import {
  GtfsRuntimeConfigError,
  readGtfsRuntimeConfig,
  requireGtfsImportConfiguration,
  resolveGtfsImportPath,
} from "./gtfsRuntimeConfig";

describe("readGtfsRuntimeConfig", () => {
  it("parses configured paths, source hosts, and freshness policy", () => {
    const config = readGtfsRuntimeConfig({
      GTFS_IMPORT_TOKEN: "secret",
      GTFS_IMPORT_DIR: "/srv/astara/imports",
      GTFS_SNAPSHOT_STORAGE_DIR: "/srv/astara/snapshots",
      GTFS_SERVICE_DATE: "2026-09-09",
      GTFS_APPROVED_SOURCE_HOSTS: "PPID.TransJakarta.co.id, example.test ",
      GTFS_AGING_AFTER_HOURS: "12",
      GTFS_STALE_AFTER_HOURS: "48",
      GTFS_ALLOW_STALE_DEMO: "false",
      GTFS_STALE_DEMO_NOTE: "Static demo data.",
    });

    expect(config).toEqual({
      importToken: "secret",
      importDirectory: "/srv/astara/imports",
      storageDirectory: "/srv/astara/snapshots",
      serviceDate: "2026-09-09",
      approvedSourceHosts: ["ppid.transjakarta.co.id", "example.test"],
      freshnessPolicy: {
        agingAfterHours: 12,
        staleAfterHours: 48,
        allowStaleDemo: false,
        staleDemoNote: "Static demo data.",
      },
    });
    expect(requireGtfsImportConfiguration(config).serviceDate).toBe(
      "2026-09-09",
    );
  });

  it("rejects invalid freshness configuration and missing import prerequisites", () => {
    expect(() =>
      readGtfsRuntimeConfig({
        GTFS_AGING_AFTER_HOURS: "72",
        GTFS_STALE_AFTER_HOURS: "24",
      }),
    ).toThrow(GtfsRuntimeConfigError);
    expect(() =>
      requireGtfsImportConfiguration(readGtfsRuntimeConfig({})),
    ).toThrow(GtfsRuntimeConfigError);
  });
});

describe("resolveGtfsImportPath", () => {
  it("accepts only a root-scoped ZIP filename", () => {
    expect(resolveGtfsImportPath("/srv/imports", "feed.zip")).toBe(
      "/srv/imports/feed.zip",
    );
  });

  it("rejects traversal, absolute, separator, and non-ZIP inputs", () => {
    for (const name of [
      "../feed.zip",
      "/tmp/feed.zip",
      "nested/feed.zip",
      "nested\\feed.zip",
      "feed.csv",
    ]) {
      expect(() => resolveGtfsImportPath("/srv/imports", name)).toThrow(
        GtfsRuntimeConfigError,
      );
    }
  });
});
