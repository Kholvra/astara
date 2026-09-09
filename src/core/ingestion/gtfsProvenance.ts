import type {
  GtfsSnapshotMetadata,
  GtfsValidationConfig,
  GtfsValidationIssue,
} from "./gtfsTypes";

export function validateGtfsProvenance(
  metadata: GtfsSnapshotMetadata,
  config: GtfsValidationConfig,
  issues: GtfsValidationIssue[],
): void {
  if (!isNonEmptyString(metadata.snapshotId)) {
    addBlocker(issues, "Snapshot ID is required.", "snapshotId");
  }

  if (!isNonEmptyString(metadata.sourceUrl)) {
    addBlocker(issues, "Source URL is required.", "sourceUrl");
  }

  if (
    typeof metadata.acquiredAt !== "string" ||
    !Number.isFinite(Date.parse(metadata.acquiredAt))
  ) {
    addBlocker(
      issues,
      "Acquisition time must be a valid timestamp.",
      "acquiredAt",
    );
  }

  if (
    typeof metadata.contentHash !== "string" ||
    !/^[a-f\d]{64}$/i.test(metadata.contentHash)
  ) {
    addBlocker(
      issues,
      "Content hash must be a SHA-256 hexadecimal digest.",
      "contentHash",
    );
  }

  let sourceHost: string | undefined;
  if (typeof metadata.sourceUrl === "string") {
    try {
      const sourceUrl = new URL(metadata.sourceUrl);
      if (sourceUrl.protocol !== "https:") {
        addBlocker(issues, "GTFS source URL must use HTTPS.", "sourceUrl");
      }
      sourceHost = sourceUrl.hostname.toLowerCase();
    } catch {
      addBlocker(issues, "Source URL is invalid.", "sourceUrl");
    }
  }

  const approvedSourceHosts = Array.isArray(config.approvedSourceHosts)
    ? config.approvedSourceHosts.filter(
        (host): host is string =>
          typeof host === "string" && host.length > 0 && host === host.trim(),
      )
    : [];
  if (approvedSourceHosts.length === 0) {
    addBlocker(
      issues,
      "Approved source hosts must be configured.",
      "approvedSourceHosts",
    );
  } else if (
    !sourceHost ||
    !approvedSourceHosts.some((host) => host.toLowerCase() === sourceHost)
  ) {
    addBlocker(
      issues,
      "Source host is not in the approved GTFS source policy.",
      "sourceUrl",
    );
  }
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value === value.trim()
  );
}

function addBlocker(
  issues: GtfsValidationIssue[],
  message: string,
  fieldName: string,
): void {
  issues.push({
    code: "DATA-HARD-999",
    classification: "blocker",
    message,
    fieldName,
  });
}
