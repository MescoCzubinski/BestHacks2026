import { STYLE_TAGS } from "../../common/types/style-tag";
import { TAG_LABELS } from "./tag-labels";
import { TagQueryService } from "./tag-query.service";

describe("TagQueryService", () => {
  const tags = new TagQueryService().list();

  it("lists every tag exactly once", () => {
    expect(tags.map((t) => t.id).sort()).toEqual([...STYLE_TAGS].sort());
  });

  it("gives each tag its group and Polish label", () => {
    expect(tags.find((t) => t.id === "secession")).toEqual({
      id: "secession",
      group: "style",
      label: "Secesja",
    });
    expect(tags.find((t) => t.id === "park")).toMatchObject({
      group: "type",
    });
    expect(tags.find((t) => t.id === "accessible")).toMatchObject({
      group: "special",
    });
  });

  it("has a unique non-empty label for every tag", () => {
    const labels = Object.values(TAG_LABELS);
    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
