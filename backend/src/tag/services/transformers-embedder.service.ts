import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { resolve } from "node:path";
import { EmbeddingUnavailableException } from "../exceptions/embedding-unavailable.exception";
import { Embedder } from "./embedder";

const MODEL_CACHE_DIR = resolve(process.cwd(), ".model-cache");

@Injectable()
export class TransformersEmbedder extends Embedder {
  private readonly logger = new Logger(TransformersEmbedder.name);
  private readonly model: string;
  private extractor?: Promise<FeatureExtractionPipeline>;

  constructor(config: ConfigService) {
    super();
    this.model = config.getOrThrow<string>("EMBEDDING_MODEL");
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const extractor = await this.load();
      const output = await extractor(texts, {
        pooling: "mean",
        normalize: true,
      });
      return output.tolist() as number[][];
    } catch (error) {
      this.logger.warn(`Embedding failed: ${String(error)}`);
      this.extractor = undefined;
      throw new EmbeddingUnavailableException();
    }
  }

  private load(): Promise<FeatureExtractionPipeline> {
    this.extractor ??= import("@huggingface/transformers").then(
      async ({ pipeline, env }) => {
        env.cacheDir = MODEL_CACHE_DIR;
        this.logger.log(`Loading embedding model ${this.model} (q8)`);
        const extractor = await pipeline("feature-extraction", this.model, {
          dtype: "q8",
        });
        this.logger.log("Embedding model ready");
        return extractor;
      },
    );
    return this.extractor;
  }
}
