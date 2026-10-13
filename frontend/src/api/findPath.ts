import { apiFetch } from "./client";
import { RouteRequestError, routeErrorFromStatus } from "./errors";
import type { RoutePoint, WalkingPath } from "./types";

export async function findPath(
  points: RoutePoint[],
  signal?: AbortSignal,
): Promise<WalkingPath> {
  const query = new URLSearchParams(
    points.map((p) => ["point", `${p.lat},${p.lng}`]),
  );
  let res: Response;
  try {
    res = await apiFetch(`/paths?${query}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new RouteRequestError("unavailable", "Brak połączenia z serwerem.");
  }
  if (!res.ok) throw routeErrorFromStatus(res.status);
  return res.json();
}
