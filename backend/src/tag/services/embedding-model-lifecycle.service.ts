import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import { EmbeddingModelLoader, type EmbeddingModel } from "./embedding-model";

export const MODEL_IDLE_TTL_MS = 10 * 60_000; // ms, ten minutes without a request

@Injectable()
export class EmbeddingModelLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(EmbeddingModelLifecycle.name);
  private model?: Promise<EmbeddingModel>;
  private inUse = 0;
  private idleTimer?: NodeJS.Timeout;

  constructor(private readonly loader: EmbeddingModelLoader) {}

  /** Starts loading the model without waiting for it, so the first real request is fast. */
  warmup(): void {
    this.use(async () => undefined).catch((error: unknown) =>
      this.logger.warn(`Warmup failed: ${String(error)}`),
    );
  }

  /** Runs work on the loaded model; the model stays loaded until it has been idle for the TTL. */
  async use<T>(work: (model: EmbeddingModel) => Promise<T>): Promise<T> {
    this.inUse++;
    this.cancelUnload();
    try {
      return await work(await this.load());
    } finally {
      this.inUse--;
      if (this.inUse === 0) this.scheduleUnload();
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

  private load(): Promise<EmbeddingModel> {
    this.model ??= this.loader.load().then(
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
