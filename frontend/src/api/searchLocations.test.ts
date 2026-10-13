import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLocations } from "./searchLocations";

afterEach(() => vi.unstubAllGlobals());

describe("searchLocations", () => {
  it("returns the locations from the API and encodes the query", async () => {
    const locations = [
      {
        label: "Parkowa 1-3, 51-616 Wrocław",
        street: "Parkowa",
        houseNumber: "1-3",
        postalCode: "51-616",
        city: "Wrocław",
        lat: 51.1,
        lng: 17.07,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => locations });
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchLocations("Parkowa 3")).toEqual(locations);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /\/locations\?query=Parkowa%203$/,
    );
  });

  it("throws on a bad status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    await expect(searchLocations("Parkowa")).rejects.toThrow("502");
  });
});
