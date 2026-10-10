import { describe, expect, it } from "vitest";
import { routeTotals } from "./totals";

const stop = (id: string, visitMinutes: number) => ({
  id,
  name: id,
  description: "",
  lat: 51.1,
  lng: 17,
  visitMinutes,
});

describe("routeTotals", () => {
  it("adds walking time (rounded to minutes) and visit time", () => {
    const path = {
      distanceMeters: 4000,
      durationSeconds: 2970,
      coordinates: [],
    };
    expect(routeTotals(path, [stop("a", 20), stop("b", 40)])).toEqual({
      walkingMinutes: 50,
      visitMinutes: 60,
      totalMinutes: 110,
    });
  });

  it("is just the walk when there are no stops", () => {
    const path = { distanceMeters: 0, durationSeconds: 0, coordinates: [] };
    expect(routeTotals(path, [])).toEqual({
      walkingMinutes: 0,
      visitMinutes: 0,
      totalMinutes: 0,
    });
  });
});
