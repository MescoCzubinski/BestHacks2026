import { GeocoderUnavailableException } from "../exceptions/geocoder-unavailable.exception";
import { PhotonClient, toGeocodedLocation } from "./photon.client";

const FEATURE = {
  geometry: { coordinates: [17.07, 51.11] },
  properties: {
    street: "Parkowa",
    housenumber: "1-3",
    postcode: "51-616",
    city: "Wrocław",
  },
};

const geocoder = () => new PhotonClient();
const ok = (body: unknown) => new Response(JSON.stringify(body));

afterEach(() => jest.restoreAllMocks());

describe("PhotonClient", () => {
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

const feature = (
  properties: object,
  coordinates: [number, number] = [17.07, 51.11],
) => ({
  geometry: { coordinates },
  properties,
});

describe("toGeocodedLocation", () => {
  it("builds a label from street, house number, postcode and city", () => {
    expect(
      toGeocodedLocation(
        feature({
          street: "Parkowa",
          housenumber: "1-3",
          postcode: "51-616",
          city: "Wrocław",
        }),
      ),
    ).toEqual({
      label: "Parkowa 1-3, 51-616 Wrocław",
      street: "Parkowa",
      houseNumber: "1-3",
      postalCode: "51-616",
      city: "Wrocław",
      lat: 51.11,
      lng: 17.07,
    });
  });

  it("puts a place name first and does not repeat the street name", () => {
    expect(
      toGeocodedLocation(
        feature({
          name: "Stara Biblioteka",
          street: "Parkowa",
          housenumber: "1-3",
          city: "Wrocław",
        }),
      )?.label,
    ).toBe("Stara Biblioteka, Parkowa 1-3, Wrocław");
    expect(
      toGeocodedLocation(
        feature({ name: "Rynek", postcode: "50-106", city: "Wrocław" }),
      )?.label,
    ).toBe("Rynek, 50-106 Wrocław");
  });

  it("falls back to the district when there is no city", () => {
    expect(
      toGeocodedLocation(feature({ name: "Rynek", district: "Stare Miasto" }))
        ?.city,
    ).toBe("Stare Miasto");
  });

  it("skips features without coordinates or a usable label", () => {
    expect(toGeocodedLocation({ properties: { name: "X" } })).toBeNull();
    expect(toGeocodedLocation(feature({}))).toBeNull();
  });
});
