import { Injectable, Logger } from "@nestjs/common";
import { EmbeddingUnavailableException } from "../exceptions/embedding-unavailable.exception";
import { EmbeddingModelLifecycle } from "./embedding-model-lifecycle.service";
import { Embedder } from "./embedder";

@Injectable()
export class ModelEmbedder extends Embedder {
  private readonly logger = new Logger(ModelEmbedder.name);

  constructor(private readonly lifecycle: EmbeddingModelLifecycle) {
    super();
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.lifecycle.use((model) => model.embed(texts));
    } catch (error) {
      this.logger.warn(`Embedding failed: ${String(error)}`);
      throw new EmbeddingUnavailableException();
    }
  }
}
