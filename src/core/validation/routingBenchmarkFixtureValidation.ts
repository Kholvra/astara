import { isGeoCoordinate } from "~/core/geojson/geometry";

import {
  ROUTING_CASE_CATEGORIES,
  ROUTING_FACT_NAMES,
  RoutingBenchmarkInputError,
  type RouteFactName,
  type RoutingBenchmarkFixture,
  type RoutingCaseCategory,
  type RoutingFixtureTolerances,
  type RoutingLocation,
} from "./routingBenchmarkTypes";
import { parseRouteFacts } from "./routingBenchmarkFactParsing";
import {
  asRecord,
  isFiniteNumber,
  requiredString,
} from "./routingBenchmarkSupport";

export function parseFixture(
  value: unknown,
  path: string,
): RoutingBenchmarkFixture {
  const input = asRecord(value, path);
  const id = requiredString(input.id, `${path}.id`);
  const origin = parseLocation(input.origin, `${path}.origin`);
  const destination = parseLocation(input.destination, `${path}.destination`);
  const localDateTime = requiredString(
    input.localDateTime,
    `${path}.localDateTime`,
  );
  if (!Number.isFinite(Date.parse(localDateTime))) {
    throw new RoutingBenchmarkInputError([
      `${path}.localDateTime must be an ISO date-time`,
    ]);
  }
  const riskCategories = parseCategories(
    input.riskCategories,
    `${path}.riskCategories`,
  );
  const rationale = requiredString(input.rationale, `${path}.rationale`);
  const approval = parseApproval(input.approval, `${path}.approval`);
  const expectedFacts = parseRouteFacts(
    input.expectedFacts,
    `${path}.expectedFacts`,
  );
  const mandatoryFacts = parseFactNames(
    input.mandatoryFacts,
    `${path}.mandatoryFacts`,
  );
  const criticalFacts = parseFactNames(
    input.criticalFacts,
    `${path}.criticalFacts`,
  );
  const isDemoCase = input.isDemoCase;
  if (typeof isDemoCase !== "boolean") {
    throw new RoutingBenchmarkInputError([
      `${path}.isDemoCase must be boolean`,
    ]);
  }
  const tolerances = parseTolerances(input.tolerances, `${path}.tolerances`);
  if (mandatoryFacts.length < 5) {
    throw new RoutingBenchmarkInputError([
      `${path}.mandatoryFacts must contain at least five fact families`,
    ]);
  }
  if (isDemoCase && criticalFacts.length === 0) {
    throw new RoutingBenchmarkInputError([
      `${path}.criticalFacts must be non-empty for demo cases`,
    ]);
  }
  const mandatorySet = new Set(mandatoryFacts);
  if (criticalFacts.some((fact) => !mandatorySet.has(fact))) {
    throw new RoutingBenchmarkInputError([
      `${path}.criticalFacts must be a subset of mandatoryFacts`,
    ]);
  }
  return {
    id,
    origin,
    destination,
    localDateTime,
    riskCategories,
    rationale,
    approval,
    expectedFacts,
    mandatoryFacts,
    criticalFacts,
    isDemoCase,
    tolerances,
  };
}

function parseLocation(value: unknown, path: string): RoutingLocation {
  const input = asRecord(value, path);
  const stopId = requiredString(input.stopId, `${path}.stopId`);
  const label = requiredString(input.label, `${path}.label`);
  if (!isGeoCoordinate(input.coordinate)) {
    throw new RoutingBenchmarkInputError([
      `${path}.coordinate must be [longitude, latitude] within bounds`,
    ]);
  }
  return {
    stopId,
    label,
    coordinate: input.coordinate,
  };
}

function parseCategories(
  value: unknown,
  path: string,
): readonly RoutingCaseCategory[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RoutingBenchmarkInputError([`${path} must be a non-empty array`]);
  }
  const categories = value.map((category, index) => {
    if (
      typeof category !== "string" ||
      !(ROUTING_CASE_CATEGORIES as readonly string[]).includes(category)
    ) {
      throw new RoutingBenchmarkInputError([
        `${path}[${index}] is not a known risk category`,
      ]);
    }
    return category as RoutingCaseCategory;
  });
  if (new Set(categories).size !== categories.length) {
    throw new RoutingBenchmarkInputError([
      `${path} must not contain duplicates`,
    ]);
  }
  return categories;
}

function parseApproval(
  value: unknown,
  path: string,
): RoutingBenchmarkFixture["approval"] {
  const input = asRecord(value, path);
  if (input.status !== "approved") {
    throw new RoutingBenchmarkInputError([`${path}.status must be approved`]);
  }
  return {
    status: "approved",
    approvedBy: requiredString(input.approvedBy, `${path}.approvedBy`),
    approvedAt: requiredString(input.approvedAt, `${path}.approvedAt`),
    evidenceRef: requiredString(input.evidenceRef, `${path}.evidenceRef`),
  };
}

function parseFactNames(
  value: unknown,
  path: string,
): readonly RouteFactName[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RoutingBenchmarkInputError([`${path} must be a non-empty array`]);
  }
  const names = value.map((fact, index) => {
    if (
      typeof fact !== "string" ||
      !(ROUTING_FACT_NAMES as readonly string[]).includes(fact)
    ) {
      throw new RoutingBenchmarkInputError([
        `${path}[${index}] is not a known route fact`,
      ]);
    }
    return fact as RouteFactName;
  });
  if (new Set(names).size !== names.length) {
    throw new RoutingBenchmarkInputError([
      `${path} must not contain duplicates`,
    ]);
  }
  return names;
}

function parseTolerances(
  value: unknown,
  path: string,
): RoutingFixtureTolerances {
  const input = asRecord(value, path);
  const tolerances: {
    timingSeconds?: number;
    walkingDistanceMeters?: number;
    coordinateDegrees?: number;
  } = {};
  for (const field of [
    "timingSeconds",
    "walkingDistanceMeters",
    "coordinateDegrees",
  ] as const) {
    const raw = input[field];
    if (raw !== undefined) {
      if (!isFiniteNumber(raw) || raw < 0) {
        throw new RoutingBenchmarkInputError([
          `${path}.${field} must be a non-negative number`,
        ]);
      }
      tolerances[field] = raw;
    }
  }
  return tolerances;
}
