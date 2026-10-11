import { Injectable } from "@nestjs/common";
import type { GeocodedLocation } from "./geocoder";

export type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    locality?: string;
  };
};

@Injectable()
export class PhotonLocationMapper {
  map(feature: PhotonFeature): GeocodedLocation | null {
    const coordinates = feature.geometry?.coordinates;
    const p = feature.properties;
    if (!coordinates || !p) return null;
    const [lng, lat] = coordinates;

    const city = p.city ?? p.district ?? p.locality ?? "";
    const street = p.street ?? null;
    const houseNumber = p.housenumber ?? null;
    const streetLine = street
      ? [street, houseNumber].filter(Boolean).join(" ")
      : null;
    const cityLine = [p.postcode, city].filter(Boolean).join(" ");
    const name = p.name && p.name !== street ? p.name : null;
    const label = [name, streetLine, cityLine].filter(Boolean).join(", ");
    if (!label) return null;

    return {
      label,
      street,
      houseNumber,
      postalCode: p.postcode ?? null,
      city,
      lat,
      lng,
    };
  }
}
