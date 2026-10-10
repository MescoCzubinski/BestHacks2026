import {
  RouteRequestError,
  routeErrorFromStatus,
  type BuiltRoute,
  type RoutePoint,
} from "@/entities/route";
import { apiFetch } from "@/shared/api";

export type RouteRequest = {
  start: RoutePoint;
  end?: RoutePoint;
  durationMinutes: number;
  wheelchair: boolean;
  tags: string[];
};

export async function createRoute(request: RouteRequest): Promise<BuiltRoute> {
  let res: Response;
  try {
    res = await apiFetch("/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new RouteRequestError("unavailable", "Brak połączenia z serwerem.");
  }
  if (!res.ok) throw routeErrorFromStatus(res.status);
  return res.json();
}
