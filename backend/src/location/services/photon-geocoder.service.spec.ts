import { GeocoderUnavailableException } from "../exceptions/geocoder-unavailable.exception";
import { PhotonGeocoder } from "./photon-geocoder.service";
import { PhotonLocationMapper } from "./photon-location-mapper.service";

const FEATURE = {
  geometry: { coordinates: [17.07, 51.11] },
  properties: {
    street: "Parkowa",
    housenumber: "1-3",
    postcode: "51-616",
    city: "Wrocław",
  },
};

const geocoder = () => new PhotonGeocoder(new PhotonLocationMapper());
const ok = (body: unknown) => new Response(JSON.stringify(body));

afterEach(() => jest.restoreAllMocks());

describe("PhotonGeocoder", () => {
  it("searches inside the bbox and maps usable features", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(ok({ features: [FEATURE, { properties: {} }] }));
    const found = await geocoder().search(
      "Parkowa",
      [16.8, 51.04, 17.18, 51.21],
      4,
    );
    expect(found.map((l) => l.label)).toEqual(["Parkowa 1-3, 51-616 Wrocław"]);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get("q")).toBe("Parkowa");
    expect(url.searchParams.get("limit")).toBe("4");
    expect(url.searchParams.get("bbox")).toBe("16.8,51.04,17.18,51.21");
  });

  it("returns the first reverse match or null", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ features: [FEATURE] }))
      .mockResolvedValueOnce(ok({ features: [] }));
    expect((await geocoder().reverse(51.11, 17.07))?.city).toBe("Wrocław");
    expect(await geocoder().reverse(51.11, 17.07)).toBeNull();
  });

  it("reports a failed request as unavailable", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(geocoder().reverse(51.1, 17)).rejects.toThrow(
      GeocoderUnavailableException,
    );
    await expect(geocoder().reverse(51.1, 17)).rejects.toThrow(
      GeocoderUnavailableException,
    );
  });
});
