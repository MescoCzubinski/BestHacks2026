import { Injectable } from "@nestjs/common";
import type { RoutedPath } from "../../common/bus/contracts";
import { EventBus } from "../../common/bus/event-bus";
import {
  RoutePlanner,
  type PlannedStop,
  type RouteQuery,
} from "./route-planner";

export type BuiltRoute = {
  stops: PlannedStop[];
  extras: PlannedStop[];
  path: RoutedPath;
};

@Injectable()
export class RouteBuilderService {
  constructor(
    private readonly bus: EventBus,
    private readonly planner: RoutePlanner,
  ) {}

  async build(query: RouteQuery): Promise<BuiltRoute> {
    await this.bus.request("city.ensure-inside", {
      points: [query.start, query.end],
    });
    const { stops, extras } = await this.planner.plan(query);
    const path = await this.bus.request("path.route", {
      points: [
        query.start,
        ...stops.map(({ lat, lng }) => ({ lat, lng })),
        query.end,
      ],
    });
    return { stops, extras, path };
  }
}
