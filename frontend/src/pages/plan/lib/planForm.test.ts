import { describe, expect, it } from "vitest";
import { formProblem, toRouteRequest, type PlanFormState } from "./planForm";

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
