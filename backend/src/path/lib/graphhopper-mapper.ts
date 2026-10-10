import type { RoutedPath } from "../services/path-router";

export type GraphHopperResponse = {
  paths?: {
    distance: number;
    time: number;
    points?: { coordinates?: [number, number][] };
  }[];
};

export function mapGraphHopperPath(
  body: GraphHopperResponse,
): RoutedPath | null {
  const path = body.paths?.[0];
  const coordinates = path?.points?.coordinates;
  if (!path || !coordinates?.length) return null;
  return {
    distanceMeters: Math.round(path.distance),
    durationSeconds: Math.round(path.time / 1000),
    coordinates: coordinates.map(([lng, lat]) => ({ lat, lng })),
  };
}
