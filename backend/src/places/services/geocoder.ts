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

/** Address search provider; swap the implementation without touching the callers. */
export abstract class Geocoder {
  abstract search(
    query: string,
    bbox: Bbox,
    limit: number,
  ): Promise<GeocodedLocation[]>;

  /** The address nearest to a point, or null when there is none. */
  abstract reverse(lat: number, lng: number): Promise<GeocodedLocation | null>;
}
