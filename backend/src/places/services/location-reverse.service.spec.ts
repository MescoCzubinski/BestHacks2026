import type { CityQueryService } from "../../city/services/city-query.service";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import type { Geocoder, GeocodedLocation } from "./geocoder";
import { LocationReverseService } from "./location-reverse.service";

const LOCATION: GeocodedLocation = {
  label: "Parkowa 1-3, 51-616 Wrocław",
  street: "Parkowa",
  houseNumber: "1-3",
  postalCode: "51-616",
  city: "Wrocław",
  lat: 51.1096,
  lng: 17.0744,
};

function setup(options: { supported?: boolean; found?: boolean } = {}) {
  const { supported = true, found = true } = options;
  const reverse = jest.fn().mockResolvedValue(found ? LOCATION : null);
  const service = new LocationReverseService(
    {
      checkSupport: async () => ({ supported, supportedCities: ["Wrocław"] }),
    } as unknown as CityQueryService,
    { reverse } as unknown as Geocoder,
  );
  return { service, reverse };
}

describe("LocationReverseService", () => {
  it("returns the address of a point inside a supported city", async () => {
    const { service, reverse } = setup();
    expect(await service.reverse(51.1096, 17.0744)).toEqual({
      location: LOCATION,
      supported: true,
      supportedCities: ["Wrocław"],
    });
    expect(reverse).toHaveBeenCalledWith(51.1096, 17.0744);
  });

  it("still returns the address, flagged unsupported, outside the supported cities", async () => {
    const { service } = setup({ supported: false });
    const result = await service.reverse(52.4, 16.93);
    expect(result.supported).toBe(false);
    expect(result.location).toBe(LOCATION);
    expect(result.supportedCities).toEqual(["Wrocław"]);
  });

  it("reports not found when there is no address", async () => {
    const { service } = setup({ found: false });
    await expect(service.reverse(51.1, 17)).rejects.toThrow(
      NotFoundDomainException,
    );
  });
});
