import { Injectable } from "@nestjs/common";
import { CityQueryService } from "../../city/services/city-query.service";
import { Geocoder, type GeocodedLocation } from "./geocoder";

export const DEFAULT_LOCATION_LIMIT = 6;

@Injectable()
export class LocationSearchService {
  constructor(
    private readonly cities: CityQueryService,
    private readonly geocoder: Geocoder,
  ) {}

  /** Addresses matching the query, only inside supported cities (not their surroundings). */
  async search(
    query: string,
    limit = DEFAULT_LOCATION_LIMIT,
  ): Promise<GeocodedLocation[]> {
    const supported = await this.cities.listSupported();
    const batches = await Promise.all(
      supported.map(async (city) => {
        const found = await this.geocoder.search(
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
}
