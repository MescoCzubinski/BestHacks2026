import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolve } from "node:path";
import { EmbeddingUnavailableException } from "../exceptions/embedding-unavailable.exception";

export const MODEL_IDLE_TTL_MS = 10 * 60_000; // ms, ten minutes without a request
const MODEL_CACHE_DIR = resolve(process.cwd(), ".model-cache");

export type LoadedModel = {
  embed(texts: string[]): Promise<number[][]>;
  dispose(): Promise<void>;
};

@Injectable()
export class EmbeddingModel implements OnApplicationShutdown {
  private readonly logger = new Logger(EmbeddingModel.name);
  private readonly name: string;
  private model?: Promise<LoadedModel>;
  private inUse = 0;
  private idleTimer?: NodeJS.Timeout;

  constructor(config: ConfigService) {
    this.name = config.getOrThrow<string>("EMBEDDING_MODEL");
  }

  /** Starts loading the model without waiting for it, so the first real request is fast. */
  warmup(): void {
    this.use(async () => undefined).catch((error: unknown) =>
      this.logger.warn(`Warmup failed: ${String(error)}`),
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.use((model) => model.embed(texts));
    } catch (error) {
      this.logger.warn(`Embedding failed: ${String(error)}`);
      throw new EmbeddingUnavailableException();
    }
  }

  get loaded(): boolean {
    return this.model !== undefined;
  }

  async unload(): Promise<void> {
    this.cancelUnload();
    const model = this.model;
    this.model = undefined;
    if (!model) return;
    try {
      await (await model).dispose();
      this.logger.log("Embedding model unloaded");
    } catch (error) {
      this.logger.debug(`Nothing to unload: ${String(error)}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.unload();
  }

  protected async loadModel(): Promise<LoadedModel> {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = MODEL_CACHE_DIR;
    this.logger.log(`Loading embedding model ${this.name} (q8)`);
    const extractor = await pipeline("feature-extraction", this.name, {
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

  /** Runs work on the loaded model; the model stays loaded until it has been idle for the TTL. */
  private async use<T>(work: (model: LoadedModel) => Promise<T>): Promise<T> {
    this.inUse++;
    this.cancelUnload();
    try {
      return await work(await this.load());
    } finally {
      this.inUse--;
      if (this.inUse === 0) this.scheduleUnload();
    }
  }

  private load(): Promise<LoadedModel> {
    this.model ??= this.loadModel().then(
      (model) => {
        this.logger.log("Embedding model loaded");
        return model;
      },
      (error: unknown) => {
        this.model = undefined;
        throw error;
      },
    );
    return this.model;
  }

  private scheduleUnload(): void {
    if (!this.model) return;
    this.idleTimer = setTimeout(() => void this.unload(), MODEL_IDLE_TTL_MS);
    this.idleTimer.unref();
  }

  private cancelUnload(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }
}
