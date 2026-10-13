import { describe, expect, it } from "vitest";
import {
  parseRoutePlan,
  planHref,
  routeHref,
  type RoutePlan,
} from "./routePlan";

const PLAN: RoutePlan = {
  tags: ["secession", "gothic"],
  start: { lat: 51.11, lng: 17.03, label: "Rynek 1, Wrocław" },
  durationMinutes: 90,
  wheelchair: false,
};

const searchOf = (href: string) => href.slice(href.indexOf("?"));

describe("route plan in the URL", () => {
  it("round-trips a plan through the route link", () => {
    const href = routeHref(PLAN);
    expect(href.startsWith("/route?")).toBe(true);
    expect(parseRoutePlan(searchOf(href))).toEqual({ ...PLAN, end: undefined });
  });

  it("keeps a separate end point and the wheelchair flag", () => {
    const plan: RoutePlan = {
      ...PLAN,
      end: { lat: 51.1, lng: 17.07, label: "Hala Stulecia" },
      wheelchair: true,
    };
    expect(parseRoutePlan(searchOf(planHref(plan)))).toEqual(plan);
  });

  it("reads a hand-written link", () => {
    expect(
      parseRoutePlan("?tags=secession&lat=51.1&lng=17.03&min=120"),
    ).toEqual({
      tags: ["secession"],
      start: { lat: 51.1, lng: 17.03, label: "" },
      end: undefined,
      durationMinutes: 120,
      wheelchair: false,
    });
  });

  it.each([
    ["no tags", "?lat=51.1&lng=17&min=60"],
    ["no start", "?tags=gothic&min=60"],
    ["a broken latitude", "?tags=gothic&lat=abc&lng=17&min=60"],
    ["a latitude out of range", "?tags=gothic&lat=95&lng=17&min=60"],
    ["too little time", "?tags=gothic&lat=51.1&lng=17&min=5"],
    ["too much time", "?tags=gothic&lat=51.1&lng=17&min=900"],
    ["fractional minutes", "?tags=gothic&lat=51.1&lng=17&min=60.5"],
  ])("rejects a link with %s", (_, search) => {
    expect(parseRoutePlan(search)).toBeNull();
  });
});
