import { Embedder } from "./embedder";
import { EmbeddingService } from "./embedding.service";

class FakeEmbedder extends Embedder {
  readonly seen: string[][] = [];

  async embed(texts: string[]): Promise<number[][]> {
    this.seen.push(texts);
    return texts.map((t) => [t.length, 1, 0]);
  }
}

describe("EmbeddingService", () => {
  it("returns one vector per text, in order, and reports the dimension", async () => {
    const embedder = new FakeEmbedder();
    const result = await new EmbeddingService(embedder).embed([" ab ", "cde"]);
    expect(embedder.seen).toEqual([["ab", "cde"]]);
    expect(result).toEqual({
      dimensions: 3,
      vectors: [
        [2, 1, 0],
        [3, 1, 0],
      ],
    });
  });
});
