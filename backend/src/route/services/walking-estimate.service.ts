import { Injectable } from "@nestjs/common";
import type { LatLng } from "../../city/bbox";

const EARTH_RADIUS_M = 6_371_000;
export const DETOUR_FACTOR = 1.3;
export const DEFAULT_WALKING_SPEED_KMH = 4.5;

@Injectable()
export class WalkingEstimateService {
  /** Straight-line walking time stretched by a detour factor; the real path refines it later. */
  minutes(a: LatLng, b: LatLng, speedKmh = DEFAULT_WALKING_SPEED_KMH): number {
    return ((this.meters(a, b) * DETOUR_FACTOR) / 1000 / speedKmh) * 60;
  }

  private meters(a: LatLng, b: LatLng): number {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
  }
}
