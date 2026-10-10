import type { RouteStop } from "@/entities/route";
import { apiFetch } from "@/shared/api";

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<RouteStop[]> {
  const res = await apiFetch(`/places?query=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Places request failed: ${res.status}`);
  return res.json();
}
