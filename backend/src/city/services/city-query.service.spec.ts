import type { Repository } from "typeorm";
import { City } from "../entities/city.entity";
import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";
import { CityQueryService } from "./city-query.service";

function setup() {
  const find = jest.fn().mockResolvedValue([
    {
      id: "1",
      name: "Wrocław",
      region: "dolnośląskie",
      latitude: 51.1,
      longitude: 17,
      bbox: [16.8, 51.04, 17.18, 51.21],
    },
  ] as City[]);
  const service = new CityQueryService({ find } as unknown as Repository<City>);
  return { service, find };
}

describe("CityQueryService", () => {
  it("lists supported cities with their bbox, ordered by name", async () => {
    const { service, find } = setup();
    expect(await service.listSupported()).toEqual([
      { name: "Wrocław", bbox: [16.8, 51.04, 17.18, 51.21] },
    ]);
    expect(find).toHaveBeenCalledWith({ order: { name: "ASC" } });
  });

  it("reports whether a point is supported, with the supported city names", async () => {
    const { service } = setup();
    expect(await service.checkSupport(51.11, 17.03)).toEqual({
      supported: true,
      supportedCities: ["Wrocław"],
    });
    expect(await service.checkSupport(52.4, 16.93)).toEqual({
      supported: false,
      supportedCities: ["Wrocław"],
    });
  });

  it("accepts a point inside a supported city", async () => {
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
});
