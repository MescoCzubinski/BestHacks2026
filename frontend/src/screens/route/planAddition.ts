import type { RoutePoint, RouteStop } from "@/api/types";

const WALK_MINUTES_PER_KM = 12 * 1.3;
const EARTH_RADIUS_M = 6_371_000;
const MAX_REMOVED = 3;

type Itinerary = { start: RoutePoint; end: RoutePoint; stops: RouteStop[] };

function walkMinutes(a: RoutePoint, b: RoutePoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  const meters = 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
  return (meters / 1000) * WALK_MINUTES_PER_KM;
}

export function additionCost(route: Itinerary, stop: RouteStop) {
  const points = [route.start, ...route.stops, route.end];
  let index = 0;
  let walk = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as RoutePoint;
    const b = points[i + 1] as RoutePoint;
    const added =
      walkMinutes(a, stop) + walkMinutes(stop, b) - walkMinutes(a, b);
    if (added < walk) {
      walk = added;
      index = i;
    }
  }
  return { index, minutes: Math.round(walk + stop.visitMinutes) };
}

function removalSavings(route: Itinerary, i: number): number {
  const points = [route.start, ...route.stops, route.end];
  const prev = points[i] as RoutePoint;
  const next = points[i + 2] as RoutePoint;
  const stop = route.stops[i] as RouteStop;
  const walk =
    walkMinutes(prev, stop) + walkMinutes(stop, next) - walkMinutes(prev, next);
  return Math.round(walk + stop.visitMinutes);
}

export type Removal = { ids: string[]; savedMinutes: number };

export function suggestRemovals(
  route: Itinerary,
  neededMinutes: number,
  limit = 3,
): Removal[] {
  const savings = route.stops.map((_, i) => removalSavings(route, i));
  const found: Removal[] = [];
  const walk = (from: number, ids: string[], saved: number) => {
    if (ids.length > 0 && saved >= neededMinutes) {
      found.push({ ids, savedMinutes: saved });
      return;
    }
    if (ids.length === MAX_REMOVED) return;
    for (let i = from; i < route.stops.length; i++)
      walk(
        i + 1,
        [...ids, (route.stops[i] as RouteStop).id],
        saved + (savings[i] as number),
      );
  };
  walk(0, [], 0);
  return found
    .sort(
      (a, b) => a.ids.length - b.ids.length || a.savedMinutes - b.savedMinutes,
    )
    .slice(0, limit);
}

export const roundUpToQuarter = (minutes: number) =>
  Math.ceil(minutes / 15) * 15;
