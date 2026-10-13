import type { ConfigService } from "@nestjs/config";
import { EmbeddingUnavailableException } from "../exceptions/embedding-unavailable.exception";
import {
  EmbeddingModel,
  MODEL_IDLE_TTL_MS,
  type LoadedModel,
} from "./embedding.model";

const CONFIG = { getOrThrow: () => "test-model" } as unknown as ConfigService;

function setup() {
  const loaded: LoadedModel = {
    embed: jest.fn(async (texts: string[]) => texts.map(() => [1, 0])),
    dispose: jest.fn(async () => undefined),
  };
  const load = jest.fn(async () => loaded);
  class TestModel extends EmbeddingModel {
    protected override loadModel() {
      return load();
    }
  }
  return { model: new TestModel(CONFIG), load, loaded };
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("EmbeddingModel", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("does not load the model until it is first used", async () => {
    const { model, load } = setup();
    expect(load).not.toHaveBeenCalled();
    expect(model.loaded).toBe(false);
    expect(await model.embed(["a"])).toEqual([[1, 0]]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(model.loaded).toBe(true);
  });

  it("loads once for concurrent and later uses", async () => {
    const { model, load } = setup();
    await Promise.all([model.embed(["a"]), model.embed(["b"])]);
    await model.embed(["c"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("unloads after the idle TTL and loads again on the next use", async () => {
    const { model, load, loaded } = setup();
    await model.embed(["a"]);
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1);
    expect(loaded.dispose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await settle();
    expect(loaded.dispose).toHaveBeenCalledTimes(1);
    expect(model.loaded).toBe(false);

    await model.embed(["b"]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("restarts the idle countdown on every use", async () => {
    const { model, loaded } = setup();
    await model.embed(["a"]);
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1000);
    await model.embed(["b"]);
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS - 1000);
    await settle();
    expect(loaded.dispose).not.toHaveBeenCalled();
  });

  it("never unloads while a request is still running", async () => {
    const { model, loaded } = setup();
    let finish: () => void = () => undefined;
    (loaded.embed as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve([[1, 0]]))),
    );
    const running = model.embed(["a"]);
    await settle();
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS * 2);
    await settle();
    expect(loaded.dispose).not.toHaveBeenCalled();
    finish();
    await running;
    jest.advanceTimersByTime(MODEL_IDLE_TTL_MS);
    await settle();
    expect(loaded.dispose).toHaveBeenCalledTimes(1);
  });

  it("warms up in the background", async () => {
    const { model, load } = setup();
    model.warmup();
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(model.loaded).toBe(true);
  });

  it("reports a failure as unavailable and retries the load next time", async () => {
    const { model, load, loaded } = setup();
    load.mockRejectedValueOnce(new Error("download failed"));
    await expect(model.embed(["a"])).rejects.toThrow(
      EmbeddingUnavailableException,
    );
    expect(model.loaded).toBe(false);
    await expect(model.embed(["a"])).resolves.toEqual([[1, 0]]);
    expect(load).toHaveBeenCalledTimes(2);
    expect(loaded.embed).toHaveBeenCalledTimes(1);
  });

  it("reports a crash while embedding as unavailable", async () => {
    const { model, loaded } = setup();
    (loaded.embed as jest.Mock).mockRejectedValueOnce(new Error("onnx"));
    await expect(model.embed(["a"])).rejects.toThrow(
      EmbeddingUnavailableException,
    );
  });

  it("releases the model on shutdown", async () => {
    const { model, loaded } = setup();
    await model.embed(["a"]);
    await model.onApplicationShutdown();
    expect(loaded.dispose).toHaveBeenCalledTimes(1);
  });
});
