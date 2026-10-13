import { EmbeddingUnavailableException } from "../exceptions/embedding-unavailable.exception";
import type { EmbeddingModel } from "./embedding-model";
import type { EmbeddingModelLifecycle } from "./embedding-model-lifecycle.service";
import { ModelEmbedder } from "./model-embedder.service";

describe("ModelEmbedder", () => {
  it("embeds through the model held by the lifecycle", async () => {
    const model = { embed: jest.fn(async () => [[0.1, 0.2]]) };
    const lifecycle = {
      use: (work: (m: EmbeddingModel) => Promise<unknown>) =>
        work(model as unknown as EmbeddingModel),
    } as unknown as EmbeddingModelLifecycle;
    expect(await new ModelEmbedder(lifecycle).embed(["a"])).toEqual([
      [0.1, 0.2],
    ]);
    expect(model.embed).toHaveBeenCalledWith(["a"]);
  });

  it("reports any model failure as unavailable", async () => {
    const lifecycle = {
      use: async () => {
        throw new Error("onnx crashed");
      },
    } as unknown as EmbeddingModelLifecycle;
    await expect(new ModelEmbedder(lifecycle).embed(["a"])).rejects.toThrow(
      EmbeddingUnavailableException,
    );
  });
});
