import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GeoPoint } from "../path-types";

export type GraphHopperRoute = {
  distanceM: number;
  durationS: number;
  geometry: [number, number][];
};

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_PROFILE = "safe_pedestrian"; // avoids roads; plain "foot" does not

/** The only place that talks to GraphHopper, so it can be mocked, logged and swapped. */
@Injectable()
export class GraphHopperClient {
  private readonly log = new Logger(GraphHopperClient.name);
  private readonly url: string | undefined;
  private readonly token: string | undefined;
  private readonly profile: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>("GRAPHHOPPER_URL")?.replace(/\/$/, "");
    this.token = config.get<string>("GRAPHHOPPER_TOKEN");
    this.profile = config.get<string>("GRAPHHOPPER_PROFILE") ?? DEFAULT_PROFILE;
  }

  get enabled(): boolean {
    return Boolean(this.url);
  }

  /** Route between two points; null when GraphHopper is unconfigured, unreachable or finds no path. */
  async route(from: GeoPoint, to: GeoPoint): Promise<GraphHopperRoute | null> {
    if (!this.url) return null;
    const params = new URLSearchParams({
      profile: this.profile,
      points_encoded: "false",
      elevation: "false",
      instructions: "false",
    });
    params.append("point", `${from.lat},${from.lon}`);
    params.append("point", `${to.lat},${to.lon}`);
    try {
      const res = await fetch(`${this.url}/route?${params}`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        this.log.warn(`GraphHopper answered ${res.status}`);
        return null;
      }
      const body = (await res.json()) as {
        paths?: { distance: number; time: number; points: { coordinates: [number, number][] } }[];
      };
      const path = body.paths?.[0];
      if (!path) return null;
      return {
        distanceM: path.distance,
        durationS: path.time / 1000,
        geometry: path.points.coordinates,
      };
    } catch (err) {
      this.log.warn(`GraphHopper request failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
