import { Injectable } from "@nestjs/common";
import { CityQueryService } from "../../city/services/city-query.service";
import { PathFinderService } from "../../path/services/path-finder.service";
import type { RoutedPath } from "../../path/services/path-router";
import {
  RoutePlanner,
  type PlannedStop,
  type RouteQuery,
} from "./route-planner";

export type BuiltRoute = {
  stops: PlannedStop[];
  path: RoutedPath;
};

@Injectable()
export class RouteBuilderService {
  constructor(
    private readonly cities: CityQueryService,
    private readonly planner: RoutePlanner,
    private readonly pathFinder: PathFinderService,
  ) {}

  /** Plans the stops, then finds the walking path start → stops → end. */
  async build(query: RouteQuery): Promise<BuiltRoute> {
    await this.cities.assertInsideSupported([query.start, query.end]);
    const stops = await this.planner.plan(query);
    const path = await this.pathFinder.find([query.start, ...stops, query.end]);
    return { stops, path };
  }
}
