import type { Repository } from "typeorm";
import type { City } from "../entities/city.entity";
import { CityRepository } from "./city.repository";

describe("CityRepository", () => {
  it("returns plain name and bbox rows, ordered by name", async () => {
    const find = jest.fn().mockResolvedValue([
      { id: "1", name: "Kraków", bbox: [19.8, 49.95, 20.1, 50.15] },
      { id: "2", name: "Wrocław", bbox: [16.8, 51.04, 17.18, 51.21] },
    ]);
    const repository = new CityRepository({
      find,
    } as unknown as Repository<City>);

    expect(await repository.findAllByName()).toEqual([
      { name: "Kraków", bbox: [19.8, 49.95, 20.1, 50.15] },
      { name: "Wrocław", bbox: [16.8, 51.04, 17.18, 51.21] },
    ]);
    expect(find).toHaveBeenCalledWith({
      select: { name: true, bbox: true },
      order: { name: "ASC" },
    });
  });
});
