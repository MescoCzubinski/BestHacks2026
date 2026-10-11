import { VisitDurationService } from "./visit-duration.service";

const durations = new VisitDurationService();

describe("VisitDurationService", () => {
  it("marks places with an inside as enterable", () => {
    expect(durations.isEnterable({ museum: 90 })).toBe(true);
    expect(durations.isEnterable({ museum: 20 })).toBe(false);
    expect(durations.isEnterable({ street_art: 90, sculpture: 80 })).toBe(
      false,
    );
  });

  it("uses the strongest known type tag and grows with significance", () => {
    expect(durations.visitMinutes({ museum: 90 }, 0)).toBe(45);
    expect(durations.visitMinutes({ museum: 90 }, 100)).toBeGreaterThan(45);
    expect(durations.visitMinutes({ sculpture: 80, street_art: 80 }, 0)).toBe(
      3,
    );
    expect(durations.visitMinutes({}, 0)).toBe(8);
  });
});
