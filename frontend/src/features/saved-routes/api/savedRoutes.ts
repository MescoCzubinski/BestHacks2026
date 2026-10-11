import type { RoutePoint, RouteStop } from "@/entities/route";
import { apiFetch } from "@/shared/api";

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
  tags: string[];
  durationMinutes: number;
  start: RoutePoint;
  end: RoutePoint;
  stops: RouteStop[];
};

export async function listSavedRoutes(
  signal?: AbortSignal,
): Promise<SavedRoute[]> {
  const res = await apiFetch("/saved-routes", { signal });
  if (!res.ok) throw new Error(`Saved routes request failed: ${res.status}`);
  return res.json();
}

export async function saveRoute(route: NewSavedRoute): Promise<SavedRoute> {
  const res = await apiFetch("/saved-routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...route,
      stops: route.stops.map(({ id, name, lat, lng, visitMinutes }) => ({
        id,
        name,
        lat,
        lng,
        visitMinutes,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Saving the route failed: ${res.status}`);
  return res.json();
}
