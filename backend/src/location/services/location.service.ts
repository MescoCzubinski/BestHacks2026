import { Injectable } from "@nestjs/common";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { OutsideSupportedAreaException } from "../exceptions/outside-supported-area.exception";
import {
  CityRepository,
  type SupportedCity,
} from "../repositories/city.repository";
import type { Bbox, LatLng } from "./geo";
import { PhotonClient, type GeocodedLocation } from "./photon.client";

export const DEFAULT_LOCATION_LIMIT = 6;

export type ReverseResult = {
  location: GeocodedLocation;
  supported: boolean;
  supportedCities: string[];
};

function bboxContains(bbox: Bbox, { lat, lng }: LatLng): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

const insideAny = (cities: SupportedCity[], point: LatLng) =>
  cities.some((city) => bboxContains(city.bbox, point));

@Injectable()
export class LocationService {
  constructor(
    private readonly cities: CityRepository,
    private readonly photon: PhotonClient,
  ) {}

  async search(
    query: string,
    limit = DEFAULT_LOCATION_LIMIT,
  ): Promise<GeocodedLocation[]> {
    const supported = await this.cities.findAllByName();
    const batches = await Promise.all(
      supported.map(async (city) => {
        const found = await this.photon.search(
          `${query} ${city.name}`,
          city.bbox,
          limit,
        );
        return found.filter((location) => location.city === city.name);
      }),
    );
    const unique = new Map(batches.flat().map((l) => [l.label, l]));
    return [...unique.values()].slice(0, limit);
  }

  async reverse(lat: number, lng: number): Promise<ReverseResult> {
    const location = await this.photon.reverse(lat, lng);
    if (!location)
      throw new NotFoundDomainException("Address", `${lat},${lng}`);
    const supported = await this.cities.findAllByName();
    return {
      location,
      supported: insideAny(supported, { lat, lng }),
      supportedCities: supported.map((city) => city.name),
    };
  }

  async assertInsideSupported(points: LatLng[]): Promise<void> {
    const supported = await this.cities.findAllByName();
    if (!points.every((p) => insideAny(supported, p))) {
      throw new OutsideSupportedAreaException();
    }
  }
}
