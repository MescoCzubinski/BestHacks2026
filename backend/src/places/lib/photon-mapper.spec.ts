import { mapPhotonFeature } from "./photon-mapper";

const feature = (
  properties: object,
  coordinates: [number, number] = [17.07, 51.11],
) => ({
  geometry: { coordinates },
  properties,
});

describe("mapPhotonFeature", () => {
  it("builds a label from street, house number, postcode and city", () => {
    expect(
      mapPhotonFeature(
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
      mapPhotonFeature(
        feature({
          name: "Stara Biblioteka",
          street: "Parkowa",
          housenumber: "1-3",
          city: "Wrocław",
        }),
      )?.label,
    ).toBe("Stara Biblioteka, Parkowa 1-3, Wrocław");
    expect(
      mapPhotonFeature(
        feature({ name: "Rynek", postcode: "50-106", city: "Wrocław" }),
      )?.label,
    ).toBe("Rynek, 50-106 Wrocław");
  });

  it("falls back to the district when there is no city", () => {
    expect(
      mapPhotonFeature(feature({ name: "Rynek", district: "Stare Miasto" }))
        ?.city,
    ).toBe("Stare Miasto");
  });

  it("skips features without coordinates or a usable label", () => {
    expect(mapPhotonFeature({ properties: { name: "X" } })).toBeNull();
    expect(mapPhotonFeature(feature({}))).toBeNull();
  });
});
