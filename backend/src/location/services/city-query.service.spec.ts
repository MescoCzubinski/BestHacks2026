import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";
import type { CityRepository } from "../repositories/city.repository";
import { CityQueryService } from "./city-query.service";

const WROCLAW = {
  name: "Wrocław",
  bbox: [16.8, 51.04, 17.18, 51.21] as [number, number, number, number],
};

function setup() {
  const findAllByName = jest.fn().mockResolvedValue([WROCLAW]);
  const service = new CityQueryService({
    findAllByName,
  } as unknown as CityRepository);
  return { service, findAllByName };
}

describe("CityQueryService", () => {
  it("lists supported cities with their bbox", async () => {
    const { service } = setup();
    expect(await service.listSupported()).toEqual([WROCLAW]);
  });

  it("reports whether a point is supported, with the supported city names", async () => {
    const { service } = setup();
    expect(await service.checkSupport({ lat: 51.11, lng: 17.03 })).toEqual({
      supported: true,
      supportedCities: ["Wrocław"],
    });
    expect(await service.checkSupport({ lat: 52.4, lng: 16.93 })).toEqual({
      supported: false,
      supportedCities: ["Wrocław"],
    });
  });

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
        { lat: 52.4, lng: 16.93 },
      ]),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });

  it("rejects every point when no city is supported", async () => {
    const { service, findAllByName } = setup();
    findAllByName.mockResolvedValue([]);
    await expect(
      service.assertInsideSupported([{ lat: 51.11, lng: 17.03 }]),
    ).rejects.toThrow(OutsideSupportedAreaException);
  });
});
