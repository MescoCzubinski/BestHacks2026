import { Injectable, Logger } from "@nestjs/common";
import { GeocoderUnavailableException } from "../exceptions/geocoder-unavailable.exception";
import type { Bbox } from "./geo";

const PHOTON_URL = "https://photon.komoot.io/api/";
const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse";
const REQUEST_TIMEOUT = 5000;

export type GeocodedLocation = {
  label: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  lat: number;
  lng: number;
};

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

export function toGeocodedLocation(
  feature: PhotonFeature,
): GeocodedLocation | null {
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

@Injectable()
export class PhotonClient {
  private readonly logger = new Logger(PhotonClient.name);

  async search(
    query: string,
    bbox: Bbox,
    limit: number,
  ): Promise<GeocodedLocation[]> {
    const url = new URL(PHOTON_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("bbox", bbox.join(","));
    const body = await this.fetchJson(url);
    return (body.features ?? []).flatMap((f) => toGeocodedLocation(f) ?? []);
  }

  async reverse(lat: number, lng: number): Promise<GeocodedLocation | null> {
    const url = new URL(PHOTON_REVERSE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("limit", "1");
    const body = await this.fetchJson(url);
    const feature = body.features?.[0];
    return feature ? toGeocodedLocation(feature) : null;
  }

  private async fetchJson(url: URL): Promise<{ features?: PhotonFeature[] }> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        headers: { "User-Agent": "Atlas-BestHacks2026" },
      });
      if (!res.ok) throw new Error(`Photon responded ${res.status}`);
      return (await res.json()) as { features?: PhotonFeature[] };
    } catch (error) {
      this.logger.warn(`Geocoding failed: ${String(error)}`);
      throw new GeocoderUnavailableException();
    }
  }
}
