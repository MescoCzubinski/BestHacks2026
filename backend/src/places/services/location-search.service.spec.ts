import type { CityQueryService } from "../../city/services/city-query.service";
import type { Geocoder, GeocodedLocation } from "./geocoder";
import { LocationSearchService } from "./location-search.service";

const location = (label: string, city = "Wrocław"): GeocodedLocation => ({
  label,
  street: null,
  houseNumber: null,
  postalCode: null,
  city,
  lat: 51.1,
  lng: 17,
});

function setup(
  supported: { name: string; bbox: [number, number, number, number] }[],
  results: GeocodedLocation[][],
) {
  const search = jest.fn();
  results.forEach((r) => search.mockResolvedValueOnce(r));
  const service = new LocationSearchService(
    { listSupported: async () => supported } as unknown as CityQueryService,
    { search } as unknown as Geocoder,
  );
  return { service, search };
}

const WROCLAW = {
  name: "Wrocław",
  bbox: [16.8, 51.04, 17.18, 51.21] as [number, number, number, number],
};

describe("LocationSearchService", () => {
  it("searches inside the bbox of each supported city", async () => {
    const { service, search } = setup(
      [WROCLAW],
      [[location("Parkowa 3, Wrocław")]],
    );
    const result = await service.search("Parkowa 3", 4);
    expect(search).toHaveBeenCalledWith("Parkowa 3 Wrocław", WROCLAW.bbox, 4);
    expect(result.map((l) => l.label)).toEqual(["Parkowa 3, Wrocław"]);
  });

  it("merges results from several cities and drops duplicate labels", async () => {
    const other = {
      name: "Kraków",
      bbox: [19.8, 49.95, 20.1, 50.15] as typeof WROCLAW.bbox,
    };
    const { service } = setup(
      [WROCLAW, other],
      [
        [location("Rynek 1, Wrocław"), location("Rynek 2, Wrocław")],
        [location("Rynek 1, Wrocław"), location("Rynek 1, Kraków", "Kraków")],
      ],
    );
    const labels = (await service.search("Rynek")).map((l) => l.label);
    expect(labels).toEqual([
      "Rynek 1, Wrocław",
      "Rynek 2, Wrocław",
      "Rynek 1, Kraków",
    ]);
  });

  it("drops results from localities around the city", async () => {
    const { service } = setup(
      [WROCLAW],
      [
        [
          location("Parkowa 3, Sadowice", "Sadowice"),
          location("Parkowa 1-3, Wrocław"),
        ],
      ],
    );
    const labels = (await service.search("Parkowa 3")).map((l) => l.label);
    expect(labels).toEqual(["Parkowa 1-3, Wrocław"]);
  });

  it("respects the limit", async () => {
    const { service } = setup(
      [WROCLAW],
      [[location("a"), location("b"), location("c")]],
    );
    expect(await service.search("x", 2)).toHaveLength(2);
  });

  it("returns nothing when no city is supported", async () => {
    const { service, search } = setup([], []);
    expect(await service.search("Rynek")).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
