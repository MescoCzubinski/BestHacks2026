import type { LatLng } from "../../city/bbox";

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

export abstract class PathRouter {
  abstract route(points: LatLng[]): Promise<RoutedPath>;
}
