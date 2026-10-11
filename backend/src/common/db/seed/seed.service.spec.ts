import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";
import type { User } from "../../../account/entities/user.entity";
import type { PasswordHasher } from "../../../account/services/password-hasher.service";
import type { City } from "../../../city/entities/city.entity";
import type { PlaceTag } from "../../../places/place-tag.entity";
import type { Place } from "../../../places/place.entity";
import { CITY_SEEDS } from "./city.seed";
import { SeedService } from "./seed.service";

function repos(demoPassword?: string) {
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
  const users = {
    existsBy: jest.fn().mockResolvedValue(false),
    create: jest.fn((u: object) => u),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const hasher = { hash: jest.fn().mockResolvedValue("hashed") };
  const config = { get: () => demoPassword } as unknown as ConfigService;
  const service = new SeedService(
    cities as unknown as Repository<City>,
    places as unknown as Repository<Place>,
    tags as unknown as Repository<PlaceTag>,
    users as unknown as Repository<User>,
    hasher as unknown as PasswordHasher,
    config,
  );
  return { service, cities, places, tags, users, hasher };
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

  it("seeds the demo account outside production", async () => {
    process.env.NODE_ENV = "development";
    const { service, users, hasher } = repos();
    await service.onApplicationBootstrap();
    expect(hasher.hash).toHaveBeenCalledWith("demo1234");
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "anna@atlas.pl",
        passwordHash: "hashed",
        role: "user",
      }),
    );
  });

  it("does not seed the demo account in production unless a password is set", async () => {
    process.env.NODE_ENV = "production";
    const none = repos();
    await none.service.onApplicationBootstrap();
    expect(none.users.save).not.toHaveBeenCalled();

    const set = repos("a-long-demo-password");
    await set.service.onApplicationBootstrap();
    expect(set.hasher.hash).toHaveBeenCalledWith("a-long-demo-password");
    expect(set.users.save).toHaveBeenCalled();
  });

  it("keeps an existing demo account untouched", async () => {
    process.env.NODE_ENV = "development";
    const { service, users } = repos();
    users.existsBy.mockResolvedValue(true);
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
  });
});
