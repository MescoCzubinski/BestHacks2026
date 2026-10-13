import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("warmUp", () => {
  it("posts to the warmup endpoint once per page load", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchMock);
    const { warmUp } = await import("./warmUp");
    await warmUp();
    await warmUp();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/embeddings/warmup", {
      method: "POST",
    });
  });

  it("ignores a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { warmUp } = await import("./warmUp");
    await expect(warmUp()).resolves.toBeUndefined();
  });
});
