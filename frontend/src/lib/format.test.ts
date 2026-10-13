import { describe, expect, it } from "vitest";
import { formatDistance, formatMinutes } from "./format";

describe("formatMinutes", () => {
  it("formats minutes, whole hours and mixed durations", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 godz.");
    expect(formatMinutes(113)).toBe("1 godz. 53 min");
  });

  it("rounds and never goes negative", () => {
    expect(formatMinutes(59.6)).toBe("1 godz.");
    expect(formatMinutes(-5)).toBe("0 min");
  });
});

describe("formatDistance", () => {
  it("uses meters below a kilometer and kilometers with a comma above", () => {
    expect(formatDistance(640)).toBe("640 m");
    expect(formatDistance(9400)).toBe("9,4 km");
  });
});
