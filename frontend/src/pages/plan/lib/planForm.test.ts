import { describe, expect, it } from "vitest";
import {
  formatHours,
  formProblem,
  hoursToMinutes,
  parseHours,
  toRouteRequest,
  type PlanFormState,
} from "./planForm";

const VALID: PlanFormState = {
  start: { label: "Rynek", lat: 51.11, lng: 17.03 },
  sameEnd: true,
  end: { label: "" },
  hours: "2",
  wheelchair: true,
  tags: ["art_nouveau"],
};

describe("formProblem", () => {
  it("accepts a complete form", () => {
    expect(formProblem(VALID)).toBeNull();
  });

  it("asks for a start chosen from the suggestions", () => {
    expect(formProblem({ ...VALID, start: { label: "Rynek" } })).toMatch(
      /punkt startu/,
    );
  });

  it("only requires an end point when it differs from the start", () => {
    expect(formProblem({ ...VALID, sameEnd: false })).toMatch(/końcowy/);
    expect(
      formProblem({
        ...VALID,
        sameEnd: false,
        end: { label: "Hala", lat: 51.1, lng: 17.07 },
      }),
    ).toBeNull();
  });

  it("limits the time to 15 minutes – 12 hours", () => {
    expect(formProblem({ ...VALID, hours: "0.1" })).toMatch(/czas/);
    expect(formProblem({ ...VALID, hours: "13" })).toMatch(/czas/);
    expect(formProblem({ ...VALID, hours: "abc" })).toMatch(/czas/);
  });

  it("accepts fractional hours with a comma, a dot or a clock notation", () => {
    for (const hours of ["1,5", "1.5", "1:30", "0,25", "2,75"])
      expect(formProblem({ ...VALID, hours })).toBeNull();
  });

  it("requires at least one tag", () => {
    expect(formProblem({ ...VALID, tags: [] })).toMatch(/motyw/);
  });
});

describe("toRouteRequest", () => {
  it("builds a round trip request when the end is the start", () => {
    expect(toRouteRequest(VALID)).toEqual({
      start: { lat: 51.11, lng: 17.03 },
      end: undefined,
      durationMinutes: 120,
      wheelchair: true,
      tags: ["art_nouveau"],
    });
  });

  it("includes a different end point", () => {
    const request = toRouteRequest({
      ...VALID,
      sameEnd: false,
      end: { label: "Hala", lat: 51.1, lng: 17.07 },
      hours: "1.5",
    });
    expect(request?.end).toEqual({ lat: 51.1, lng: 17.07 });
    expect(request?.durationMinutes).toBe(90);
  });

  it("returns null for an invalid form", () => {
    expect(toRouteRequest({ ...VALID, tags: [] })).toBeNull();
  });
});

describe("parseHours", () => {
  it("reads decimals with a comma or a dot", () => {
    expect(parseHours("1,5")).toBe(1.5);
    expect(parseHours("1.25")).toBe(1.25);
    expect(parseHours(" 3 ")).toBe(3);
  });

  it("reads clock notation", () => {
    expect(parseHours("1:30")).toBe(1.5);
    expect(parseHours("0:45")).toBe(0.75);
    expect(parseHours("2:60")).toBeNull();
  });

  it("rejects text that is not a time", () => {
    expect(parseHours("")).toBeNull();
    expect(parseHours("abc")).toBeNull();
    expect(parseHours("1,5,2")).toBeNull();
    expect(parseHours("-1")).toBeNull();
  });
});

describe("hoursToMinutes and formatHours", () => {
  it("converts fractional hours to whole minutes", () => {
    expect(hoursToMinutes("1,5")).toBe(90);
    expect(hoursToMinutes("0,3")).toBe(18);
    expect(hoursToMinutes("abc")).toBe(0);
  });

  it("formats minutes as hours with a decimal comma", () => {
    expect(formatHours(90)).toBe("1,5");
    expect(formatHours(180)).toBe("3");
    expect(formatHours(135)).toBe("2,25");
  });
});
