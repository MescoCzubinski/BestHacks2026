import type { Repository } from "typeorm";
import type { CityQueryService } from "../../city/services/city-query.service";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { TagQueryService } from "../../tag/services/tag-query.service";
import type { SavedRoute } from "../entities/saved-route.entity";
import { SavedRouteQueryService } from "./saved-route-query.service";
import { SavedRouteWriterService } from "./saved-route-writer.service";

const input = {
  durationMinutes: 180,
  tags: ["gothic", "baroque"],
  start: { lat: 51.11, lng: 17.03 },
  end: { lat: 51.11, lng: 17.03 },
  stops: [
    { id: "p1", name: "Ratusz", lat: 51.1, lng: 17.03, visitMinutes: 15 },
  ],
};

function setup(city: string | null = "Wrocław", affected = 1) {
  const routes = {
    create: jest.fn((r: object) => r),
    save: jest.fn(async (r: object) => ({
      ...r,
      id: "r1",
      createdAt: new Date("2026-10-12T08:00:00Z"),
    })),
    delete: jest.fn(async () => ({ affected })),
  };
  const cities = {
    nameAt: jest.fn(async () => city),
  } as unknown as CityQueryService;
  const service = new SavedRouteWriterService(
    routes as unknown as Repository<SavedRoute>,
    cities,
    new TagQueryService(),
    new SavedRouteQueryService(routes as unknown as Repository<SavedRoute>),
  );
  return { service, routes };
}

describe("SavedRouteWriterService", () => {
  it("stores the route for the user with a title built from city and topics", async () => {
    const { service, routes } = setup();
    const saved = await service.save("user-1", input);
    expect(routes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        city: "Wrocław",
        durationMinutes: 180,
        title: "Wrocław: Gotyk, Barok",
      }),
    );
    expect(saved).toMatchObject({
      id: "r1",
      title: "Wrocław: Gotyk, Barok",
      date: "2026-10-12T08:00:00.000Z",
      stops: input.stops,
    });
  });

  it("falls back to the topics alone outside a supported city", async () => {
    const { service } = setup(null);
    expect((await service.save("user-1", input)).title).toBe("Gotyk, Barok");
  });

  it("deletes only the user's own route", async () => {
    const { service, routes } = setup();
    await service.remove("user-1", "r1");
    expect(routes.delete).toHaveBeenCalledWith({ id: "r1", userId: "user-1" });
  });

  it("reports a route that is not the user's as not found", async () => {
    const { service } = setup("Wrocław", 0);
    await expect(service.remove("user-2", "r1")).rejects.toThrow(
      NotFoundDomainException,
    );
  });
});
