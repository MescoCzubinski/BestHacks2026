import { describe, expect, it } from "vitest";
import type { RouteStop } from "@/api/types";
import {
  additionCost,
  roundUpToQuarter,
  suggestRemovals,
} from "./planAddition";

const stop = (id: string, lng: number, visitMinutes: number): RouteStop => ({
  id,
  name: id,
  description: "",
  enterable: false,
  lat: 51.1,
  lng,
  visitMinutes,
});
const START = { lat: 51.1, lng: 17.0 };
const route = {
  start: START,
  end: START,
  stops: [stop("a", 17.01, 20), stop("b", 17.02, 40), stop("c", 17.03, 10)],
};

describe("additionCost", () => {
  it("inserts a place where it adds the least walking", () => {
    const { index } = additionCost(route, stop("x", 17.0205, 10));
    expect(index).toBe(2);
  });

  it("includes the visit time", () => {
    const near = stop("x", 17.01, 30);
    expect(additionCost(route, near).minutes).toBeGreaterThanOrEqual(30);
  });
});

describe("suggestRemovals", () => {
  it("prefers one stop, and the smallest one that frees enough time", () => {
    const [first] = suggestRemovals(route, 25);
    expect(first?.ids).toEqual(["c"]);
  });

  it("combines stops when no single one frees enough", () => {
    const [first] = suggestRemovals(route, 70);
    expect(first?.ids.length).toBeGreaterThan(1);
  });

  it("returns nothing when even removing everything is not enough", () => {
    expect(suggestRemovals(route, 10_000)).toEqual([]);
  });
});

it("rounds up to a quarter of an hour", () => {
  expect(roundUpToQuarter(181)).toBe(195);
  expect(roundUpToQuarter(180)).toBe(180);
});
