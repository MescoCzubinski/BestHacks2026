import type { Repository } from "typeorm";
import type { Place } from "../entities/place.entity";
import { PlaceRepository } from "./place.repository";

const RAW = {
  id: "p1",
  name: "Ratusz",
  latitude: 51.11,
  longitude: 17.03,
  description: null,
  main_image_url: "https://img/p1.jpg",
  significance: 80,
  facts: { openingHours: "Mo-Su 10:00-17:00" },
  tags: { gothic: 90 },
};

function setup() {
  const query = jest.fn().mockResolvedValue([RAW]);
  const repository = new PlaceRepository({
    query,
  } as unknown as Repository<Place>);
  return { repository, query };
}

describe("PlaceRepository", () => {
  it("finds places in a box with any matching tag and maps the row", async () => {
    const { repository, query } = setup();
    const rows = await repository.findInBoxWithTags({
      south: 51,
      west: 16.9,
      north: 51.2,
      east: 17.1,
      tags: ["gothic"],
      minPercent: 50,
      limit: 10,
    });
    expect(rows).toEqual([
      {
        id: "p1",
        name: "Ratusz",
        latitude: 51.11,
        longitude: 17.03,
        description: null,
        mainImageUrl: "https://img/p1.jpg",
        significance: 80,
        facts: { openingHours: "Mo-Su 10:00-17:00" },
        tags: { gothic: 90 },
      },
    ]);
    expect(query.mock.calls[0]?.[1]).toEqual([
      51,
      51.2,
      16.9,
      17.1,
      ["gothic"],
      50,
      10,
    ]);
  });

  it("searches names case-insensitively with LIKE wildcards escaped", async () => {
    const { repository, query } = setup();
    await repository.findByName("50%_off", 5);
    expect(query.mock.calls[0]?.[0]).toContain("ILIKE");
    expect(query.mock.calls[0]?.[1]).toEqual([
      "%50\\%\\_off%",
      "50\\%\\_off%",
      5,
    ]);
  });
});
