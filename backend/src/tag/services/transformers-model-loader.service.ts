import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolve } from "node:path";
import { EmbeddingModelLoader, type EmbeddingModel } from "./embedding-model";

const MODEL_CACHE_DIR = resolve(process.cwd(), ".model-cache");

@Injectable()
export class TransformersModelLoader extends EmbeddingModelLoader {
  private readonly logger = new Logger(TransformersModelLoader.name);
  private readonly model: string;

  constructor(config: ConfigService) {
    super();
    this.model = config.getOrThrow<string>("EMBEDDING_MODEL");
  }

  async load(): Promise<EmbeddingModel> {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = MODEL_CACHE_DIR;
    this.logger.log(`Loading embedding model ${this.model} (q8)`);
    const extractor = await pipeline("feature-extraction", this.model, {
      dtype: "q8",
    });
    return {
      embed: async (texts) => {
        const output = await extractor(texts, {
          pooling: "mean",
          normalize: true,
        });
        return output.tolist() as number[][];
      },
      dispose: () => extractor.dispose(),
    };
  }
}
