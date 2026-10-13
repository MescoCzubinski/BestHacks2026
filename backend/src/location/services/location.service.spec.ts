import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";
import type {
  CityRepository,
  SupportedCity,
} from "../repositories/city.repository";
import { LocationService } from "./location.service";
import type { GeocodedLocation, PhotonClient } from "./photon.client";

const WROCLAW: SupportedCity = {
  name: "Wrocław",
  bbox: [16.8, 51.04, 17.18, 51.21],
};
const KRAKOW: SupportedCity = {
  name: "Kraków",
  bbox: [19.8, 49.95, 20.1, 50.15],
};

const location = (label: string, city = "Wrocław"): GeocodedLocation => ({
  label,
  street: null,
  houseNumber: null,
  postalCode: null,
  city,
  lat: 51.1,
  lng: 17,
});

function setup(cities: SupportedCity[] = [WROCLAW]) {
  const findAllByName = jest.fn().mockResolvedValue(cities);
  const search = jest.fn();
  const reverse = jest.fn();
  const service = new LocationService(
    { findAllByName } as unknown as CityRepository,
    { search, reverse } as unknown as PhotonClient,
  );
  return { service, search, reverse };
}

describe("LocationService.search", () => {
  it("searches inside the bbox of each supported city", async () => {
    const { service, search } = setup();
    search.mockResolvedValueOnce([location("Parkowa 3, Wrocław")]);
    const result = await service.search("Parkowa 3", 4);
    expect(search).toHaveBeenCalledWith("Parkowa 3 Wrocław", WROCLAW.bbox, 4);
    expect(result.map((l) => l.label)).toEqual(["Parkowa 3, Wrocław"]);
  });

  it("merges results from several cities and drops duplicate labels", async () => {
    const { service, search } = setup([WROCLAW, KRAKOW]);
    search
      .mockResolvedValueOnce([
        location("Rynek 1, Wrocław"),
        location("Rynek 2, Wrocław"),
      ])
      .mockResolvedValueOnce([
        location("Rynek 1, Wrocław"),
        location("Rynek 1, Kraków", "Kraków"),
      ]);
    const labels = (await service.search("Rynek")).map((l) => l.label);
    expect(labels).toEqual([
      "Rynek 1, Wrocław",
      "Rynek 2, Wrocław",
      "Rynek 1, Kraków",
    ]);
  });

  it("drops results from localities around the city", async () => {
    const { service, search } = setup();
    search.mockResolvedValueOnce([
      location("Parkowa 3, Sadowice", "Sadowice"),
      location("Parkowa 1-3, Wrocław"),
    ]);
    const labels = (await service.search("Parkowa 3")).map((l) => l.label);
    expect(labels).toEqual(["Parkowa 1-3, Wrocław"]);
  });

  it("respects the limit", async () => {
    const { service, search } = setup();
    search.mockResolvedValueOnce([location("a"), location("b"), location("c")]);
    expect(await service.search("x", 2)).toHaveLength(2);
  });

  it("returns nothing when no city is supported", async () => {
    const { service, search } = setup([]);
    expect(await service.search("Rynek")).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});

describe("LocationService.reverse", () => {
  const PARKOWA = location("Parkowa 1-3, 51-616 Wrocław");

  it("returns the address of a point inside a supported city", async () => {
    const { service, reverse } = setup();
    reverse.mockResolvedValueOnce(PARKOWA);
    expect(await service.reverse(51.11, 17.03)).toEqual({
      location: PARKOWA,
      supported: true,
      supportedCities: ["Wrocław"],
    });
    expect(reverse).toHaveBeenCalledWith(51.11, 17.03);
  });

  it("still returns the address, flagged unsupported, outside the supported cities", async () => {
    const { service, reverse } = setup();
    reverse.mockResolvedValueOnce(PARKOWA);
    const result = await service.reverse(52.4, 16.93);
    expect(result.supported).toBe(false);
    expect(result.location).toBe(PARKOWA);
    expect(result.supportedCities).toEqual(["Wrocław"]);
  });

  it("accepts the edges of the city box", async () => {
    const { service, reverse } = setup();
    reverse.mockResolvedValueOnce(PARKOWA);
    expect((await service.reverse(51.04, 16.8)).supported).toBe(true);
  });

  it("reports not found when there is no address", async () => {
    const { service, reverse } = setup();
    reverse.mockResolvedValueOnce(null);
    await expect(service.reverse(51.1, 17)).rejects.toThrow(
      NotFoundDomainException,
    );
  });
});

describe("LocationService.assertInsideSupported", () => {
  it("accepts points inside a supported city", async () => {
    const { service } = setup();
    await expect(
      service.assertInsideSupported([
        { lat: 51.11, lng: 17.03 },
        { lat: 51.12, lng: 17.05 },
      ]),
    ).resolves.toBeUndefined();
  });

  it("rejects when any point is outside every supported city", async () => {
    const { service } = setup();
    await expect(
      service.assertInsideSupported([
        { lat: 51.11, lng: 17.03 },
        { lat: 51.11, lng: 19.9 },
      ]),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });

  it("rejects every point when no city is supported", async () => {
    const { service } = setup([]);
    await expect(
      service.assertInsideSupported([{ lat: 51.11, lng: 17.03 }]),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });
});
