import type { RoutedPath } from "../../common/bus/contracts";
import type { LatLng } from "../../common/types/geo";

export abstract class PathRouter {
  abstract route(points: LatLng[]): Promise<RoutedPath>;
}
