import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  GtfsArchiveError,
  readGtfsArchive,
  type GtfsArchiveDependencies,
} from "./readGtfsArchive";

function createDependencies(
  memberOutput: Readonly<Record<string, string>>,
  calls: string[][],
): GtfsArchiveDependencies {
  return {
    runCommand: async (args) => {
      calls.push([...args]);
      const memberName = args[0] === "-p" ? args[2] : undefined;
      return memberName === undefined
        ? Object.keys(memberOutput).join("\n")
        : (memberOutput[memberName] ?? "");
    },
    readBytes: async () => new Uint8Array([1, 2, 3]),
  };
}

describe("readGtfsArchive", () => {
  it("reads text members with argument boundaries intact and computes the archive hash", async () => {
    const calls: string[][] = [];
    const archivePath = "/tmp/feed copy with spaces.zip";
    const archive = await readGtfsArchive(
      archivePath,
      createDependencies(
        { "agency.txt": "agency_id\nTije\n", "routes.txt": "route_id\nR1\n" },
        calls,
      ),
    );

    expect(archive.files).toEqual({
      "agency.txt": "agency_id\nTije\n",
      "routes.txt": "route_id\nR1\n",
    });
    expect(archive.archiveBytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(archive.memberNames).toEqual(["agency.txt", "routes.txt"]);
    expect(archive.contentHash).toBe(
      createHash("sha256")
        .update(new Uint8Array([1, 2, 3]))
        .digest("hex"),
    );
    expect(calls).toContainEqual(["-Z1", archivePath]);
    expect(calls).toContainEqual(["-p", archivePath, "agency.txt"]);
  });

  it("wraps archive command failures and never returns a partial file map", async () => {
    const dependencies: GtfsArchiveDependencies = {
      runCommand: async (args) => {
        if (args[0] === "-Z1") {
          return "agency.txt\nroutes.txt";
        }
        throw new Error("member read failed");
      },
      readBytes: async () => new Uint8Array([1]),
    };

    await expect(
      readGtfsArchive("feed.zip", dependencies),
    ).rejects.toBeInstanceOf(GtfsArchiveError);
  });

  it("rejects duplicate and unsafe text members before reading content", async () => {
    const unsafeDependencies: GtfsArchiveDependencies = {
      runCommand: async () => "agency.txt\n../routes.txt\nagency.txt",
      readBytes: async () => new Uint8Array([1]),
    };

    await expect(
      readGtfsArchive("feed.zip", unsafeDependencies),
    ).rejects.toMatchObject({
      name: "GtfsArchiveError",
    });
  });

  it("rejects surrounding whitespace in a ZIP member name", async () => {
    const dependencies: GtfsArchiveDependencies = {
      runCommand: async () => "agency.txt \n",
      readBytes: async () => new Uint8Array([1]),
    };

    await expect(
      readGtfsArchive("feed.zip", dependencies),
    ).rejects.toMatchObject({
      name: "GtfsArchiveError",
      memberName: "agency.txt ",
    });
  });

  it("rejects an oversized member response", async () => {
    const dependencies: GtfsArchiveDependencies = {
      runCommand: async () => "agency.txt\nlarge.txt",
      readBytes: async () => new Uint8Array([1]),
      maxMemberBytes: 4,
    };

    await expect(
      readGtfsArchive("feed.zip", dependencies),
    ).rejects.toBeInstanceOf(GtfsArchiveError);
  });

  it("rejects an oversized raw archive before listing members", async () => {
    let listed = false;
    const dependencies: GtfsArchiveDependencies = {
      runCommand: async () => {
        listed = true;
        return "agency.txt";
      },
      readBytes: async () => new Uint8Array([1, 2, 3]),
      maxArchiveBytes: 2,
    };

    await expect(
      readGtfsArchive("feed.zip", dependencies),
    ).rejects.toBeInstanceOf(GtfsArchiveError);
    expect(listed).toBe(false);
  });
});
