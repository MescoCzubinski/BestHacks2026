import { WalkingEstimateService } from "./walking-estimate.service";

const walking = new WalkingEstimateService();

describe("WalkingEstimateService", () => {
  it("is zero for the same point", () => {
    expect(
      walking.minutes({ lat: 51.1, lng: 17 }, { lat: 51.1, lng: 17 }),
    ).toBe(0);
  });

  it("estimates a kilometre north at about 17 minutes with the detour factor", () => {
    const minutes = walking.minutes(
      { lat: 51.1, lng: 17 },
      { lat: 51.109, lng: 17 },
    );
    expect(minutes).toBeGreaterThan(17);
    expect(minutes).toBeLessThan(18);
  });

  it("is symmetric and faster at a higher speed", () => {
    const a = { lat: 51.1, lng: 17 };
    const b = { lat: 51.12, lng: 17.05 };
    expect(walking.minutes(a, b)).toBeCloseTo(walking.minutes(b, a));
    expect(walking.minutes(a, b, 6)).toBeLessThan(walking.minutes(a, b));
  });
});
