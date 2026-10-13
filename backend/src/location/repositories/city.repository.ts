import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Bbox } from "../../common/types/geo";
import { City } from "../entities/city.entity";

export type SupportedCity = { name: string; bbox: Bbox };

@Injectable()
export class CityRepository {
  constructor(
    @InjectRepository(City) private readonly cities: Repository<City>,
  ) {}

  async findAllByName(): Promise<SupportedCity[]> {
    const rows = await this.cities.find({
      select: { name: true, bbox: true },
      order: { name: "ASC" },
    });
    return rows.map(({ name, bbox }) => ({ name, bbox }));
  }
}
