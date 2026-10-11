import type { Repository } from "typeorm";
import type { City } from "../../../city/entities/city.entity";
import type { PlaceTag } from "../../../places/place-tag.entity";
import type { Place } from "../../../places/place.entity";
import { CITY_SEEDS } from "./city.seed";
import { SeedService } from "./seed.service";

function repos() {
  const cities = { upsert: jest.fn().mockResolvedValue(undefined) };
  const places = {
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const tags = {
    delete: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SeedService(
    cities as unknown as Repository<City>,
    places as unknown as Repository<Place>,
    tags as unknown as Repository<PlaceTag>,
  );
  return { service, cities, places, tags };
}

describe("SeedService", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it("fills an empty database with the places in production", async () => {
    process.env.NODE_ENV = "production";
    const { service, cities, places } = repos();
    await service.onApplicationBootstrap();
    expect(cities.upsert).toHaveBeenCalledWith(CITY_SEEDS, ["name"]);
    expect(places.upsert).toHaveBeenCalled();
  });

  it("leaves existing places to the fetcher in production", async () => {
    process.env.NODE_ENV = "production";
    const { service, cities, places, tags } = repos();
    places.count.mockResolvedValue(6241);
    await service.onApplicationBootstrap();
    expect(cities.upsert).toHaveBeenCalledWith(CITY_SEEDS, ["name"]);
    expect(places.upsert).not.toHaveBeenCalled();
    expect(places.delete).not.toHaveBeenCalled();
    expect(tags.insert).not.toHaveBeenCalled();
  });

  it("seeds the cities outside production too", async () => {
    process.env.NODE_ENV = "development";
    const { service, cities } = repos();
    await service.onApplicationBootstrap();
    expect(cities.upsert).toHaveBeenCalledWith(CITY_SEEDS, ["name"]);
  });
});
