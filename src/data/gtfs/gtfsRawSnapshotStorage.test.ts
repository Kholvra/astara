import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  GtfsRawSnapshotStorageError,
  createFileGtfsRawSnapshotStorage,
} from "./gtfsRawSnapshotStorage";

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("createFileGtfsRawSnapshotStorage", () => {
  let rootDirectory: string;

  beforeEach(async () => {
    rootDirectory = await mkdtemp(join(tmpdir(), "astara-gtfs-storage-"));
  });

  afterEach(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });

  it("stores exact bytes under a content-addressed key and repeats idempotently", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const contentHash = hashBytes(bytes);
    const storage = createFileGtfsRawSnapshotStorage(rootDirectory);

    const firstKey = await storage.write(contentHash, bytes);
    const secondKey = await storage.write(contentHash, bytes);

    expect(firstKey).toBe(`${contentHash}.zip`);
    expect(secondKey).toBe(firstKey);
    expect(
      new Uint8Array(await readFile(join(rootDirectory, firstKey))),
    ).toEqual(bytes);
    expect(new Uint8Array(await storage.read(firstKey, contentHash))).toEqual(
      bytes,
    );
  });

  it("rejects a hash mismatch and a corrupt stored object", async () => {
    const bytes = new Uint8Array([5, 6, 7]);
    const contentHash = hashBytes(bytes);
    const storage = createFileGtfsRawSnapshotStorage(rootDirectory);

    await expect(storage.write("a".repeat(64), bytes)).rejects.toBeInstanceOf(
      GtfsRawSnapshotStorageError,
    );

    const key = `${contentHash}.zip`;
    await writeFile(join(rootDirectory, key), new Uint8Array([9]));

    await expect(storage.read(key, contentHash)).rejects.toBeInstanceOf(
      GtfsRawSnapshotStorageError,
    );
  });

  it("does not replace an object that appears between the existence check and link", async () => {
    const bytes = new Uint8Array([8, 9, 10]);
    const contentHash = hashBytes(bytes);
    const storage = createFileGtfsRawSnapshotStorage(rootDirectory, {
      link: async (_temporaryPath, destination) => {
        await writeFile(destination, bytes, { flag: "wx" });
        const error = Object.assign(new Error("already exists"), {
          code: "EEXIST",
        });
        throw error;
      },
    });

    await expect(storage.write(contentHash, bytes)).resolves.toBe(
      `${contentHash}.zip`,
    );
    expect(
      new Uint8Array(await storage.read(`${contentHash}.zip`, contentHash)),
    ).toEqual(bytes);
  });

  it("rejects storage keys that could escape the configured root", async () => {
    const storage = createFileGtfsRawSnapshotStorage(rootDirectory);

    await expect(
      storage.read("../outside.zip", "a".repeat(64)),
    ).rejects.toBeInstanceOf(GtfsRawSnapshotStorageError);
  });
});
