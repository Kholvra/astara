import { createHash } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type GtfsRawSnapshotStorage = Readonly<{
  write(contentHash: string, bytes: Uint8Array): Promise<string>;
  read(storageKey: string, expectedHash: string): Promise<Uint8Array>;
}>;

export type GtfsRawSnapshotStorageDependencies = Readonly<{
  mkdir?: (path: string) => Promise<void>;
  readFile?: (path: string) => Promise<Uint8Array>;
  link?: (source: string, destination: string) => Promise<void>;
  unlink?: (path: string) => Promise<void>;
  writeFile?: (
    path: string,
    data: Uint8Array,
    options: { flag: "wx" },
  ) => Promise<void>;
  randomId?: () => string;
}>;

export class GtfsRawSnapshotStorageError extends Error {
  public readonly storageKey: string | undefined;
  public readonly cause: unknown;

  public constructor(message: string, storageKey?: string, cause?: unknown) {
    super(message);
    this.name = "GtfsRawSnapshotStorageError";
    this.storageKey = storageKey;
    this.cause = cause;
  }
}

export function createFileGtfsRawSnapshotStorage(
  rootDirectory: string,
  dependencies: GtfsRawSnapshotStorageDependencies = {},
): GtfsRawSnapshotStorage {
  if (rootDirectory.trim().length === 0) {
    throw new GtfsRawSnapshotStorageError("Storage root is required.");
  }

  const rootPath = resolve(rootDirectory);
  const fileSystem = createFileSystem(dependencies);

  return {
    write: (contentHash, bytes) =>
      writeSnapshot(rootPath, contentHash, bytes, fileSystem),
    read: (storageKey, expectedHash) =>
      readSnapshot(rootPath, storageKey, expectedHash, fileSystem),
  };
}

type FileSystem = Readonly<{
  mkdir: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  link: (source: string, destination: string) => Promise<void>;
  unlink: (path: string) => Promise<void>;
  writeFile: (
    path: string,
    data: Uint8Array,
    options: { flag: "wx" },
  ) => Promise<void>;
  randomId: () => string;
}>;

function createFileSystem(
  dependencies: GtfsRawSnapshotStorageDependencies,
): FileSystem {
  return {
    mkdir:
      dependencies.mkdir ??
      (async (path) => {
        await mkdir(path, { recursive: true });
      }),
    readFile: dependencies.readFile ?? (async (path) => readFile(path)),
    link:
      dependencies.link ??
      (async (source, destination) => {
        await link(source, destination);
      }),
    unlink: dependencies.unlink ?? (async (path) => unlink(path)),
    writeFile:
      dependencies.writeFile ??
      (async (path, data, options) => {
        await writeFile(path, data, options);
      }),
    randomId: dependencies.randomId ?? randomUUID,
  };
}

async function writeSnapshot(
  rootPath: string,
  contentHash: string,
  bytes: Uint8Array,
  fileSystem: FileSystem,
): Promise<string> {
  validateHash(contentHash);
  if (hashBytes(bytes) !== contentHash) {
    throw new GtfsRawSnapshotStorageError(
      "Raw archive bytes do not match the supplied content hash.",
      `${contentHash}.zip`,
    );
  }

  const storageKey = `${contentHash}.zip`;
  const destination = resolveStoragePath(rootPath, storageKey);
  await ensureRoot(rootPath, fileSystem);

  if (
    await hasVerifiedExisting(destination, storageKey, contentHash, fileSystem)
  ) {
    return storageKey;
  }

  const temporaryPath = join(
    rootPath,
    `${storageKey}.${fileSystem.randomId()}.tmp`,
  );
  try {
    await fileSystem.writeFile(temporaryPath, bytes, { flag: "wx" });
    await fileSystem.link(temporaryPath, destination);
    return storageKey;
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      await assertVerifiedExisting(
        destination,
        storageKey,
        contentHash,
        fileSystem,
      );
      return storageKey;
    }

    throw new GtfsRawSnapshotStorageError(
      "Could not persist the raw GTFS archive.",
      storageKey,
      error,
    );
  } finally {
    await removeTemporaryFile(temporaryPath, fileSystem);
  }
}

async function readSnapshot(
  rootPath: string,
  storageKey: string,
  expectedHash: string,
  fileSystem: FileSystem,
): Promise<Uint8Array> {
  validateHash(expectedHash);
  if (storageKey !== `${expectedHash}.zip`) {
    throw new GtfsRawSnapshotStorageError(
      "Raw archive storage key does not match its expected hash.",
      storageKey,
    );
  }

  const path = resolveStoragePath(rootPath, storageKey);
  let bytes: Uint8Array;
  try {
    bytes = await fileSystem.readFile(path);
  } catch (error) {
    throw new GtfsRawSnapshotStorageError(
      "Could not read the stored raw GTFS archive.",
      storageKey,
      error,
    );
  }

  if (hashBytes(bytes) !== expectedHash) {
    throw new GtfsRawSnapshotStorageError(
      "Stored raw GTFS archive failed integrity verification.",
      storageKey,
    );
  }

  return bytes;
}

async function hasVerifiedExisting(
  path: string,
  storageKey: string,
  expectedHash: string,
  fileSystem: FileSystem,
): Promise<boolean> {
  try {
    await assertVerifiedExisting(path, storageKey, expectedHash, fileSystem);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

async function assertVerifiedExisting(
  path: string,
  storageKey: string,
  expectedHash: string,
  fileSystem: FileSystem,
): Promise<void> {
  let existingBytes: Uint8Array;
  try {
    existingBytes = await fileSystem.readFile(path);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw error;
    }
    throw new GtfsRawSnapshotStorageError(
      "Could not inspect the existing raw GTFS archive.",
      storageKey,
      error,
    );
  }

  if (hashBytes(existingBytes) !== expectedHash) {
    throw new GtfsRawSnapshotStorageError(
      "Existing raw GTFS archive failed integrity verification.",
      storageKey,
    );
  }
}

async function ensureRoot(
  rootPath: string,
  fileSystem: FileSystem,
): Promise<void> {
  try {
    await fileSystem.mkdir(rootPath);
  } catch (error) {
    throw new GtfsRawSnapshotStorageError(
      "Could not prepare raw GTFS storage.",
      undefined,
      error,
    );
  }
}

function resolveStoragePath(rootPath: string, storageKey: string): string {
  if (!/^[a-f0-9]{64}\.zip$/.test(storageKey)) {
    throw new GtfsRawSnapshotStorageError(
      "Raw archive storage key is invalid.",
      storageKey,
    );
  }

  const path = resolve(rootPath, storageKey);
  const pathFromRoot = relative(rootPath, path);
  if (pathFromRoot.startsWith("..") || pathFromRoot.includes("/")) {
    throw new GtfsRawSnapshotStorageError(
      "Raw archive storage key escapes the configured root.",
      storageKey,
    );
  }
  return path;
}

function validateHash(contentHash: string): void {
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    throw new GtfsRawSnapshotStorageError(
      "Raw archive content hash must be a lowercase SHA-256 value.",
      contentHash,
    );
  }
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function removeTemporaryFile(
  path: string,
  fileSystem: FileSystem,
): Promise<void> {
  try {
    await fileSystem.unlink(path);
  } catch (error) {
    if (!isNotFoundError(error)) {
      return;
    }
  }
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isNotFoundError(error: unknown): boolean {
  return isNodeError(error, "ENOENT");
}

function isAlreadyExistsError(error: unknown): boolean {
  return isNodeError(error, "EEXIST");
}
