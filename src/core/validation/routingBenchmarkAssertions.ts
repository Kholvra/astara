import {
  exactComparison,
  coordinatesMatch,
  failedComparison,
  hasContinuousLegs,
  hasValidExplanationLineage,
  passedComparison,
  sameValue,
  withinTolerance,
} from "./routingBenchmarkSupport";
import type {
  CandidateEvaluation,
  FactAssertion,
  FailureCategory,
  GeometryFacts,
  RouteFacts,
  RouteFactName,
  RouteExplanationFacts,
  RoutingBenchmarkFixture,
  RoutingFixtureTolerances,
  TimingFacts,
  WalkingFacts,
} from "./routingBenchmarkTypes";

export function evaluateAssertions(
  fixture: RoutingBenchmarkFixture,
  evaluation: CandidateEvaluation,
  replay: number,
): readonly FactAssertion[] {
  return fixture.mandatoryFacts.map((fact) => {
    const critical = fixture.criticalFacts.includes(fact);
    if (evaluation.state !== "answered") {
      return {
        caseId: fixture.id,
        replay,
        fact,
        critical,
        status: "unanswerable",
        category: "engine-limitation",
        message: `${evaluation.state}: ${evaluation.reason}`,
        expected: fixture.expectedFacts[fact],
      } satisfies FactAssertion;
    }

    const comparison = compareFact(
      fact,
      fixture.expectedFacts,
      evaluation.facts,
      fixture.tolerances,
    );
    return {
      caseId: fixture.id,
      replay,
      fact,
      critical,
      status: comparison.passed ? "passed" : "failed",
      ...(comparison.category ? { category: comparison.category } : {}),
      message: comparison.message,
      expected: comparison.passed ? undefined : fixture.expectedFacts[fact],
      actual: comparison.passed ? undefined : evaluation.facts[fact],
    } satisfies FactAssertion;
  });
}

function compareFact(
  fact: RouteFactName,
  expectedFacts: RouteFacts,
  actualFacts: RouteFacts,
  tolerances: RoutingFixtureTolerances,
): Readonly<{
  passed: boolean;
  message: string;
  category?: FailureCategory;
}> {
  switch (fact) {
    case "routeStatus":
      return exactComparison(
        expectedFacts.routeStatus,
        actualFacts.routeStatus,
        "route status",
        "data",
      );
    case "boardingAlighting":
      return exactComparison(
        expectedFacts.boardingAlighting,
        actualFacts.boardingAlighting,
        "boarding/alighting stop order",
        "data",
      );
    case "serviceDirection":
      return exactComparison(
        expectedFacts.serviceDirection,
        actualFacts.serviceDirection,
        "service identity and direction",
        "data",
      );
    case "transferCount":
      return exactComparison(
        expectedFacts.transferCount,
        actualFacts.transferCount,
        "transfer count",
        "transfer",
      );
    case "timing":
      return compareTiming(
        expectedFacts.timing,
        actualFacts.timing,
        tolerances,
      );
    case "walking":
      return compareWalking(
        expectedFacts.walking,
        actualFacts.walking,
        tolerances,
      );
    case "geometry":
      return compareGeometry(
        expectedFacts.geometry,
        actualFacts.geometry,
        tolerances,
      );
    case "explanation":
      return compareExplanation(
        expectedFacts,
        actualFacts,
        expectedFacts.explanation,
        actualFacts.explanation,
      );
    case "limitation":
      return exactComparison(
        expectedFacts.limitation,
        actualFacts.limitation,
        "limitation status",
        "limitation",
      );
  }
}

function compareTiming(
  expected: TimingFacts,
  actual: TimingFacts,
  tolerances: RoutingFixtureTolerances,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  if (expected.semantics !== actual.semantics) {
    return failedComparison("timing semantics", "time");
  }
  const tolerance = tolerances.timingSeconds ?? 0;
  if (expected.semantics === "exact" && actual.semantics === "exact") {
    if (
      !withinTolerance(
        expected.departure.secondsSinceServiceDayStart,
        actual.departure.secondsSinceServiceDayStart,
        tolerance,
      ) ||
      !withinTolerance(
        expected.arrival.secondsSinceServiceDayStart,
        actual.arrival.secondsSinceServiceDayStart,
        tolerance,
      )
    ) {
      return failedComparison("exact timing values", "time");
    }
    return passedComparison("exact timing matches");
  }
  if (expected.semantics === "interval" && actual.semantics === "interval") {
    if (
      !withinTolerance(
        expected.start.secondsSinceServiceDayStart,
        actual.start.secondsSinceServiceDayStart,
        tolerance,
      ) ||
      !withinTolerance(
        expected.end.secondsSinceServiceDayStart,
        actual.end.secondsSinceServiceDayStart,
        tolerance,
      ) ||
      expected.headwaySeconds !== actual.headwaySeconds
    ) {
      return failedComparison("frequency interval timing", "time");
    }
    return passedComparison("interval timing matches");
  }
  if (expected.semantics === "estimate" && actual.semantics === "estimate") {
    return compareOptionalTimes(expected, actual, tolerance);
  }
  return passedComparison("timing is unavailable as declared");
}

function compareOptionalTimes(
  expected: TimingFacts & { semantics: "estimate" },
  actual: TimingFacts & { semantics: "estimate" },
  tolerance: number,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  const expectedDeparture = expected.departure?.secondsSinceServiceDayStart;
  const actualDeparture = actual.departure?.secondsSinceServiceDayStart;
  const expectedArrival = expected.arrival?.secondsSinceServiceDayStart;
  const actualArrival = actual.arrival?.secondsSinceServiceDayStart;
  if (
    (expectedDeparture === undefined) !== (actualDeparture === undefined) ||
    (expectedArrival === undefined) !== (actualArrival === undefined) ||
    (expectedDeparture !== undefined &&
      actualDeparture !== undefined &&
      !withinTolerance(expectedDeparture, actualDeparture, tolerance)) ||
    (expectedArrival !== undefined &&
      actualArrival !== undefined &&
      !withinTolerance(expectedArrival, actualArrival, tolerance))
  ) {
    return failedComparison("estimated timing", "time");
  }
  return passedComparison("estimated timing matches");
}

function compareWalking(
  expected: WalkingFacts,
  actual: WalkingFacts,
  tolerances: RoutingFixtureTolerances,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  if (expected.label !== actual.label) {
    return failedComparison("walking evidence label", "limitation");
  }
  if (
    !withinTolerance(
      expected.totalDistanceMeters,
      actual.totalDistanceMeters,
      tolerances.walkingDistanceMeters ?? 0,
    ) ||
    expected.legs.length !== actual.legs.length
  ) {
    return failedComparison("walking distance or component count", "data");
  }
  for (let index = 0; index < expected.legs.length; index += 1) {
    const expectedLeg = expected.legs[index];
    const actualLeg = actual.legs[index];
    if (!expectedLeg || !actualLeg) {
      return failedComparison("walking component", "data");
    }
    if (
      expectedLeg.fromStopId !== actualLeg.fromStopId ||
      expectedLeg.toStopId !== actualLeg.toStopId ||
      expectedLeg.label !== actualLeg.label ||
      !withinTolerance(
        expectedLeg.distanceMeters,
        actualLeg.distanceMeters,
        tolerances.walkingDistanceMeters ?? 0,
      )
    ) {
      return failedComparison("walking component", "data");
    }
  }
  return passedComparison("walking facts match");
}

function compareGeometry(
  expected: GeometryFacts,
  actual: GeometryFacts,
  tolerances: RoutingFixtureTolerances,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  const tolerance = tolerances.coordinateDegrees ?? 0;
  if (
    expected.continuity !== actual.continuity ||
    expected.legs.length !== actual.legs.length
  ) {
    return failedComparison("geometry continuity or leg count", "geometry");
  }
  for (let index = 0; index < expected.legs.length; index += 1) {
    const expectedLeg = expected.legs[index];
    const actualLeg = actual.legs[index];
    if (!expectedLeg || !actualLeg) {
      return failedComparison("geometry leg", "geometry");
    }
    if (
      expectedLeg.fromStopId !== actualLeg.fromStopId ||
      expectedLeg.toStopId !== actualLeg.toStopId ||
      expectedLeg.coordinates.length !== actualLeg.coordinates.length
    ) {
      return failedComparison(
        "geometry leg endpoints or point count",
        "geometry",
      );
    }
    for (
      let pointIndex = 0;
      pointIndex < expectedLeg.coordinates.length;
      pointIndex += 1
    ) {
      const expectedPoint = expectedLeg.coordinates[pointIndex];
      const actualPoint = actualLeg.coordinates[pointIndex];
      if (
        !expectedPoint ||
        !actualPoint ||
        !coordinatesMatch(expectedPoint, actualPoint, tolerance)
      ) {
        return failedComparison(
          "geometry coordinate order or value",
          "geometry",
        );
      }
    }
  }
  if (
    expected.continuity === "continuous" &&
    !hasContinuousLegs(actual.legs, tolerance)
  ) {
    return failedComparison("geometry leg continuity", "geometry");
  }
  return passedComparison("geometry facts match");
}

function compareExplanation(
  expectedFacts: RouteFacts,
  actualFacts: RouteFacts,
  expected: RouteExplanationFacts,
  actual: RouteExplanationFacts,
): Readonly<{ passed: boolean; message: string; category?: FailureCategory }> {
  if (
    !hasValidExplanationLineage(actualFacts) ||
    !hasValidExplanationLineage(expectedFacts) ||
    !sameValue(expected.reasonCodes, actual.reasonCodes) ||
    !sameValue(expected.sourceFields, actual.sourceFields) ||
    !sameValue(expected.sourceValues, actual.sourceValues)
  ) {
    return failedComparison(
      "explanation lineage or reason fields",
      "explanation",
    );
  }
  return passedComparison("explanation can be reconstructed from route facts");
}
