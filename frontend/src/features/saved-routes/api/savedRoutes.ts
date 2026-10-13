import type { RoutePoint, RouteStop } from "@/entities/route";

export type SavedStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visitMinutes: number;
};

export type SavedRoute = {
  id: string;
  title: string;
  city: string | null;
  date: string;
  tags: string[];
  durationMinutes: number;
  start: RoutePoint;
  end: RoutePoint;
  stops: SavedStop[];
};

export type NewSavedRoute = {
  title: string;
  tags: string[];
  durationMinutes: number;
  start: RoutePoint;
  end: RoutePoint;
  stops: RouteStop[];
};

const STORAGE_KEY = "atlas.recent-routes";
const MAX_ROUTES = 50;

export function listSavedRoutes(): SavedRoute[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedRoute[]) : [];
  } catch {
    return [];
  }
}

export function saveRoute(route: NewSavedRoute): SavedRoute {
  const saved: SavedRoute = {
    id: crypto.randomUUID(),
    title: route.title,
    city: null,
    date: new Date().toISOString(),
    tags: route.tags,
    durationMinutes: route.durationMinutes,
    start: route.start,
    end: route.end,
    stops: route.stops.map(({ id, name, lat, lng, visitMinutes }) => ({
      id,
      name,
      lat,
      lng,
      visitMinutes,
    })),
  };
  try {
    const routes = [saved, ...listSavedRoutes()].slice(0, MAX_ROUTES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  } catch {}
  return saved;
}
