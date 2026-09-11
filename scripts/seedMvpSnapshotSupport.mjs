/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsSnapshot} GtfsSnapshot */
/** @typedef {import("../src/core/ingestion/gtfsTypes").GtfsValidationIssue} GtfsValidationIssue */
/** @typedef {import("../src/server/gtfs/gtfsSnapshotMapper").GtfsSnapshotRow} GtfsSnapshotRow */

/** @param {GtfsSnapshot} snapshot */
export function getSnapshotCounts(snapshot) {
  return {
    routes: snapshot.routes.length,
    trips: snapshot.trips.length,
    stopTimes: snapshot.stopTimes.length,
    frequencies: snapshot.frequencies.length,
    shapes: snapshot.shapes.length,
    stops: snapshot.stops.length,
  };
}

/** @param {GtfsSnapshotRow["validationIssues"][number]} issue @returns {GtfsValidationIssue} */
export function mapValidationIssue(issue) {
  return {
    code: issue.code,
    classification: issue.classification === "BLOCKER" ? "blocker" : "warning",
    message: issue.message,
    fileName: issue.fileName ?? undefined,
    rowNumber: issue.rowNumber ?? undefined,
    fieldName: issue.fieldName ?? undefined,
  };
}

/** @param {readonly string[]} left @param {readonly string[]} right */
export function sameStrings(left, right) {
  return sameRouteIds(left, right);
}

/** @param {readonly string[]} left @param {readonly string[]} right */
export function sameRouteIds(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    left.length === right.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

/** @param {readonly { issueIndex: number; code: string; classification: string; message: string; fileName: string | null; rowNumber: number | null; fieldName: string | null }[]} existing @param {readonly GtfsValidationIssue[]} expected */
export function sameValidationIssues(existing, expected) {
  return (
    existing.length === expected.length &&
    existing.every((issue, index) => {
      const expectedIssue = expected[index];
      return (
        expectedIssue !== undefined &&
        issue.issueIndex === index &&
        issue.code === expectedIssue.code &&
        issue.classification ===
          (expectedIssue.classification === "blocker"
            ? "BLOCKER"
            : "WARNING") &&
        issue.message === expectedIssue.message &&
        issue.fileName === (expectedIssue.fileName ?? null) &&
        issue.rowNumber === (expectedIssue.rowNumber ?? null) &&
        issue.fieldName === (expectedIssue.fieldName ?? null)
      );
    })
  );
}
