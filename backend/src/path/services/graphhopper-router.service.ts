import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LatLng } from "../../common/types/geo";
import { PathNotFoundException } from "../exceptions/path-not-found.exception";
import { PathRouterUnavailableException } from "../exceptions/path-router-unavailable.exception";
import {
  GraphHopperPathMapper,
  type GraphHopperResponse,
} from "./graphhopper-path-mapper.service";
import { PathRouter, type RoutedPath } from "./path-router";

const PROFILE = "safe_pedestrian";
const REQUEST_TIMEOUT = 10000;

@Injectable()
export class GraphHopperRouter extends PathRouter {
  private readonly logger = new Logger(GraphHopperRouter.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    config: ConfigService,
    private readonly mapper: GraphHopperPathMapper,
  ) {
    super();
    this.baseUrl = config.getOrThrow<string>("GRAPHHOPPER_URL");
    this.token = config.getOrThrow<string>("GRAPHHOPPER_TOKEN");
  }

  async route(points: LatLng[]): Promise<RoutedPath> {
    const url = new URL("/route", this.baseUrl);
    for (const p of points)
      url.searchParams.append("point", `${p.lat},${p.lng}`);
    url.searchParams.set("profile", PROFILE);
    url.searchParams.set("points_encoded", "false");
    url.searchParams.set("elevation", "false");
    url.searchParams.set("instructions", "false");

    let res: Response;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch (error) {
      this.logger.warn(`GraphHopper request failed: ${String(error)}`);
      throw new PathRouterUnavailableException();
    }

    if (res.status === 400) throw new PathNotFoundException();
    if (!res.ok) {
      this.logger.warn(`GraphHopper responded ${res.status}`);
      throw new PathRouterUnavailableException();
    }
    const path = this.mapper.map((await res.json()) as GraphHopperResponse);
    if (!path) throw new PathNotFoundException();
    return path;
  }
}
