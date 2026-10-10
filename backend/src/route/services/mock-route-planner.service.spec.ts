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
    expect((await planner.plan(query(30))).stops).toHaveLength(1);
    expect((await planner.plan(query(100))).stops).toHaveLength(2);
    expect((await planner.plan(query(190))).stops).toHaveLength(5);
  });

  it("always plans at least one stop and never more than it has", async () => {
    expect((await planner.plan(query(15))).stops).toHaveLength(1);
    expect((await planner.plan(query(720))).stops).toHaveLength(5);
  });

  it("gives places you can walk into a longer typical visit than outdoor ones", async () => {
    const { stops } = await planner.plan(query(720));
    const outdoor = stops.filter((s) => !s.enterable);
    const indoor = stops.filter((s) => s.enterable);
    expect(outdoor.length).toBeGreaterThan(0);
    expect(indoor.length).toBeGreaterThan(0);
    expect(outdoor.every((s) => s.visitMinutes <= 15)).toBe(true);
    expect(indoor.every((s) => s.visitMinutes > 15)).toBe(true);
  });

  it("gives every stop a visit time", async () => {
    const { stops } = await planner.plan(query(720));
    expect(stops.every((s) => s.visitMinutes > 0)).toBe(true);
  });

  it("offers the stops that did not fit as extras", async () => {
    const { stops, extras } = await planner.plan(query(100));
    expect(stops).toHaveLength(2);
    expect(extras).toHaveLength(3);
    expect(extras.some((e) => e.id === stops[0]?.id)).toBe(false);
  });
});
