import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";
import type { User } from "../../../account/entities/user.entity";
import type { PasswordHasher } from "../../../account/services/password-hasher.service";
import type { City } from "../../../city/entities/city.entity";
import type { PlaceTag } from "../../../places/place-tag.entity";
import type { Place } from "../../../places/place.entity";
import { CITY_SEEDS } from "./city.seed";
import { DEMO_USER } from "./demo-user.seed";
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

  it.each(["development", "production"])(
    "seeds the demo account with a stored hash when NODE_ENV is %s",
    async (env) => {
      process.env.NODE_ENV = env;
      const { service, users, hasher } = repos();
      await service.onApplicationBootstrap();
      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "anna@atlas.pl",
          passwordHash: DEMO_USER.passwordHash,
          role: "user",
        }),
      );
      expect(DEMO_USER.passwordHash).toMatch(/^scrypt:/);
    },
  );

  it("hashes DEMO_USER_PASSWORD when it is configured", async () => {
    process.env.NODE_ENV = "production";
    const { service, users, hasher } = repos("a-long-demo-password");
    await service.onApplicationBootstrap();
    expect(hasher.hash).toHaveBeenCalledWith("a-long-demo-password");
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "hashed" }),
    );
  });

  it("keeps an existing demo account untouched", async () => {
    process.env.NODE_ENV = "production";
    const { service, users } = repos();
    users.existsBy.mockResolvedValue(true);
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
  });
});
