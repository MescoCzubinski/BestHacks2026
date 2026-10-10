import type { Bbox } from "../../city/bbox";

export type GeocodedLocation = {
  label: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  lat: number;
  lng: number;
};

export abstract class Geocoder {
  abstract search(
    query: string,
    bbox: Bbox,
    limit: number,
  ): Promise<GeocodedLocation[]>;

  abstract reverse(lat: number, lng: number): Promise<GeocodedLocation | null>;
}
