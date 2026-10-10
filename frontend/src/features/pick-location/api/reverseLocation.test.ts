import { afterEach, describe, expect, it, vi } from "vitest";
import { reverseLocation } from "./reverseLocation";

afterEach(() => vi.unstubAllGlobals());

const location = {
  label: "Rynek 1, 50-106 Wrocław",
  street: "Rynek",
  houseNumber: "1",
  postalCode: "50-106",
  city: "Wrocław",
  lat: 51.11,
  lng: 17.03,
};

describe("reverseLocation", () => {
  it("returns the address with the support flag", async () => {
    const result = {
      location,
      supported: true,
      supportedCities: ["Wrocław"],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => result });
    vi.stubGlobal("fetch", fetchMock);

    expect(await reverseLocation(51.11, 17.03)).toEqual(result);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /\/locations\/reverse\?lat=51\.11&lng=17\.03$/,
    );
  });

  it("throws on a failed request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    await expect(reverseLocation(51.1, 17)).rejects.toThrow("502");
  });
});
