import { Injectable } from "@nestjs/common";
import type { LatLng } from "../../city/bbox";
import { CityQueryService } from "../../city/services/city-query.service";
import { PathRouter, type RoutedPath } from "./path-router";

@Injectable()
export class PathFinderService {
  constructor(
    private readonly cities: CityQueryService,
    private readonly router: PathRouter,
  ) {}

  /** Walking path through the points in order; every point must be inside a supported city. */
  async find(points: LatLng[]): Promise<RoutedPath> {
    await this.cities.assertInsideSupported(points);
    return this.router.route(points);
  }
}
