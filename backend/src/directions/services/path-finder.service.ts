import { Injectable } from "@nestjs/common";
import type { RoutedPath } from "../../common/bus/contracts";
import { EventBus } from "../../common/bus/event-bus";
import type { LatLng } from "../../common/types/geo";
import { PathRouter } from "./path-router";

@Injectable()
export class PathFinderService {
  constructor(
    private readonly bus: EventBus,
    private readonly router: PathRouter,
  ) {}

  async find(points: LatLng[]): Promise<RoutedPath> {
    await this.bus.request("location.ensure-inside", { points });
    return this.router.route(points);
  }
}
