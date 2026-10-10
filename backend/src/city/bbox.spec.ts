import { bboxContains, type Bbox } from "./bbox";

const WROCLAW: Bbox = [16.8, 51.04, 17.18, 51.21];

describe("bboxContains", () => {
  it("accepts a point inside the box, edges included", () => {
    expect(bboxContains(WROCLAW, 51.11, 17.03)).toBe(true);
    expect(bboxContains(WROCLAW, 51.04, 16.8)).toBe(true);
  });

  it("rejects points outside on either axis", () => {
    expect(bboxContains(WROCLAW, 52.4, 16.93)).toBe(false);
    expect(bboxContains(WROCLAW, 51.11, 19.9)).toBe(false);
  });
});
