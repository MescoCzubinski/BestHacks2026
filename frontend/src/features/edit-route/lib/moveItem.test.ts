import { describe, expect, it } from "vitest";
import { moveItem } from "./moveItem";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item forward and backward", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("does not change the original list", () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the same list for no-op or out-of-range moves", () => {
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, -1, 2)).toBe(list);
    expect(moveItem(list, 1, 9)).toBe(list);
  });
});
