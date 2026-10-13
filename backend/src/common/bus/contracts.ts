import type { Bbox, LatLng } from "../types/geo";
import type { StyleTag } from "../types/style-tag";

export type RequestContract = { payload: unknown; reply: unknown };

export type SupportedCity = { name: string; bbox: Bbox };

export type SupportCheck = { supported: boolean; supportedCities: string[] };

export type TagPercents = Partial<Record<StyleTag, number>>;

export type CandidateQuery = {
  south: number;
  west: number;
  north: number;
  east: number;
  tags: StyleTag[];
  minPercent: number;
  limit: number;
};

export type PlaceCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string | null;
  mainImageUrl: string | null;
  significance: number;
  tags: TagPercents;
  wheelchair: "yes" | "limited" | "no" | null;
  openingHours: string | null;
  visitMinutes: number;
  enterable: boolean;
};

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

export type Requests = {
  /** Every supported city with its bounding box, ordered by name. */
  "city.supported": { payload: Record<string, never>; reply: SupportedCity[] };
  /** Whether a point lies in a supported city. */
  "city.support-at": { payload: LatLng; reply: SupportCheck };
  /** Rejects (invalid) when any point lies outside every supported city. */
  "city.ensure-inside": { payload: { points: LatLng[] }; reply: void };
  /** Places in a box carrying any of the tags, most significant first. */
  "place.candidates": { payload: CandidateQuery; reply: PlaceCandidate[] };
  /** A walking path through the points, in order. */
  "path.route": { payload: { points: LatLng[] }; reply: RoutedPath };
};

export type Events = Record<never, unknown>;
