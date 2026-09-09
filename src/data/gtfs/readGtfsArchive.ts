import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { GtfsRawFiles } from "~/core/ingestion/gtfsTypes";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_MEMBERS = 256;
const DEFAULT_MAX_MEMBER_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 128 * 1024 * 1024;

export type ArchiveCommandRunner = (args: readonly string[]) => Promise<string>;
export type ArchiveByteReader = (archivePath: string) => Promise<Uint8Array>;

export type GtfsArchiveDependencies = Readonly<{
  runCommand?: ArchiveCommandRunner;
  readBytes?: ArchiveByteReader;
  maxMembers?: number;
  maxMemberBytes?: number;
  maxTotalBytes?: number;
}>;

export type GtfsArchive = Readonly<{
  files: GtfsRawFiles;
  memberNames: readonly string[];
  contentHash: string;
}>;

export class GtfsArchiveError extends Error {
  public readonly archivePath: string;
  public readonly memberName: string | undefined;
  public readonly cause: unknown;

  public constructor(
    message: string,
    archivePath: string,
    memberName?: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "GtfsArchiveError";
    this.archivePath = archivePath;
    this.memberName = memberName;
    this.cause = cause;
  }
}

export async function readGtfsArchive(
  archivePath: string,
  dependencies: GtfsArchiveDependencies = {},
): Promise<GtfsArchive> {
  if (archivePath.trim().length === 0) {
    throw new GtfsArchiveError("Archive path is required.", archivePath);
  }

  const limits = resolveLimits(dependencies, archivePath);
  const runCommand = dependencies.runCommand ?? defaultRunCommand;
  const readBytes = dependencies.readBytes ?? defaultReadBytes;
  const commandArchivePath = resolve(archivePath);
  const archiveBytes = await readArchiveBytes(readBytes, archivePath);
  const contentHash = createHash("sha256").update(archiveBytes).digest("hex");
  const memberNames = await listTextMembers(
    runCommand,
    commandArchivePath,
    limits.maxMembers,
  );
  const files: Record<string, string> = {};
  let totalBytes = 0;

  for (const memberName of memberNames) {
    const content = await readMember(
      runCommand,
      commandArchivePath,
      memberName,
    );
    const memberBytes = Buffer.byteLength(content, "utf8");
    if (memberBytes > limits.maxMemberBytes) {
      throw new GtfsArchiveError(
        `Archive member '${memberName}' exceeds the configured size limit.`,
        archivePath,
        memberName,
      );
    }

    totalBytes += memberBytes;
    if (totalBytes > limits.maxTotalBytes) {
      throw new GtfsArchiveError(
        "Archive text members exceed the configured total size limit.",
        archivePath,
      );
    }
    files[memberName] = content;
  }

  return { files, memberNames, contentHash };
}

async function listTextMembers(
  runCommand: ArchiveCommandRunner,
  archivePath: string,
  maxMembers: number,
): Promise<readonly string[]> {
  let listing: string;
  try {
    listing = await runCommand(["-Z1", archivePath]);
  } catch (error) {
    throw toArchiveError(
      "Could not list ZIP members.",
      archivePath,
      undefined,
      error,
    );
  }

  const names: string[] = [];
  const seenNames = new Set<string>();
  for (const rawName of listing.split(/\r?\n/)) {
    const name = rawName;
    if (name.length === 0 || name.endsWith("/")) {
      continue;
    }

    if (name !== name.trim()) {
      throw new GtfsArchiveError(
        `ZIP member name contains surrounding whitespace '${name}'.`,
        archivePath,
        name,
      );
    }

    if (!isSafeMemberName(name)) {
      throw new GtfsArchiveError(
        `Unsafe ZIP member path '${name}'.`,
        archivePath,
        name,
      );
    }

    if (!/\.txt$/i.test(name)) {
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new GtfsArchiveError(
        `Duplicate ZIP member '${name}'.`,
        archivePath,
        name,
      );
    }
    seenNames.add(normalizedName);
    names.push(name);
  }

  if (names.length > maxMembers) {
    throw new GtfsArchiveError(
      "ZIP contains too many text members.",
      archivePath,
    );
  }

  return names.sort((left, right) => left.localeCompare(right));
}

async function readMember(
  runCommand: ArchiveCommandRunner,
  archivePath: string,
  memberName: string,
): Promise<string> {
  try {
    return await runCommand(["-p", archivePath, memberName]);
  } catch (error) {
    throw toArchiveError(
      "Could not read ZIP member.",
      archivePath,
      memberName,
      error,
    );
  }
}

async function readArchiveBytes(
  readBytes: ArchiveByteReader,
  archivePath: string,
): Promise<Uint8Array> {
  try {
    return await readBytes(archivePath);
  } catch (error) {
    throw toArchiveError(
      "Could not read the ZIP archive.",
      archivePath,
      undefined,
      error,
    );
  }
}

function resolveLimits(
  dependencies: GtfsArchiveDependencies,
  archivePath: string,
): Readonly<{
  maxMembers: number;
  maxMemberBytes: number;
  maxTotalBytes: number;
}> {
  const maxMembers = dependencies.maxMembers ?? DEFAULT_MAX_MEMBERS;
  const maxMemberBytes =
    dependencies.maxMemberBytes ?? DEFAULT_MAX_MEMBER_BYTES;
  const maxTotalBytes = dependencies.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  if (
    !Number.isSafeInteger(maxMembers) ||
    maxMembers < 1 ||
    !Number.isSafeInteger(maxMemberBytes) ||
    maxMemberBytes < 1 ||
    !Number.isSafeInteger(maxTotalBytes) ||
    maxTotalBytes < maxMemberBytes
  ) {
    throw new GtfsArchiveError("Archive size limits are invalid.", archivePath);
  }
  return { maxMembers, maxMemberBytes, maxTotalBytes };
}

function isSafeMemberName(name: string): boolean {
  return (
    !name.startsWith("/") &&
    !name.startsWith("-") &&
    !name.includes("\\") &&
    !name.split("/").some((part) => part === ".." || part.length === 0) &&
    !name.includes("/")
  );
}

function toArchiveError(
  message: string,
  archivePath: string,
  memberName: string | undefined,
  cause: unknown,
): GtfsArchiveError {
  return new GtfsArchiveError(message, archivePath, memberName, cause);
}

async function defaultRunCommand(args: readonly string[]): Promise<string> {
  const result = await execFileAsync("unzip", [...args], {
    encoding: "utf8",
    maxBuffer: DEFAULT_MAX_MEMBER_BYTES,
  });
  return String(result.stdout);
}

async function defaultReadBytes(archivePath: string): Promise<Uint8Array> {
  return readFile(archivePath);
}
