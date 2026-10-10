import type { LatLng } from "../../city/bbox";

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

/** Walking-route provider; swap the implementation without touching the callers. */
export abstract class PathRouter {
  abstract route(points: LatLng[]): Promise<RoutedPath>;
}
