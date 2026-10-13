export type PlannedPoint = { lat: number; lng: number; label: string };

export type RoutePlan = {
  tags: string[];
  start: PlannedPoint;
  end?: PlannedPoint;
  durationMinutes: number;
  wheelchair: boolean;
};

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 720;
const MAX_TAGS = 20;

function toSearch(plan: RoutePlan): string {
  const params = new URLSearchParams({
    tags: plan.tags.join(","),
    lat: String(plan.start.lat),
    lng: String(plan.start.lng),
    from: plan.start.label,
    min: String(plan.durationMinutes),
  });
  if (plan.end) {
    params.set("endLat", String(plan.end.lat));
    params.set("endLng", String(plan.end.lng));
    params.set("to", plan.end.label);
  }
  if (plan.wheelchair) params.set("wheelchair", "1");
  return `?${params}`;
}

export const routeHref = (plan: RoutePlan) => `/route${toSearch(plan)}`;

export const planHref = (plan: RoutePlan) => `/plan${toSearch(plan)}`;

function coordinate(value: string | null, limit: number): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

function point(
  params: URLSearchParams,
  latKey: string,
  lngKey: string,
  labelKey: string,
): PlannedPoint | null {
  const lat = coordinate(params.get(latKey), 90);
  const lng = coordinate(params.get(lngKey), 180);
  if (lat === null || lng === null) return null;
  return { lat, lng, label: params.get(labelKey) ?? "" };
}

export function parseRoutePlan(search: string): RoutePlan | null {
  const params = new URLSearchParams(search);
  const tags = (params.get("tags") ?? "").split(",").filter(Boolean);
  const start = point(params, "lat", "lng", "from");
  const minutes = Number(params.get("min"));
  if (
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    !start ||
    !Number.isInteger(minutes) ||
    minutes < MIN_DURATION_MINUTES ||
    minutes > MAX_DURATION_MINUTES
  )
    return null;
  const end = point(params, "endLat", "endLng", "to") ?? undefined;
  return {
    tags,
    start,
    end,
    durationMinutes: minutes,
    wheelchair: params.get("wheelchair") === "1",
  };
}
