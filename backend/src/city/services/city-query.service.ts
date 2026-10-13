import { Injectable } from "@nestjs/common";
import type { SupportCheck, SupportedCity } from "../../common/bus/contracts";
import type { LatLng } from "../../common/types/geo";
import { bboxContains } from "./bbox";
import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";
import { CityRepository } from "../repositories/city.repository";

@Injectable()
export class CityQueryService {
  constructor(private readonly cities: CityRepository) {}

  listSupported(): Promise<SupportedCity[]> {
    return this.cities.findAllByName();
  }

  async checkSupport({ lat, lng }: LatLng): Promise<SupportCheck> {
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
