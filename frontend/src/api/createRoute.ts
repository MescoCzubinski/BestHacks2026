import { RouteRequestError, routeErrorFromStatus } from "./errors";
import type { BuiltRoute, RoutePoint } from "./types";
import { apiFetch } from "./client";

export type RouteRequest = {
  start: RoutePoint;
  end?: RoutePoint;
  durationMinutes: number;
  wheelchair: boolean;
  tags: string[];
};

export async function createRoute(
  request: RouteRequest,
  signal?: AbortSignal,
): Promise<BuiltRoute> {
  let res: Response;
  try {
    res = await apiFetch("/places/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new RouteRequestError("unavailable", "Brak połączenia z serwerem.");
  }
  if (!res.ok) throw routeErrorFromStatus(res.status);
  return res.json();
}
