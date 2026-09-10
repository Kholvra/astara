import { describe, expect, it } from "vitest";

import { sliceShapeBetweenStops } from "./shapeSlicing";

describe("sliceShapeBetweenStops", () => {
  it("returns only the ordered shape span between the two stops", () => {
    const result = sliceShapeBetweenStops({
      points: [
        { coordinate: [106.8, -6.2], sequence: 1 },
        { coordinate: [106.805, -6.195], sequence: 2 },
        { coordinate: [106.81, -6.19], sequence: 3 },
        { coordinate: [106.82, -6.18], sequence: 4 },
      ],
      fromStop: [106.8, -6.2],
      toStop: [106.81, -6.19],
    });

    expect(result).toEqual({
      state: "supported",
      coordinates: [
        [106.8, -6.2],
        [106.805, -6.195],
        [106.81, -6.19],
      ],
    });
  });

  it("projects stops onto an existing shape without drawing a straight line", () => {
    const result = sliceShapeBetweenStops({
      points: [
        { coordinate: [106.8, -6.2], sequence: 1 },
        { coordinate: [106.81, -6.19], sequence: 2 },
      ],
      fromStop: [106.802, -6.198],
      toStop: [106.808, -6.192],
    });

    expect(result.state).toBe("limited");
    expect(result.coordinates).toHaveLength(2);
    expect(result.coordinates[0]).toEqual([106.802, -6.198]);
    expect(result.coordinates[1]).toEqual([106.808, -6.192]);
  });

  it("fails closed for a distant stop-to-shape association", () => {
    const result = sliceShapeBetweenStops({
      points: [
        { coordinate: [106.8, -6.2], sequence: 1 },
        { coordinate: [106.81, -6.19], sequence: 2 },
      ],
      fromStop: [106.9, -6.1],
      toStop: [106.808, -6.192],
    });

    expect(result).toMatchObject({ state: "unavailable", coordinates: [] });
  });

  it("fails closed when the shape direction is opposite to the journey", () => {
    const result = sliceShapeBetweenStops({
      points: [
        { coordinate: [106.8, -6.2], sequence: 1 },
        { coordinate: [106.805, -6.195], sequence: 2 },
        { coordinate: [106.81, -6.19], sequence: 3 },
      ],
      fromStop: [106.81, -6.19],
      toStop: [106.8, -6.2],
    });

    expect(result).toMatchObject({ state: "unavailable", coordinates: [] });
  });

  it("fails closed for loop ambiguity instead of choosing a misleading branch", () => {
    const result = sliceShapeBetweenStops({
      points: [
        { coordinate: [106.8, -6.2], sequence: 1 },
        { coordinate: [106.805, -6.195], sequence: 2 },
        { coordinate: [106.8, -6.2], sequence: 3 },
        { coordinate: [106.81, -6.19], sequence: 4 },
      ],
      fromStop: [106.8, -6.2],
      toStop: [106.81, -6.19],
    });

    expect(result).toMatchObject({ state: "unavailable", coordinates: [] });
  });
});
