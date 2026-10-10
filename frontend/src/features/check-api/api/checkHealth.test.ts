import { afterEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "./checkHealth";

afterEach(() => vi.unstubAllGlobals());

describe("checkHealth", () => {
  it("is true when the API answers ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    expect(await checkHealth()).toBe(true);
  });

  it("is false on a bad status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await checkHealth()).toBe(false);
  });

  it("is false when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await checkHealth()).toBe(false);
  });
});
