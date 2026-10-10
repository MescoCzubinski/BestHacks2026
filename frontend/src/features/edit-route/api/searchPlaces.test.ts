import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./searchPlaces";

afterEach(() => vi.unstubAllGlobals());

describe("searchPlaces", () => {
  it("returns the places from the API and encodes the query", async () => {
    const places = [
      {
        id: "rynek",
        name: "Rynek",
        description: "",
        lat: 51.11,
        lng: 17.03,
        visitMinutes: 20,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => places });
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchPlaces("ratusz rynek")).toEqual(places);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /\/places\?query=ratusz%20rynek$/,
    );
  });

  it("throws on a bad status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(searchPlaces("rynek")).rejects.toThrow("500");
  });
});
