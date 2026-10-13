import { Injectable, Logger } from "@nestjs/common";
import type { Bbox } from "../../common/types/geo";
import { GeocoderUnavailableException } from "../exceptions/geocoder-unavailable.exception";
import { Geocoder, type GeocodedLocation } from "./geocoder";
import {
  PhotonLocationMapper,
  type PhotonFeature,
} from "./photon-location-mapper.service";

const PHOTON_URL = "https://photon.komoot.io/api/";
const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse";
const REQUEST_TIMEOUT = 5000;

@Injectable()
export class PhotonGeocoder extends Geocoder {
  private readonly logger = new Logger(PhotonGeocoder.name);

  constructor(private readonly mapper: PhotonLocationMapper) {
    super();
  }

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
    return (body.features ?? []).flatMap((f) => this.mapper.map(f) ?? []);
  }

  async reverse(lat: number, lng: number): Promise<GeocodedLocation | null> {
    const url = new URL(PHOTON_REVERSE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("limit", "1");

    const body = await this.fetchJson(url);
    const feature = body.features?.[0];
    return feature ? this.mapper.map(feature) : null;
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
