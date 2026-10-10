import { MockRoutePlanner } from "./mock-route-planner.service";
import type { RouteQuery } from "./route-planner";

const query = (durationMinutes: number): RouteQuery => ({
  start: { lat: 51.1, lng: 17.03 },
  end: { lat: 51.1, lng: 17.03 },
  durationMinutes,
  wheelchair: false,
  tags: [],
});

describe("MockRoutePlanner", () => {
  const planner = new MockRoutePlanner();

  it("plans more stops for a longer time budget", async () => {
    expect(await planner.plan(query(60))).toHaveLength(1);
    expect(await planner.plan(query(120))).toHaveLength(2);
    expect(await planner.plan(query(180))).toHaveLength(4);
  });

  it("always plans at least one stop and never more than it has", async () => {
    expect(await planner.plan(query(15))).toHaveLength(1);
    expect(await planner.plan(query(720))).toHaveLength(5);
  });

  it("gives every stop a visit time", async () => {
    const stops = await planner.plan(query(720));
    expect(stops.every((s) => s.visitMinutes > 0)).toBe(true);
  });
});
