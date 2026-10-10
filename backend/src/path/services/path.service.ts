import { Injectable } from "@nestjs/common";
import type { GeoPoint, PathLeg, PathResult } from "../path-types";
import { GraphHopperClient } from "./graphhopper.client";
import { DEFAULT_WALKING_SPEED_KMH, straightLeg } from "./straight-line";

const CONCURRENCY = 4; // parallel GraphHopper requests per path
/** GraphHopper pedestrian profiles assume about this speed; slower or faster walkers scale the time. */
const GRAPHHOPPER_SPEED_KMH = 5;

export type PathOptions = { walkingSpeedKmh?: number };

/** Turns an ordered list of points into real walking legs (geometry, distance, time). */
@Injectable()
export class PathService {
  constructor(private readonly graphhopper: GraphHopperClient) {}

  get routingEnabled(): boolean {
    return this.graphhopper.enabled;
  }

  async compute(points: GeoPoint[], options: PathOptions = {}): Promise<PathResult> {
    const speed = options.walkingSpeedKmh ?? DEFAULT_WALKING_SPEED_KMH;
    const pairs = points.slice(1).map((to, i) => ({ from: points[i], to }));
    const legs = await mapLimit(pairs, CONCURRENCY, async ({ from, to }): Promise<PathLeg> => {
      const route = await this.graphhopper.route(from, to);
      if (!route) return straightLeg(from, to, speed);
      return {
        from,
        to,
        distanceM: route.distanceM,
        durationS: route.durationS * (GRAPHHOPPER_SPEED_KMH / speed),
        geometry: route.geometry,
        source: "graphhopper",
      };
    });
    return {
      legs,
      distanceM: legs.reduce((s, l) => s + l.distanceM, 0),
      durationS: legs.reduce((s, l) => s + l.durationS, 0),
    };
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
