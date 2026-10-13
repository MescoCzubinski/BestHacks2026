import type { LatLng } from "../types/geo";

export type RequestContract = { payload: unknown; reply: unknown };

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

export type Requests = {
  /** Rejects (invalid) when any point lies outside every supported city. */
  "location.ensure-inside": { payload: { points: LatLng[] }; reply: void };
  /** A walking path through the points, in order. */
  "directions.route": { payload: { points: LatLng[] }; reply: RoutedPath };
};

export type Events = Record<never, unknown>;
