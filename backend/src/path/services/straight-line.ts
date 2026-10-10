import type { GeoPoint, PathLeg } from "../path-types";

const EARTH_RADIUS_M = 6_371_000;
/** Real walking routes are longer than the crow flies; this is a typical city factor. */
export const DETOUR_FACTOR = 1.3;
export const DEFAULT_WALKING_SPEED_KMH = 4.5;

export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Minutes to walk between two points without a routing engine. */
export function estimateWalkMinutes(
  a: GeoPoint,
  b: GeoPoint,
  speedKmh = DEFAULT_WALKING_SPEED_KMH,
): number {
  return ((haversineM(a, b) * DETOUR_FACTOR) / 1000 / speedKmh) * 60;
}

export function straightLeg(
  from: GeoPoint,
  to: GeoPoint,
  speedKmh = DEFAULT_WALKING_SPEED_KMH,
): PathLeg {
  const distanceM = haversineM(from, to) * DETOUR_FACTOR;
  return {
    from,
    to,
    distanceM,
    durationS: (distanceM / 1000 / speedKmh) * 3600,
    geometry: [
      [from.lon, from.lat],
      [to.lon, to.lat],
    ],
    source: "estimate",
  };
}
