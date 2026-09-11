import { describe, expect, it } from "vitest";

import { makePlanningInput, makeSnapshot } from "./routeEngineTestFixtures";
import { selectPrimaryRoute } from "./routeEngine";

describe("transit route geometry", () => {
  it("does not use a full shape collection filter during leg materialization", () => {
    const baseSnapshot = makeSnapshot();
    const shapes = [...baseSnapshot.shapes];
    Object.defineProperty(shapes, "filter", {
      value: () => {
        throw new Error("full shape collection scans are not allowed");
      },
    });
    const snapshot = { ...baseSnapshot, shapes };

    const result = selectPrimaryRoute({
      snapshot,
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
  });

  it("keeps a transit leg scoped to its boarding and alighting stops", () => {
    const snapshot = makeSnapshot({
      shapes: [
        {
          shapeId: "shape-1",
          coordinate: [106.8, -6.2],
          sequence: 1,
          lineage: {
            snapshotId: "snapshot-test",
            fileName: "shapes.txt",
            rowNumber: 2,
          },
        },
        {
          shapeId: "shape-1",
          coordinate: [106.805, -6.195],
          sequence: 2,
          lineage: {
            snapshotId: "snapshot-test",
            fileName: "shapes.txt",
            rowNumber: 3,
          },
        },
        {
          shapeId: "shape-1",
          coordinate: [106.81, -6.19],
          sequence: 3,
          lineage: {
            snapshotId: "snapshot-test",
            fileName: "shapes.txt",
            rowNumber: 4,
          },
        },
        {
          shapeId: "shape-1",
          coordinate: [106.82, -6.18],
          sequence: 4,
          lineage: {
            snapshotId: "snapshot-test",
            fileName: "shapes.txt",
            rowNumber: 5,
          },
        },
      ],
    });

    const result = selectPrimaryRoute({
      snapshot,
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary.legs[0]).toMatchObject({
      kind: "transit",
      geometry: {
        state: "supported",
        coordinates: [
          [106.8, -6.2],
          [106.805, -6.195],
          [106.81, -6.19],
        ],
      },
    });
  });

  it("keeps schedule facts selectable when a shape is missing", () => {
    const result = selectPrimaryRoute({
      snapshot: makeSnapshot({ shapes: [] }),
      planning: makePlanningInput("2026-09-11", "08:00"),
      transferEdges: [],
    });

    expect(result.state).toBe("selected");
    if (result.state !== "selected") {
      return;
    }

    expect(result.primary).toMatchObject({
      status: "limited",
      geometry: { state: "limited" },
      timing: { semantics: "exact" },
    });
    expect(result.primary.legs[0]).toMatchObject({
      kind: "transit",
      geometry: { state: "unavailable", coordinates: [] },
    });
  });
});
