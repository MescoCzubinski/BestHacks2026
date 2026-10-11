import { MAX_MATCHES, TagRankingService } from "./tag-ranking.service";

const ranking = new TagRankingService();
const similarity = ranking.similarity.bind(ranking);
const rankTags = ranking.rank.bind(ranking);

const tag = (id: string, vector: number[]) => ({ id, vector });

describe("similarity", () => {
  it("is 1 for identical unit vectors and 0 for orthogonal ones", () => {
    expect(similarity([1, 0], [1, 0])).toBe(1);
    expect(similarity([1, 0], [0, 1])).toBe(0);
  });
});

describe("rankTags", () => {
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
