import { Injectable } from "@nestjs/common";
import { EventBus } from "../../common/bus/event-bus";
import { NotFoundDomainException } from "../../common/errors/domain.exception";
import { Geocoder, type GeocodedLocation } from "./geocoder";

export type ReverseResult = {
  location: GeocodedLocation;
  supported: boolean;
  supportedCities: string[];
};

@Injectable()
export class LocationReverseService {
  constructor(
    private readonly bus: EventBus,
    private readonly geocoder: Geocoder,
  ) {}

  async reverse(lat: number, lng: number): Promise<ReverseResult> {
    const location = await this.geocoder.reverse(lat, lng);
    if (!location)
      throw new NotFoundDomainException("Address", `${lat},${lng}`);
    const { supported, supportedCities } = await this.bus.request(
      "city.support-at",
      { lat, lng },
    );
    return { location, supported, supportedCities };
  }
}
