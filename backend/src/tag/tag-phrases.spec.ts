import { STYLE_TAGS } from "../common/types/style-tag";
import { TAG_PHRASES } from "./tag-phrases";

describe("TAG_PHRASES", () => {
  it("has at least one phrase for every tag", () => {
    for (const id of STYLE_TAGS) {
      expect(
        TAG_PHRASES[id].split(", ").filter(Boolean).length,
      ).toBeGreaterThan(0);
    }
  });
});
