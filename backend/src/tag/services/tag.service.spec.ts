import { STYLE_TAGS } from "../../common/types/style-tag";
import type { EmbeddingModel } from "./embedding.model";
import { TAG_LABELS } from "./tag-labels";
import { MAX_MATCHES, rankTags, similarity, TagService } from "./tag.service";

const VECTORS: Record<string, number[]> = {
  Gotyk: [1, 0, 0],
  Park: [0, 1, 0],
  "gotyckie kościoły": [0.99, 0.1, 0],
  "coś zupełnie innego": [0.05, 0.05, 0.05],
};

const fromTable = async (texts: string[]) =>
  texts.map((text) => VECTORS[text] ?? [0, 0, 1]);

function setup(embed = jest.fn(fromTable)) {
  const warmup = jest.fn();
  const service = new TagService({
    embed,
    warmup,
  } as unknown as EmbeddingModel);
  return { service, embed, warmup };
}

describe("TagService.list", () => {
  const tags = setup().service.list();

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

describe("TagService.match", () => {
  it("maps free text onto the closest tag", async () => {
    const { service } = setup();
    const [best] = await service.match("gotyckie kościoły");
    expect(best).toMatchObject({
      id: "gothic",
      label: "Gotyk",
      group: "style",
    });
    expect(best?.score).toBeGreaterThan(0.9);
  });

  it("returns nothing when no tag is similar enough", async () => {
    const { service } = setup();
    expect(await service.match("coś zupełnie innego")).toEqual([]);
  });

  it("embeds every tag label and synonym phrase once and reuses them", async () => {
    const { service, embed } = setup();
    await service.match("gotyckie kościoły");
    await service.match("gotyckie kościoły");
    const batches = embed.mock.calls.filter(([texts]) => texts.length > 1);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.[0]).toContain("Secesja");
    expect(batches[0]?.[0]).toContain("secesyjne kamienice");
  });

  it("retries loading the tag vectors after a failure", async () => {
    const embed = jest
      .fn(fromTable)
      .mockRejectedValueOnce(new Error("model down"));
    const { service } = setup(embed);
    await expect(service.match("gotyckie kościoły")).rejects.toThrow(
      "model down",
    );
    expect((await service.match("gotyckie kościoły"))[0]?.id).toBe("gothic");
  });
});

describe("TagService.embed", () => {
  it("returns one trimmed vector per text, in order, and reports the dimension", async () => {
    const embed = jest.fn(async (texts: string[]) =>
      texts.map((t) => [t.length, 1, 0]),
    );
    const { service } = setup(embed);
    expect(await service.embed([" ab ", "cde"])).toEqual({
      dimensions: 3,
      vectors: [
        [2, 1, 0],
        [3, 1, 0],
      ],
    });
    expect(embed).toHaveBeenCalledWith(["ab", "cde"]);
  });
});

describe("similarity", () => {
  it("is 1 for identical unit vectors and 0 for orthogonal ones", () => {
    expect(similarity([1, 0], [1, 0])).toBe(1);
    expect(similarity([1, 0], [0, 1])).toBe(0);
  });
});

describe("rankTags", () => {
  const tag = (id: string, vector: number[]) => ({ id, vector });
  const tags = [
    tag("gothic", [1, 0, 0]),
    tag("church", [0.95, 0.312, 0]),
    tag("park", [0, 1, 0]),
    tag("museum", [0, 0, 1]),
  ];

  it("returns the best match first", () => {
    expect(rankTags([1, 0, 0], tags)[0]).toEqual({ id: "gothic", score: 1 });
  });

  it("keeps close runners-up and drops the rest", () => {
    const ids = rankTags([0.99, 0.14, 0], tags).map((t) => t.id);
    expect(ids).toEqual(["gothic", "church"]);
  });

  it("returns nothing when no tag is similar enough", () => {
    expect(rankTags([0.5, 0.5, 0.5], tags)).toEqual([]);
  });

  it("scores a tag by its best vector when it has several", () => {
    const withPhrases = [
      tag("secession", [0, 1, 0]),
      tag("secession", [1, 0, 0]),
      tag("park", [0, 0, 1]),
    ];
    expect(rankTags([1, 0, 0], withPhrases)).toEqual([
      { id: "secession", score: 1 },
    ]);
  });

  it("never returns more than the maximum number of matches", () => {
    const same = ["a", "b", "c", "d", "e"].map((id) => tag(id, [1, 0, 0]));
    expect(rankTags([1, 0, 0], same)).toHaveLength(MAX_MATCHES);
  });
});
