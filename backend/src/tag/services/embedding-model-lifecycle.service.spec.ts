import type { EmbeddingModel, EmbeddingModelLoader } from "./embedding-model";
import {
  EmbeddingModelLifecycle,
  MODEL_IDLE_TTL_MS,
} from "./embedding-model-lifecycle.service";

function setup() {
  const model: EmbeddingModel = {
    embed: jest.fn(async (texts: string[]) => texts.map(() => [1, 0])),
    dispose: jest.fn(async () => undefined),
  };
  const load = jest.fn(async () => model);
  const lifecycle = new EmbeddingModelLifecycle({
    load,
  } as unknown as EmbeddingModelLoader);
  return { lifecycle, load, model };
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("EmbeddingModelLifecycle", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("does not load the model until it is first used", async () => {
    const { lifecycle, load } = setup();
    expect(load).not.toHaveBeenCalled();
    expect(lifecycle.loaded).toBe(false);
    await lifecycle.use((m) => m.embed(["a"]));
    expect(load).toHaveBeenCalledTimes(1);
    expect(lifecycle.loaded).toBe(true);
  });

  it("loads once for concurrent and later uses", async () => {
    const { lifecycle, load } = setup();
    await Promise.all([
      lifecycle.use((m) => m.embed(["a"])),
      lifecycle.use((m) => m.embed(["b"])),
    ]);
    await lifecycle.use((m) => m.embed(["c"]));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("unloads after the idle TTL and loads again on the next use", async () => {
    const { lifecycle, load, model } = setup();
    await lifecycle.use((m) => m.embed(["a"]));
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1);
    expect(model.dispose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await settle();
    expect(model.dispose).toHaveBeenCalledTimes(1);
    expect(lifecycle.loaded).toBe(false);

    await lifecycle.use((m) => m.embed(["b"]));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("restarts the idle countdown on every use", async () => {
    const { lifecycle, model } = setup();
    await lifecycle.use((m) => m.embed(["a"]));
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1000);
    await lifecycle.use((m) => m.embed(["b"]));
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1000);
    await settle();
    expect(model.dispose).not.toHaveBeenCalled();
  });

  it("never unloads while a request is still running", async () => {
    const { lifecycle, model } = setup();
    let finish: () => void = () => undefined;
    const running = lifecycle.use(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    await settle();
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS * 2);
    await settle();
    expect(model.dispose).not.toHaveBeenCalled();
    finish();
    await running;
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS);
    await settle();
    expect(model.dispose).toHaveBeenCalledTimes(1);
  });

  it("warms up in the background", async () => {
    const { lifecycle, load } = setup();
    lifecycle.warmup();
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(lifecycle.loaded).toBe(true);
  });

  it("retries the load after a failure", async () => {
    const { lifecycle, load, model } = setup();
    load.mockRejectedValueOnce(new Error("download failed"));
    await expect(lifecycle.use((m) => m.embed(["a"]))).rejects.toThrow(
      "download failed",
    );
    expect(lifecycle.loaded).toBe(false);
    await expect(lifecycle.use((m) => m.embed(["a"]))).resolves.toEqual([
      [1, 0],
    ]);
    expect(load).toHaveBeenCalledTimes(2);
    expect(model.embed).toHaveBeenCalledTimes(1);
  });

  it("releases the model on shutdown", async () => {
    const { lifecycle, model } = setup();
    await lifecycle.use((m) => m.embed(["a"]));
    await lifecycle.onApplicationShutdown();
    expect(model.dispose).toHaveBeenCalledTimes(1);
  });
});
