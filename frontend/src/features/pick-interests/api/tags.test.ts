import { afterEach, describe, expect, it, vi } from "vitest";
import { listTags, matchTags } from "./tags";

afterEach(() => vi.unstubAllGlobals());

describe("listTags", () => {
  it("returns the tags from the API", async () => {
    const tags = [{ id: "gothic", group: "style", label: "Gotyk" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => tags }),
    );
    expect(await listTags()).toEqual(tags);
  });

  it("throws on a bad status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(listTags()).rejects.toThrow("500");
  });
});

describe("matchTags", () => {
  it("asks the API to map the text onto our tags", async () => {
    const matched = [
      { id: "gothic", group: "style", label: "Gotyk", score: 0.98 },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => matched });
    vi.stubGlobal("fetch", fetchMock);

    expect(await matchTags("gotyckie kościoły")).toEqual(matched);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /\/tags\/match\?text=gotyckie%20ko%C5%9Bcio%C5%82y$/,
    );
  });

  it("throws when the matcher is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    await expect(matchTags("browar")).rejects.toThrow("502");
  });
});
