export class GtfsSnapshotRepositoryError extends Error {
  public readonly cause: unknown;

  public constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GtfsSnapshotRepositoryError";
    this.cause = cause;
  }
}

export class GtfsSnapshotConflictError extends GtfsSnapshotRepositoryError {
  public constructor(message: string) {
    super(message);
    this.name = "GtfsSnapshotConflictError";
  }
}
