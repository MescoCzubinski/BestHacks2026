import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { bboxContains, type Bbox, type LatLng } from "../bbox";
import { City } from "../entities/city.entity";
import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";

export type SupportedCity = { name: string; bbox: Bbox };

export type SupportCheck = { supported: boolean; supportedCities: string[] };

@Injectable()
export class CityQueryService {
  constructor(
    @InjectRepository(City) private readonly cities: Repository<City>,
  ) {}

  async listSupported(): Promise<SupportedCity[]> {
    const rows = await this.cities.find({ order: { name: "ASC" } });
    return rows.map(({ name, bbox }) => ({ name, bbox }));
  }

  async checkSupport(lat: number, lng: number): Promise<SupportCheck> {
    const supported = await this.listSupported();
    return {
      supported: supported.some((city) => bboxContains(city.bbox, lat, lng)),
      supportedCities: supported.map((city) => city.name),
    };
  }

  async assertInsideSupported(points: LatLng[]): Promise<void> {
    const supported = await this.listSupported();
    const inside = (p: LatLng) =>
      supported.some((city) => bboxContains(city.bbox, p.lat, p.lng));
    if (!points.every(inside)) {
      throw new OutsideSupportedAreaException();
    }
  }
}
