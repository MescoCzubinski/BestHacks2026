import type { LatLng } from "../../common/types/geo";

export type RoutedPath = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LatLng[];
};

export abstract class PathRouter {
  abstract route(points: LatLng[]): Promise<RoutedPath>;
}
