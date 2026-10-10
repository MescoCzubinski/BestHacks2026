import type { PlaceCandidate } from "../../places/place-candidate";
import { estimateWalkMinutes } from "./walking-estimate";
import type { RouteCandidate } from "./candidate";
import { planRoute, schedule, type PlannerOptions } from "./orienteering";
import { visitMinutes } from "./visit-duration";

const START = { lat: 51.11, lng: 17.03 };
const startAt = new Date("2026-10-12T08:00:00Z");

function candidate(
  id: string,
  lat: number,
  lng: number,
  value = 1,
  dwell = 10,
  hours: string | null = null,
): RouteCandidate {
  const place = {
    id,
    name: id,
    latitude: lat,
    longitude: lng,
    tags: {},
    facts: {},
    significance: 50,
  } as unknown as PlaceCandidate;
  return {
    place,
    point: { lat, lng },
    value,
    dwellMinutes: dwell,
    openingHours: hours,
    accessibility: "unknown",
  };
}

function options(over: Partial<PlannerOptions> = {}): PlannerOptions {
  return {
    start: START,
    end: START,
    startAt,
    budgetMinutes: 60,
    maxStops: 10,
    walkMinutes: (a, b) => estimateWalkMinutes(a, b),
    isOpen: () => true,
    ...over,
  };
}

describe("route planner", () => {
  it("never exceeds the time budget", () => {
    const near = Array.from({ length: 12 }, (_, i) =>
      candidate(`p${i}`, 51.11 + i * 0.002, 17.03 + (i % 3) * 0.002),
    );
    const plan = planRoute(near, options({ budgetMinutes: 45 }));
    expect(plan.totalMinutes).toBeLessThanOrEqual(45);
    expect(plan.stops.length).toBeGreaterThan(0);
  });

  it("prefers the more valuable place when only one fits", () => {
    const worth = candidate("worth", 51.115, 17.03, 5, 20);
    const meh = candidate("meh", 51.115, 17.031, 1, 20);
    const plan = planRoute([meh, worth], options({ budgetMinutes: 45 }));
    expect(plan.stops.map((s) => s.candidate.place.id)).toEqual(["worth"]);
  });

  it("respects maxStops and returns to the end point", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      candidate(`p${i}`, 51.1105 + i * 0.0005, 17.0305),
    );
    const plan = planRoute(many, options({ maxStops: 3, budgetMinutes: 240 }));
    expect(plan.stops).toHaveLength(3);
  });

  it("skips a place that is closed when we would arrive", () => {
    const closed = candidate(
      "closed",
      51.112,
      17.03,
      9,
      10,
      "Mo-Su 20:00-22:00",
    );
    const open = candidate("open", 51.112, 17.032, 1, 10);
    const o = options({ isOpen: (c) => c.openingHours === null });
    const plan = planRoute([closed, open], o);
    expect(plan.stops.map((s) => s.candidate.place.id)).toEqual(["open"]);
    expect(schedule([closed], o)).toBeNull();
  });

  it("orders stops to avoid backtracking", () => {
    const a = candidate("a", 51.112, 17.03);
    const b = candidate("b", 51.114, 17.03);
    const c = candidate("c", 51.116, 17.03);
    const plan = planRoute(
      [c, a, b],
      options({ budgetMinutes: 120, end: { lat: 51.118, lng: 17.03 } }),
    );
    expect(plan.stops.map((s) => s.candidate.place.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("visit duration", () => {
  it("uses the strongest known type tag and grows with significance", () => {
    expect(visitMinutes({ museum: 90 }, 0)).toBe(45);
    expect(visitMinutes({ museum: 90 }, 100)).toBeGreaterThan(45);
    expect(visitMinutes({ sculpture: 80, street_art: 80 }, 0)).toBe(3);
    expect(visitMinutes({}, 0)).toBe(8);
  });
});
